import {
  ServiceRequest,
  Category,
  Offer,
  User,
} from '../../models/index.js';
import {
  REQUEST_STATUS,
  ROLES,
} from '../../../../shared/constants.js';
import { events, EVENT_NAMES } from './events.js';
import { transition } from './stateMachine.js';

/**
 * Serializes request details according to privacy rules:
 * - Request owner and admins see full address and exact coordinates.
 * - The assigned helper sees full address and exact coordinates once status is ACCEPTED or later.
 * - Helpers reviewing offers before acceptance see only rounded coordinates and approximate area.
 */
export function serializeRequestFor(reqDoc, viewer) {
  const reqObj = typeof reqDoc.toObject === 'function' ? reqDoc.toObject() : { ...reqDoc };

  const viewerId = viewer?._id?.toString() || viewer?.id?.toString();
  const isOwner = reqObj.user && (reqObj.user._id?.toString() === viewerId || reqObj.user.toString() === viewerId);
  const isAdmin = viewer?.roles?.includes(ROLES.ADMIN);
  const isAssignedHelper =
    reqObj.helper && (reqObj.helper._id?.toString() === viewerId || reqObj.helper.toString() === viewerId);

  const statusesAfterAcceptance = [
    REQUEST_STATUS.ACCEPTED,
    REQUEST_STATUS.IN_PROGRESS,
    REQUEST_STATUS.COMPLETED,
    REQUEST_STATUS.PAID,
    REQUEST_STATUS.RATED,
    REQUEST_STATUS.DISPUTED,
  ];
  const isAssignedAndAccepted = isAssignedHelper && statusesAfterAcceptance.includes(reqObj.status);

  // Full visibility allowed for owner, admin, or assigned helper post-acceptance
  if (isOwner || isAdmin || isAssignedAndAccepted) {
    return reqObj;
  }

  // Obfuscate location for unassigned helpers or pre-acceptance offers
  if (reqObj.location) {
    const coords = reqObj.location.coordinates || [0, 0];
    reqObj.location = {
      type: 'Point',
      coordinates: [
        Math.round(coords[0] * 100) / 100, // round lng to ~1.1km
        Math.round(coords[1] * 100) / 100, // round lat to ~1.1km
      ],
      address: 'Approximate neighbourhood area (revealed upon job acceptance)',
    };
  }

  return reqObj;
}

export async function createRequest(userId, data) {
  // Validate category and subcategory
  const category = await Category.findById(data.category);
  if (!category || !category.active) {
    const error = new Error('Category not found or inactive.');
    error.status = 400;
    throw error;
  }

  if (!category.subcategories.includes(data.subcategory)) {
    const error = new Error(`Subcategory "${data.subcategory}" is not valid for category "${category.name}".`);
    error.status = 400;
    throw error;
  }

  // Validate scheduled time if not ASAP
  let scheduledFor = null;
  if (!data.asap) {
    if (!data.scheduledFor) {
      const error = new Error('Scheduled date/time is required when not requesting ASAP.');
      error.status = 400;
      throw error;
    }
    scheduledFor = new Date(data.scheduledFor);
    if (isNaN(scheduledFor.getTime()) || scheduledFor.getTime() <= Date.now()) {
      const error = new Error('Scheduled date/time must be in the future.');
      error.status = 400;
      throw error;
    }
  }

  const request = await ServiceRequest.create({
    user: userId,
    category: category._id,
    subcategory: data.subcategory,
    description: data.description,
    location: {
      type: 'Point',
      coordinates: [data.location.lng, data.location.lat],
      address: data.location.address || '',
    },
    asap: data.asap !== undefined ? data.asap : true,
    scheduledFor,
    urgency: data.urgency,
    pricingType: data.pricingType,
    budget: data.budget !== undefined ? Number(data.budget) : undefined,
    status: REQUEST_STATUS.POSTED,
    statusHistory: [
      {
        status: REQUEST_STATUS.POSTED,
        changedAt: new Date(),
        actor: 'user',
        meta: { description: 'Request created by user' },
      },
    ],
    searchRadiusKm: data.searchRadiusKm || 10,
  });

  // Populate category for consumers
  const populated = await ServiceRequest.findById(request._id)
    .populate('category', 'name type')
    .populate('user', 'name email phone');

  // Emit event (no matching here as per instructions)
  events.emit(EVENT_NAMES.REQUEST_POSTED, populated);

  return populated;
}

export async function getRequestsMine(user) {
  const userId = user._id || user.id;

  const requests = await ServiceRequest.find({
    $or: [{ user: userId }, { helper: userId }],
  })
    .populate('category', 'name type')
    .populate('user', 'name phone')
    .populate('helper', 'name phone')
    .sort({ createdAt: -1 });

  return requests.map((r) => serializeRequestFor(r, user));
}

export async function getRequestById(requestId, viewer) {
  const request = await ServiceRequest.findById(requestId)
    .populate('category', 'name type')
    .populate('user', 'name phone email')
    .populate('helper', 'name phone email');

  if (!request) {
    const error = new Error('Service request not found.');
    error.status = 404;
    throw error;
  }

  const viewerId = viewer?._id?.toString() || viewer?.id?.toString();
  const isOwner = request.user && request.user._id?.toString() === viewerId;
  const isAssignedHelper = request.helper && request.helper._id?.toString() === viewerId;
  const isAdmin = viewer?.roles?.includes(ROLES.ADMIN);

  // Check if viewer has an active offer for this request
  let hasOffer = false;
  if (!isOwner && !isAssignedHelper && !isAdmin) {
    const offer = await Offer.findOne({ request: requestId, helper: viewerId });
    if (offer) {
      hasOffer = true;
    }
  }

  if (!isOwner && !isAssignedHelper && !isAdmin && !hasOffer) {
    const error = new Error('You do not have permission to view this request.');
    error.status = 403;
    throw error;
  }

  return serializeRequestFor(request, viewer);
}

export async function cancelRequest(requestId, user) {
  const request = await ServiceRequest.findById(requestId);
  if (!request) {
    const error = new Error('Service request not found.');
    error.status = 404;
    throw error;
  }

  const userId = user._id?.toString() || user.id?.toString();
  const isOwner = request.user.toString() === userId;
  const isAdmin = user?.roles?.includes(ROLES.ADMIN);

  if (!isOwner && !isAdmin) {
    const error = new Error('Only the request owner or an administrator can cancel this request.');
    error.status = 403;
    throw error;
  }

  // Cancel can only happen from POSTED, OFFERED or ACCEPTED
  const allowedForCancel = [
    REQUEST_STATUS.POSTED,
    REQUEST_STATUS.OFFERED,
    REQUEST_STATUS.ACCEPTED,
  ];

  if (!allowedForCancel.includes(request.status)) {
    const error = new Error(
      `Cannot cancel request in "${request.status}" status. Cancellation is only allowed before work starts (POSTED, OFFERED, or ACCEPTED).`
    );
    error.status = 400;
    throw error;
  }

  const actor = isAdmin && !isOwner ? 'admin' : 'user';
  const updated = await transition(request, REQUEST_STATUS.CANCELLED, actor, {
    reason: 'Cancelled by user',
  });

  return updated;
}

/**
 * Service function exposed for jobs module later: sets finalAmount on a request.
 */
export async function setFinalAmount(requestId, amount) {
  const request = await ServiceRequest.findById(requestId);
  if (!request) {
    const error = new Error('Service request not found.');
    error.status = 404;
    throw error;
  }

  request.finalAmount = Number(amount);
  await request.save();
  return request;
}

export default {
  serializeRequestFor,
  createRequest,
  getRequestsMine,
  getRequestById,
  cancelRequest,
  setFinalAmount,
};
