import {
  calculateReputationScore,
  calculateReliabilityScore,
  isAvailableForSchedule,
  passesHardFilters,
  scoreHelper,
  rank,
} from '../src/modules/matching/engine.js';
import { MATCHING_CONFIG } from '../src/modules/matching/config.js';
import {
  VERIFICATION_STATUS,
  URGENCY,
  PRICING_TYPE,
} from '../../shared/constants.js';

describe('Matching Engine Pure Unit Tests', () => {
  const mockCategory = '654321654321654321654321';

  const mockRequest = (overrides = {}) => ({
    _id: 'req123',
    category: mockCategory,
    subcategory: 'electrician',
    location: {
      type: 'Point',
      coordinates: [77.2090, 28.6139], // New Delhi
    },
    asap: true,
    scheduledFor: null,
    urgency: URGENCY.NORMAL,
    pricingType: PRICING_TYPE.FIXED,
    searchRadiusKm: 10,
    ...overrides,
  });

  const mockHelper = (overrides = {}) => ({
    _id: 'help1',
    user: 'u1',
    verificationStatus: VERIFICATION_STATUS.APPROVED,
    isOnline: true,
    radiusKm: 15,
    location: {
      type: 'Point',
      coordinates: [77.2190, 28.6139], // ~1 km east
    },
    skills: [
      {
        category: mockCategory,
        subcategory: 'electrician',
        rate: 300,
        rateType: PRICING_TYPE.FIXED,
      },
    ],
    weeklyAvailability: [
      { day: 'monday', start: '08:00', end: '20:00' },
      { day: 'tuesday', start: '08:00', end: '20:00' },
    ],
    stats: {
      ratingAvg: 4.8,
      ratingCount: 10,
      completed: 18,
      accepted: 20,
    },
    ...overrides,
  });

  describe('1. Hard Filters', () => {
    test('passes when helper is approved, online, skilled and within radius', () => {
      const req = mockRequest();
      const helper = mockHelper();
      expect(passesHardFilters(req, helper)).toBe(true);
    });

    test('fails when helper is pending or rejected', () => {
      const req = mockRequest();
      const helper = mockHelper({ verificationStatus: VERIFICATION_STATUS.PENDING });
      expect(passesHardFilters(req, helper)).toBe(false);

      const rejectedHelper = mockHelper({ verificationStatus: VERIFICATION_STATUS.REJECTED });
      expect(passesHardFilters(req, rejectedHelper)).toBe(false);
    });

    test('fails when helper is offline for ASAP job', () => {
      const req = mockRequest({ asap: true });
      const helper = mockHelper({ isOnline: false });
      expect(passesHardFilters(req, helper)).toBe(false);
    });

    test('fails when helper lacks the requested skill', () => {
      const req = mockRequest({ subcategory: 'carpenter' });
      const helper = mockHelper();
      expect(passesHardFilters(req, helper)).toBe(false);
    });

    test('fails when helper is outside min(helper.radius, request.radius)', () => {
      const req = mockRequest({ searchRadiusKm: 5 });
      // Distance is ~11km away
      const helper = mockHelper({
        location: { type: 'Point', coordinates: [77.3190, 28.6139] },
        radiusKm: 15,
      });
      expect(passesHardFilters(req, helper)).toBe(false);
    });
  });

  describe('2. Score Components', () => {
    test('Reputation score applies Bayesian smoothing with 3.5 prior worth 5 ratings', () => {
      // New helper with 0 reviews
      const newHelperRep = calculateReputationScore({ ratingAvg: 3.5, ratingCount: 0 });
      // (3.5 * 5) / 5 / 5 = 3.5 / 5 = 0.70
      expect(newHelperRep).toBeCloseTo(0.70, 2);

      // Helper with 5.0 rating on 5 reviews
      // (5.0*5 + 3.5*5) / 10 / 5 = (25 + 17.5)/10/5 = 4.25 / 5 = 0.85
      const seasonedHelperRep = calculateReputationScore({ ratingAvg: 5.0, ratingCount: 5 });
      expect(seasonedHelperRep).toBeCloseTo(0.85, 2);
    });

    test('Reliability score defaults to 0.8 for new helpers', () => {
      expect(calculateReliabilityScore({ completed: 0, accepted: 0 })).toBe(0.8);
      expect(calculateReliabilityScore({ completed: 9, accepted: 10 })).toBe(0.9);
    });

    test('Availability schedule check', () => {
      const availability = [{ day: 'monday', start: '09:00', end: '17:00' }];
      // Monday 11:30 AM
      const monMatch = new Date('2026-11-02T11:30:00'); // Nov 2 2026 is Monday
      expect(isAvailableForSchedule(availability, monMatch)).toBe(true);

      // Monday 20:00 (outside hours)
      const monLate = new Date('2026-11-02T20:00:00');
      expect(isAvailableForSchedule(availability, monLate)).toBe(false);
    });
  });

  describe('3. Urgency Weight Switch', () => {
    test('Normal urgency uses 0.40 proximity weight', () => {
      const normalReq = mockRequest({ urgency: URGENCY.NORMAL });
      const helper = mockHelper();
      const scoreNormal = scoreHelper(normalReq, helper, 1.0);
      expect(scoreNormal).toBeGreaterThan(0);
      expect(scoreNormal).toBeLessThanOrEqual(1);
    });

    test('Urgent/Emergency urgency gives higher priority (0.55) to proximity', () => {
      const normalReq = mockRequest({ urgency: URGENCY.NORMAL });
      const urgentReq = mockRequest({ urgency: URGENCY.URGENT });

      // Very close helper (0.1km away) should score higher under urgent due to 0.55 proximity weight
      const closeHelper = mockHelper({
        location: { type: 'Point', coordinates: [77.2099, 28.6139] },
        stats: { ratingAvg: 3.5, ratingCount: 0, completed: 0, accepted: 0 },
      });

      const normalScore = scoreHelper(normalReq, closeHelper, 0.1);
      const urgentScore = scoreHelper(urgentReq, closeHelper, 0.1);
      expect(urgentScore).toBeGreaterThan(normalScore);
    });
  });

  describe('4. Radius Widening & Ranking', () => {
    test('rank returns candidates sorted by score descending', () => {
      const req = mockRequest();
      const h1 = mockHelper({ _id: 'h1', location: { type: 'Point', coordinates: [77.2190, 28.6139] } }); // ~1km
      const h2 = mockHelper({ _id: 'h2', location: { type: 'Point', coordinates: [77.2490, 28.6139] } }); // ~4km

      const ranked = rank(req, [h2, h1]);
      expect(ranked.length).toBe(2);
      expect(ranked[0].helper._id).toBe('h1'); // Closer helper wins
      expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });

    test('Radius widening by 50% includes helpers previously out of range', () => {
      const req = mockRequest({ searchRadiusKm: 4 });
      const distantHelper = mockHelper({
        location: { type: 'Point', coordinates: [77.2590, 28.6139] }, // ~5km away
        radiusKm: 15,
      });

      // At 4km radius, distant helper is excluded
      expect(passesHardFilters(req, distantHelper)).toBe(false);

      // Widened by 50% to 6km (4 * 1.5)
      const widenedReq = mockRequest({
        searchRadiusKm: req.searchRadiusKm * MATCHING_CONFIG.RADIUS_WIDEN_FACTOR,
      });
      expect(passesHardFilters(widenedReq, distantHelper)).toBe(true);
    });
  });

  describe('5. Tie-Breaks', () => {
    test('Breaks equal score ties by distance then rating', () => {
      const req = mockRequest();
      const hA = mockHelper({
        _id: 'hA',
        location: { type: 'Point', coordinates: [77.2190, 28.6139] },
        stats: { ratingAvg: 4.5, ratingCount: 5, completed: 5, accepted: 5 },
      });
      const hB = mockHelper({
        _id: 'hB',
        location: { type: 'Point', coordinates: [77.2180, 28.6139] }, // slightly closer
        stats: { ratingAvg: 4.5, ratingCount: 5, completed: 5, accepted: 5 },
      });

      const ranked = rank(req, [hA, hB]);
      expect(ranked[0].distanceKm).toBeLessThanOrEqual(ranked[1].distanceKm);
    });
  });
});
