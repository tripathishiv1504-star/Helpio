import {
  ServiceRequest,
  Rating,
  HelperProfile,
  User,
} from '../../models/index.js';
import {
  REQUEST_STATUS,
  PRICING_TYPE,
  ROLES,
} from '../../../../shared/constants.js';
import { transition } from '../requests/index.js';

/**
 * Submits a rating for a service request.
 * - Requester rating the helper: allowed at PAID (for paid jobs) or COMPLETED (for free jobs).
 *   Transitions request to RATED and updates HelperProfile.stats incrementally.
 * - Helper rating the requester: allowed after COMPLETED (COMPLETED, PAID, or RATED).
 *   Optional, does not change request status.
 * One rating per direction per request.
 */
export async function createRating(requestId, user, { stars, comment = '' }) {
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
  const ownerId =
    request.user?._id?.toString() ||
    request.user?.id?.toString() ||
    request.user?.toString();

  const helperId =
    request.helper?._id?.toString() ||
    request.helper?.id?.toString() ||
    request.helper?.toString();

  const isOwner = ownerId === userId;
  const isHelper = helperId === userId;

  if (!isOwner && !isHelper) {
    const error = new Error('Only the request owner or assigned helper can submit a rating.');
    error.status = 403;
    throw error;
  }

  // Prevent multiple ratings from the same user for this request
  const existingRating = await Rating.findOne({
    request: requestId,
    from: userId,
  });

  if (existingRating) {
    const error = new Error('You have already submitted a rating for this request.');
    error.status = 400;
    throw error;
  }

  let rating;
  let updatedRequest = request;

  if (isOwner) {
    // Owner is rating the helper
    if (!helperId) {
      const error = new Error('Cannot rate request: no helper was assigned.');
      error.status = 400;
      throw error;
    }

    const isPaidJob = request.pricingType !== PRICING_TYPE.FREE;

    // Check status eligibility
    if (isPaidJob && request.status !== REQUEST_STATUS.PAID) {
      const error = new Error(
        `Rating can only be submitted once the job is paid (current status: "${request.status}").`
      );
      error.status = 400;
      throw error;
    }

    if (!isPaidJob && request.status !== REQUEST_STATUS.COMPLETED) {
      const error = new Error(
        `Rating for free community jobs can only be submitted once completed (current status: "${request.status}").`
      );
      error.status = 400;
      throw error;
    }

    rating = await Rating.create({
      request: requestId,
      from: userId,
      to: helperId,
      stars: Number(stars),
      comment: (comment || '').trim(),
    });

    // Update HelperProfile stats incrementally
    const helperProfile = await HelperProfile.findOne({ user: helperId });
    if (helperProfile) {
      const oldCount = helperProfile.stats?.ratingCount || 0;
      const oldAvg = helperProfile.stats?.ratingAvg || 0;
      const newCount = oldCount + 1;
      const newAvg = oldCount === 0 ? Number(stars) : (oldAvg * oldCount + Number(stars)) / newCount;

      helperProfile.stats.ratingCount = newCount;
      helperProfile.stats.ratingAvg = Math.round(newAvg * 10) / 10;
      await helperProfile.save();
    }

    // Transition request status to RATED
    updatedRequest = await transition(request, REQUEST_STATUS.RATED, 'user', {
      ratingId: rating._id,
      stars: Number(stars),
      comment,
    });
  } else {
    // Helper is rating the customer
    const allowedStatuses = [
      REQUEST_STATUS.COMPLETED,
      REQUEST_STATUS.PAID,
      REQUEST_STATUS.RATED,
    ];

    if (!allowedStatuses.includes(request.status)) {
      const error = new Error(
        `Helper rating can only be submitted after the job is completed (current status: "${request.status}").`
      );
      error.status = 400;
      throw error;
    }

    rating = await Rating.create({
      request: requestId,
      from: userId,
      to: ownerId,
      stars: Number(stars),
      comment: (comment || '').trim(),
    });

    // Helper rating customer is optional and does not change request status
  }

  await rating.populate([
    { path: 'from', select: 'name roles' },
    { path: 'to', select: 'name roles' },
  ]);

  return {
    rating,
    request: updatedRequest,
  };
}

/**
 * Retrieves public ratings and review summary for a helper.
 */
export async function getRatingsForHelper(helperUserId) {
  const ratings = await Rating.find({ to: helperUserId })
    .populate('from', 'name')
    .populate('request', 'subcategory category')
    .sort({ createdAt: -1 });

  const count = ratings.length;
  const average =
    count === 0
      ? 0
      : Math.round(
          (ratings.reduce((sum, r) => sum + r.stars, 0) / count) * 10
        ) / 10;

  return {
    ratings,
    count,
    average,
  };
}

/**
 * Retrieves ratings for a specific request.
 */
export async function getRequestRatings(requestId) {
  const ratings = await Rating.find({ request: requestId })
    .populate('from', 'name roles')
    .populate('to', 'name roles')
    .sort({ createdAt: 1 });

  return ratings;
}

export default {
  createRating,
  getRatingsForHelper,
  getRequestRatings,
};
