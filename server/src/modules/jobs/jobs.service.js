import {
  ServiceRequest,
  Message,
  User,
} from '../../models/index.js';
import {
  REQUEST_STATUS,
  PRICING_TYPE,
  ROLES,
} from '../../../../shared/constants.js';
import {
  transition,
  setFinalAmount,
  events,
  service as requestsModule,
} from '../requests/index.js';
import { EVENT_NAMES } from '../requests/events.js';

const CHAT_ACTIVE_STATUSES = [
  REQUEST_STATUS.ACCEPTED,
  REQUEST_STATUS.IN_PROGRESS,
  REQUEST_STATUS.COMPLETED,
  REQUEST_STATUS.PAID,
];

const CHAT_READ_STATUSES = [
  REQUEST_STATUS.ACCEPTED,
  REQUEST_STATUS.IN_PROGRESS,
  REQUEST_STATUS.COMPLETED,
  REQUEST_STATUS.PAID,
  REQUEST_STATUS.RATED,
];

/**
 * Helper starts work on an accepted request.
 * Transitions ACCEPTED -> IN_PROGRESS.
 */
export async function startJob(requestId, user) {
  const request = await ServiceRequest.findById(requestId)
    .populate('category', 'name type')
    .populate('user', 'name phone email')
    .populate('helper', 'name phone email');

  if (!request) {
    const error = new Error('Service request not found.');
    error.status = 404;
    throw error;
  }

  const userId = user._id?.toString() || user.id?.toString();
  const assignedHelperId =
    request.helper?._id?.toString() ||
    request.helper?.id?.toString() ||
    request.helper?.toString();

  const isAdmin = user.roles?.includes(ROLES.ADMIN);

  if (!isAdmin && assignedHelperId !== userId) {
    const error = new Error('Only the assigned helper can start this job.');
    error.status = 403;
    throw error;
  }

  if (request.status !== REQUEST_STATUS.ACCEPTED) {
    const error = new Error(
      `Job cannot be started from "${request.status}" status. It must be in ACCEPTED status.`
    );
    error.status = 400;
    throw error;
  }

  const updated = await transition(request, REQUEST_STATUS.IN_PROGRESS, 'helper', {
    helperId: userId,
  });

  return requestsModule.serializeRequestFor(updated, user);
}

/**
 * Helper completes work on an in-progress request.
 * Transitions IN_PROGRESS -> COMPLETED and stores finalAmount if paid.
 */
export async function completeJob(requestId, user, { finalAmount } = {}) {
  const request = await ServiceRequest.findById(requestId)
    .populate('category', 'name type')
    .populate('user', 'name phone email')
    .populate('helper', 'name phone email');

  if (!request) {
    const error = new Error('Service request not found.');
    error.status = 404;
    throw error;
  }

  const userId = user._id?.toString() || user.id?.toString();
  const assignedHelperId =
    request.helper?._id?.toString() ||
    request.helper?.id?.toString() ||
    request.helper?.toString();

  const isAdmin = user.roles?.includes(ROLES.ADMIN);

  if (!isAdmin && assignedHelperId !== userId) {
    const error = new Error('Only the assigned helper can complete this job.');
    error.status = 403;
    throw error;
  }

  if (request.status !== REQUEST_STATUS.IN_PROGRESS) {
    const error = new Error(
      `Job cannot be completed from "${request.status}" status. It must be in IN_PROGRESS status.`
    );
    error.status = 400;
    throw error;
  }

  const isPaid = request.pricingType !== PRICING_TYPE.FREE;

  if (isPaid) {
    if (finalAmount === undefined || finalAmount === null || isNaN(Number(finalAmount)) || Number(finalAmount) <= 0) {
      const error = new Error('Final amount is required for paid jobs and must be greater than 0.');
      error.status = 400;
      throw error;
    }

    await setFinalAmount(request._id, Number(finalAmount));
  } else {
    // Free jobs default finalAmount to 0
    await setFinalAmount(request._id, 0);
  }

  const updated = await transition(request, REQUEST_STATUS.COMPLETED, 'helper', {
    helperId: userId,
    finalAmount: isPaid ? Number(finalAmount) : 0,
  });

  return requestsModule.serializeRequestFor(updated, user);
}

/**
 * Get direct messages for a request.
 * Only request owner, assigned helper, or admin.
 * Only while status is ACCEPTED through PAID (or RATED for history).
 */
export async function getMessages(requestId, user) {
  const request = await ServiceRequest.findById(requestId);
  if (!request) {
    const error = new Error('Service request not found.');
    error.status = 404;
    throw error;
  }

  const userId = user._id?.toString() || user.id?.toString();
  const ownerId = request.user?.toString();
  const assignedHelperId = request.helper?.toString();
  const isAdmin = user.roles?.includes(ROLES.ADMIN);

  if (!isAdmin && ownerId !== userId && assignedHelperId !== userId) {
    const error = new Error('Access denied. Only the request owner or assigned helper can access messages.');
    error.status = 403;
    throw error;
  }

  if (!CHAT_READ_STATUSES.includes(request.status)) {
    const error = new Error(
      `Chat is only accessible once an offer has been accepted (current status: "${request.status}").`
    );
    error.status = 400;
    throw error;
  }

  const messages = await Message.find({ request: requestId })
    .populate('sender', 'name roles')
    .sort({ createdAt: 1 });

  return messages;
}

/**
 * Send a message for a request.
 * Only request owner or assigned helper.
 * Only while status is ACCEPTED through PAID.
 * Emits 'message:created'.
 */
export async function sendMessage(requestId, user, text) {
  const request = await ServiceRequest.findById(requestId);
  if (!request) {
    const error = new Error('Service request not found.');
    error.status = 404;
    throw error;
  }

  const userId = user._id?.toString() || user.id?.toString();
  const ownerId = request.user?.toString();
  const assignedHelperId = request.helper?.toString();

  if (ownerId !== userId && assignedHelperId !== userId) {
    const error = new Error('Access denied. Only the request owner or assigned helper can send messages.');
    error.status = 403;
    throw error;
  }

  if (!CHAT_ACTIVE_STATUSES.includes(request.status)) {
    const error = new Error(
      `Cannot send message: chat is only active while status is between ACCEPTED and PAID (current: "${request.status}").`
    );
    error.status = 400;
    throw error;
  }

  const trimmedText = (text || '').trim();
  if (!trimmedText) {
    const error = new Error('Message cannot be empty.');
    error.status = 400;
    throw error;
  }

  if (trimmedText.length > 1000) {
    const error = new Error('Message exceeds maximum limit of 1000 characters.');
    error.status = 400;
    throw error;
  }

  const message = await Message.create({
    request: requestId,
    sender: userId,
    text: trimmedText,
  });

  await message.populate('sender', 'name roles');

  // Emit 'message:created' event
  events.emit(EVENT_NAMES.MESSAGE_CREATED, message);

  return message;
}

/**
 * Retrieve all jobs assigned to the authenticated helper.
 */
export async function getHelperJobs(user) {
  const userId = user._id?.toString() || user.id?.toString();

  const requests = await ServiceRequest.find({ helper: userId })
    .populate('category', 'name type')
    .populate('user', 'name phone email')
    .populate('helper', 'name phone email')
    .sort({ updatedAt: -1 });

  const serialized = requests.map((r) => requestsModule.serializeRequestFor(r, user));

  const activeJobs = serialized.filter((r) =>
    [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.IN_PROGRESS].includes(r.status)
  );

  const pastJobs = serialized.filter((r) =>
    [
      REQUEST_STATUS.COMPLETED,
      REQUEST_STATUS.PAID,
      REQUEST_STATUS.RATED,
      REQUEST_STATUS.CANCELLED,
    ].includes(r.status)
  );

  return {
    jobs: serialized,
    activeJobs,
    pastJobs,
  };
}

export default {
  startJob,
  completeJob,
  getMessages,
  sendMessage,
  getHelperJobs,
};
