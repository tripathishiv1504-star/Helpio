import { URGENCY } from '../../../../shared/constants.js';

export const MATCHING_CONFIG = Object.freeze({
  // Weights for Normal Urgency
  WEIGHTS_NORMAL: Object.freeze({
    PROXIMITY: 0.40,
    REPUTATION: 0.30,
    AVAILABILITY: 0.20,
    RELIABILITY: 0.10,
  }),

  // Weights for Urgent and Emergency
  WEIGHTS_URGENT: Object.freeze({
    PROXIMITY: 0.55,
    REPUTATION: 0.20,
    AVAILABILITY: 0.15,
    RELIABILITY: 0.10,
  }),

  // Offer lifetime (minutes)
  OFFER_LIFETIME_MINUTES: Object.freeze({
    [URGENCY.EMERGENCY]: 5,
    [URGENCY.URGENT]: 10,
    [URGENCY.NORMAL]: 30,
  }),

  // Maximum helpers per offer batch
  BATCH_SIZE: 5,

  // Radius widening factor on retry
  RADIUS_WIDEN_FACTOR: 1.5, // 50% widening

  // Reputation prior smoothing: 3.5 prior worth 5 ratings
  REPUTATION_PRIOR_RATING: 3.5,
  REPUTATION_PRIOR_WEIGHT: 5,

  // Default reliability for new helpers
  DEFAULT_RELIABILITY: 0.8,
});

export default MATCHING_CONFIG;
