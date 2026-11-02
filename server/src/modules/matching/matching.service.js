import mongoose from 'mongoose';
import {
  ServiceRequest,
  HelperProfile,
  Offer,
  User,
} from '../../models/index.js';
import {
  REQUEST_STATUS,
  OFFER_STATUS,
  VERIFICATION_STATUS,
} from '../../../../shared/constants.js';
import { events, EVENT_NAMES } from '../requests/events.js';
import { transition } from '../requests/stateMachine.js';
import { rank } from './engine.js';
import { MATCHING_CONFIG } from './config.js';

/**
 * Calculates offer expiration date based on request urgency.
 */
export function calculateOfferExpiry(urgency, now = new Date()) {
  const minutes =
    MATCHING_CONFIG.OFFER_LIFETIME_MINUTES[urgency] ||
    MATCHING_CONFIG.OFFER_LIFETIME_MINUTES.normal ||
    30;
  return new Date(now.getTime() + minutes * 60 * 1000);
}

/**
 * Triggered on 'request:posted':
 * Finds candidates using geo query, applies ranking engine, creates Offers for top 5,
 * transitions request from POSTED to OFFERED, and emits 'offer:created'.
 */
export async function matchAndOfferRequest(request, isWidenedRetry = false) {
  // Ensure request is in POSTED or OFFERED state
  const liveRequest = await ServiceRequest.findById(request._id);
  if (!liveRequest || ![REQUEST_STATUS.POSTED, REQUEST_STATUS.OFFERED].includes(liveRequest.status)) {
    return;
  }

  const coords = liveRequest.location?.coordinates;
  if (!coords) return;

  const searchRadiusKm = liveRequest.searchRadiusKm || 10;
  const maxDistanceMeters = searchRadiusKm * 1000;

  // 1. Geo query to find candidates within max search distance
  const candidates = await HelperProfile.find({
    verificationStatus: VERIFICATION_STATUS.APPROVED,
    isOnline: true,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coords,
        },
        $maxDistance: maxDistanceMeters,
      },
    },
  }).populate('user', 'name phone email');

  // Filter out helpers who already have an offer for this request
  const existingOffers = await Offer.find({ request: liveRequest._id }).select('helper');
  const existingHelperIds = new Set(existingOffers.map((o) => o.helper.toString()));

  const uncontactedHelpers = candidates.filter(
    (h) => !existingHelperIds.has(h.user._id.toString())
  );

  // 2. Rank candidates using pure ranking engine
  const ranked = rank(liveRequest, uncontactedHelpers, new Date());

  // 3. Take top 5 helpers
  const topCandidates = ranked.slice(0, MATCHING_CONFIG.BATCH_SIZE);

  if (topCandidates.length === 0) {
    if (!isWidenedRetry) {
      // First attempt produced no candidates -> widen radius by 50% once
      console.log(`[Matching] No candidates found in ${searchRadiusKm}km for request ${liveRequest._id}. Widening radius by 50%...`);
      liveRequest.searchRadiusKm = Math.round(searchRadiusKm * MATCHING_CONFIG.RADIUS_WIDEN_FACTOR);
      await liveRequest.save();
      return matchAndOfferRequest(liveRequest, true);
    } else {
      // Even with widened radius, no helpers found -> transition to EXPIRED
      console.log(`[Matching] Still no candidates found after widening. Expiring request ${liveRequest._id}.`);
      if (liveRequest.status === REQUEST_STATUS.POSTED) {
        // Transition POSTED -> OFFERED -> EXPIRED per state machine rules
        await transition(liveRequest, REQUEST_STATUS.OFFERED, 'system', { reason: 'Matching started' });
      }
      await transition(liveRequest, REQUEST_STATUS.EXPIRED, 'system', {
        reason: 'No suitable helpers available nearby',
      });
      return;
    }
  }

  // 4. Create Offers
  const expiresAt = calculateOfferExpiry(liveRequest.urgency);
  const createdOffers = [];

  for (const item of topCandidates) {
    try {
      const offer = await Offer.create({
        request: liveRequest._id,
        helper: item.helper.user._id,
        score: item.score,
        distanceKm: item.distanceKm,
        status: OFFER_STATUS.SENT,
        expiresAt,
      });

      // Increment offered count on helper profile
      item.helper.stats = item.helper.stats || {};
      item.helper.stats.offered = (item.helper.stats.offered || 0) + 1;
      await item.helper.save();

      createdOffers.push(offer);
      events.emit(EVENT_NAMES.OFFER_CREATED, offer);
    } catch (offerErr) {
      console.warn(`[Matching] Failed to create offer for helper ${item.helper.user._id}:`, offerErr.message);
    }
  }

  // 5. If request is still in POSTED and offers exist, transition to OFFERED
  const freshRequest = await ServiceRequest.findById(liveRequest._id);
  const totalOffersCount = await Offer.countDocuments({ request: liveRequest._id });
  if (freshRequest && freshRequest.status === REQUEST_STATUS.POSTED && totalOffersCount > 0) {
    await transition(freshRequest, REQUEST_STATUS.OFFERED, 'system', {
      offersCount: totalOffersCount,
      expiresAt,
    });
  }

  return createdOffers;
}

/**
 * Returns active offers for the authenticated helper.
 */
export async function getHelperOffers(helperUserId) {
  const now = new Date();

  const offers = await Offer.find({
    helper: helperUserId,
    status: OFFER_STATUS.SENT,
    expiresAt: { $gt: now },
  })
    .populate({
      path: 'request',
      select: 'category subcategory description urgency pricingType budget asap scheduledFor location createdAt',
      populate: { path: 'category', select: 'name type' },
    })
    .sort({ createdAt: -1 })
    .lean();

  // Obfuscate coordinates for offers before acceptance
  return offers.map((offer) => {
    if (offer.request?.location?.coordinates) {
      const coords = offer.request.location.coordinates;
      offer.request.location = {
        type: 'Point',
        coordinates: [
          Math.round(coords[0] * 100) / 100,
          Math.round(coords[1] * 100) / 100,
        ],
        address: 'Approximate area (exact address revealed upon acceptance)',
      };
    }
    return offer;
  });
}

/**
 * Atomic Offer Acceptance:
 * Only ONE helper can accept an offered request. First to accept wins.
 */
export async function acceptOffer(offerId, helperUserId) {
  const offer = await Offer.findById(offerId);
  if (!offer) {
    const error = new Error('Offer not found.');
    error.status = 404;
    throw error;
  }

  if (offer.helper.toString() !== helperUserId.toString()) {
    const error = new Error('You are not authorized to accept this offer.');
    error.status = 403;
    throw error;
  }

  if (offer.status !== OFFER_STATUS.SENT) {
    const error = new Error(`Offer is no longer available (status: ${offer.status}).`);
    error.status = 400;
    throw error;
  }

  if (new Date() > offer.expiresAt) {
    offer.status = OFFER_STATUS.EXPIRED;
    await offer.save();
    const error = new Error('This offer has expired.');
    error.status = 400;
    throw error;
  }

  // Atomically lock the request and assign helper
  // Only update if request is in OFFERED status and helper is not yet assigned
  const request = await ServiceRequest.findOneAndUpdate(
    {
      _id: offer.request,
      status: REQUEST_STATUS.OFFERED,
      helper: null,
    },
    {
      helper: helperUserId,
    },
    { new: true }
  );

  if (!request) {
    // Another helper accepted first!
    offer.status = OFFER_STATUS.TAKEN;
    await offer.save();
    const error = new Error('Another helper has already accepted this request.');
    error.status = 409;
    throw error;
  }

  // Mark this offer as accepted
  offer.status = OFFER_STATUS.ACCEPTED;
  await offer.save();

  // Mark all other competing offers for this request as TAKEN
  await Offer.updateMany(
    {
      request: request._id,
      _id: { $ne: offer._id },
    },
    {
      status: OFFER_STATUS.TAKEN,
    }
  );

  // Update helper stats: increment accepted counter
  await HelperProfile.findOneAndUpdate(
    { user: helperUserId },
    { $inc: { 'stats.accepted': 1 } }
  );

  // Transition request: OFFERED -> ACCEPTED
  await transition(request, REQUEST_STATUS.ACCEPTED, 'helper', {
    offerId: offer._id,
    helperId: helperUserId,
  });

  return {
    offer,
    request,
  };
}

/**
 * Rejects an offer for a helper.
 */
export async function rejectOffer(offerId, helperUserId) {
  const offer = await Offer.findById(offerId);
  if (!offer) {
    const error = new Error('Offer not found.');
    error.status = 404;
    throw error;
  }

  if (offer.helper.toString() !== helperUserId.toString()) {
    const error = new Error('You are not authorized to reject this offer.');
    error.status = 403;
    throw error;
  }

  offer.status = OFFER_STATUS.REJECTED;
  await offer.save();

  return offer;
}

/**
 * Periodic expiry worker running every 15 seconds.
 * 1. Expire old sent offers
 * 2. If all offers for an OFFERED request are rejected or expired:
 *    - If not widened yet, widen radius by 50% and offer to next 5
 *    - If already widened, transition to EXPIRED
 */
export async function runExpiryCheck() {
  if (mongoose.connection.readyState !== 1) return;
  const now = new Date();

  // 1. Expire stale sent offers
  await Offer.updateMany(
    {
      status: OFFER_STATUS.SENT,
      expiresAt: { $lte: now },
    },
    {
      status: OFFER_STATUS.EXPIRED,
    }
  );

  // 2. Find requests currently in OFFERED status
  const offeredRequests = await ServiceRequest.find({ status: REQUEST_STATUS.OFFERED });

  for (const req of offeredRequests) {
    const offers = await Offer.find({ request: req._id });

    // Check if there are any active pending offers
    const hasActiveOffer = offers.some(
      (o) => o.status === OFFER_STATUS.SENT && o.expiresAt > now
    );

    if (!hasActiveOffer && offers.length > 0) {
      // All current offers have ended without acceptance
      const initialRadius = 10;
      const isAlreadyWidened = (req.searchRadiusKm || 10) > initialRadius;

      if (!isAlreadyWidened) {
        // Widen once by 50% and offer to next candidates
        console.log(`[Expiry Worker] All offers expired/rejected for request ${req._id}. Widening radius...`);
        req.searchRadiusKm = Math.round(initialRadius * MATCHING_CONFIG.RADIUS_WIDEN_FACTOR);
        await req.save();
        await matchAndOfferRequest(req, true);
      } else {
        // Already widened once and still no accepted offer -> EXPIRED
        console.log(`[Expiry Worker] All offers exhausted after widening. Expiring request ${req._id}.`);
        try {
          await transition(req, REQUEST_STATUS.EXPIRED, 'system', {
            reason: 'Offer window expired without helper acceptance',
          });
        } catch (transErr) {
          console.warn(`[Expiry Worker] Could not transition request ${req._id} to EXPIRED:`, transErr.message);
        }
      }
    }
  }
}

export default {
  calculateOfferExpiry,
  matchAndOfferRequest,
  getHelperOffers,
  acceptOffer,
  rejectOffer,
  runExpiryCheck,
};
