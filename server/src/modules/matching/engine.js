import { haversineKm } from '../../utils/haversine.js';
import { MATCHING_CONFIG } from './config.js';
import {
  VERIFICATION_STATUS,
  URGENCY,
} from '../../../../shared/constants.js';

/**
 * Calculates smoothed Bayesian average rating normalized to [0, 1].
 * Formula: ((avg * count) + (priorRating * priorWeight)) / (count + priorWeight) / 5
 */
export function calculateReputationScore(stats = {}) {
  const ratingAvg = Number(stats.ratingAvg !== undefined ? stats.ratingAvg : 3.5);
  const ratingCount = Number(stats.ratingCount || 0);

  const prior = MATCHING_CONFIG.REPUTATION_PRIOR_RATING;
  const priorWeight = MATCHING_CONFIG.REPUTATION_PRIOR_WEIGHT;

  const smoothed = (ratingAvg * ratingCount + prior * priorWeight) / (ratingCount + priorWeight);
  return Math.min(1, Math.max(0, smoothed / 5.0));
}

/**
 * Calculates helper reliability score based on completion rate.
 * Formula: completed / accepted (defaults to 0.8 for new helpers).
 */
export function calculateReliabilityScore(stats = {}) {
  const accepted = Number(stats.accepted || 0);
  const completed = Number(stats.completed || 0);

  if (accepted <= 0) {
    return MATCHING_CONFIG.DEFAULT_RELIABILITY; // 0.8 for new helpers
  }

  return Math.min(1, Math.max(0, completed / accepted));
}

/**
 * Checks if helper schedule fits the scheduled time slot.
 */
export function isAvailableForSchedule(weeklyAvailability = [], scheduledDate) {
  if (!scheduledDate) return false;

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days[scheduledDate.getDay()];

  const hours = String(scheduledDate.getHours()).padStart(2, '0');
  const minutes = String(scheduledDate.getMinutes()).padStart(2, '0');
  const targetTime = `${hours}:${minutes}`;

  const slot = weeklyAvailability.find((s) => s.day?.toLowerCase() === targetDay);
  if (!slot) return false;

  return targetTime >= slot.start && targetTime <= slot.end;
}

/**
 * Applies Step 1 hard filters to test if a helper is eligible for a request.
 */
export function passesHardFilters(request, helper, now = new Date()) {
  // 1. Must be approved
  if (helper.verificationStatus !== VERIFICATION_STATUS.APPROVED) {
    return false;
  }

  // 2. Must be online
  if (!helper.isOnline) {
    return false;
  }

  // 3. Must offer the requested category and subcategory
  const reqCatId = request.category?._id?.toString() || request.category?.toString();
  const reqSubcat = (request.subcategory || '').toLowerCase();

  const hasSkill = (helper.skills || []).some((s) => {
    const sCatId = s.category?._id?.toString() || s.category?.toString();
    const matchCat = sCatId === reqCatId;
    const matchSubcat = (s.subcategory || '').toLowerCase() === reqSubcat;
    return matchCat && matchSubcat;
  });

  if (!hasSkill) {
    return false;
  }

  // 4. Distance check: inside min(helper.radiusKm, request.searchRadiusKm)
  const reqCoords = request.location?.coordinates || [0, 0];
  const helperCoords = helper.location?.coordinates || [0, 0];

  const distanceKm = haversineKm(reqCoords, helperCoords);
  const maxAllowedDistance = Math.min(
    helper.radiusKm !== undefined ? Number(helper.radiusKm) : 10,
    request.searchRadiusKm !== undefined ? Number(request.searchRadiusKm) : 10
  );

  if (distanceKm > maxAllowedDistance) {
    return false;
  }

  // 5. Availability fit
  if (request.asap) {
    // If ASAP, being online satisfies availability
    return true;
  } else if (request.scheduledFor) {
    const schedDate = new Date(request.scheduledFor);
    return isAvailableForSchedule(helper.weeklyAvailability, schedDate);
  }

  return true;
}

/**
 * Pure function: calculates match score (0 to 1) for an eligible helper and request.
 */
export function scoreHelper(request, helper, distanceKm) {
  const searchRadius = Number(request.searchRadiusKm || 10);

  // Proximity (1 - distance / searchRadius)
  const proximity = Math.max(0, 1 - distanceKm / searchRadius);

  // Reputation (smoothed rating / 5)
  const reputation = calculateReputationScore(helper.stats);

  // Availability fit
  let availabilityFit = 0;
  if (request.asap) {
    availabilityFit = helper.isOnline ? 1.0 : 0.0;
  } else if (request.scheduledFor) {
    availabilityFit = isAvailableForSchedule(helper.weeklyAvailability, new Date(request.scheduledFor))
      ? 0.7
      : 0.0;
  } else {
    availabilityFit = 0.5;
  }

  // Reliability (completed / accepted)
  const reliability = calculateReliabilityScore(helper.stats);

  // Select weights based on urgency switch
  const isHighUrgency =
    request.urgency === URGENCY.URGENT || request.urgency === URGENCY.EMERGENCY;
  const weights = isHighUrgency
    ? MATCHING_CONFIG.WEIGHTS_URGENT
    : MATCHING_CONFIG.WEIGHTS_NORMAL;

  const totalScore =
    proximity * weights.PROXIMITY +
    reputation * weights.REPUTATION +
    availabilityFit * weights.AVAILABILITY +
    reliability * weights.RELIABILITY;

  return Math.round(totalScore * 10000) / 10000; // 4 decimal precision
}

/**
 * PURE ranking function:
 * Input: request, helpers array, now (Date)
 * Output: sorted array of { helper, score, distanceKm }
 */
export function rank(request, helpers = [], now = new Date()) {
  const candidates = [];

  const reqCoords = request.location?.coordinates || [0, 0];

  for (const helper of helpers) {
    if (passesHardFilters(request, helper, now)) {
      const helperCoords = helper.location?.coordinates || [0, 0];
      const distanceKm = haversineKm(reqCoords, helperCoords);
      const score = scoreHelper(request, helper, distanceKm);

      candidates.push({
        helper,
        score,
        distanceKm,
      });
    }
  }

  // Sort descending by score, tie-break by proximity then rating
  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.distanceKm !== b.distanceKm) {
      return a.distanceKm - b.distanceKm;
    }
    const aRating = a.helper.stats?.ratingAvg || 0;
    const bRating = b.helper.stats?.ratingAvg || 0;
    return bRating - aRating;
  });

  return candidates;
}

export default {
  calculateReputationScore,
  calculateReliabilityScore,
  isAvailableForSchedule,
  passesHardFilters,
  scoreHelper,
  rank,
};
