import {
  LEGAL_TRANSITIONS,
  isTransitionLegal,
} from '../src/modules/requests/stateMachine.js';
import {
  REQUEST_STATUS,
  PRICING_TYPE,
} from '../../shared/constants.js';

describe('ServiceRequest State Machine Table Unit Tests', () => {
  const dummyRequest = (status, pricingType = PRICING_TYPE.FIXED) => ({
    status,
    pricingType,
    statusHistory: [],
  });

  describe('From POSTED', () => {
    test('POSTED -> OFFERED is legal for system and admin, illegal for helper', () => {
      const req = dummyRequest(REQUEST_STATUS.POSTED);
      expect(isTransitionLegal(req, REQUEST_STATUS.OFFERED, 'system').legal).toBe(true);
      expect(isTransitionLegal(req, REQUEST_STATUS.OFFERED, 'admin').legal).toBe(true);
      expect(isTransitionLegal(req, REQUEST_STATUS.OFFERED, 'helper').legal).toBe(false);
    });

    test('POSTED -> CANCELLED is legal for user and admin', () => {
      const req = dummyRequest(REQUEST_STATUS.POSTED);
      expect(isTransitionLegal(req, REQUEST_STATUS.CANCELLED, 'user').legal).toBe(true);
      expect(isTransitionLegal(req, REQUEST_STATUS.CANCELLED, 'admin').legal).toBe(true);
    });

    test('POSTED -> IN_PROGRESS is illegal', () => {
      const req = dummyRequest(REQUEST_STATUS.POSTED);
      expect(isTransitionLegal(req, REQUEST_STATUS.IN_PROGRESS, 'user').legal).toBe(false);
      expect(isTransitionLegal(req, REQUEST_STATUS.IN_PROGRESS, 'helper').legal).toBe(false);
    });
  });

  describe('From OFFERED', () => {
    test('OFFERED -> ACCEPTED is legal for helper, system, admin', () => {
      const req = dummyRequest(REQUEST_STATUS.OFFERED);
      expect(isTransitionLegal(req, REQUEST_STATUS.ACCEPTED, 'helper').legal).toBe(true);
      expect(isTransitionLegal(req, REQUEST_STATUS.ACCEPTED, 'system').legal).toBe(true);
    });

    test('OFFERED -> EXPIRED is legal for system and admin', () => {
      const req = dummyRequest(REQUEST_STATUS.OFFERED);
      expect(isTransitionLegal(req, REQUEST_STATUS.EXPIRED, 'system').legal).toBe(true);
      expect(isTransitionLegal(req, REQUEST_STATUS.EXPIRED, 'user').legal).toBe(false);
    });

    test('OFFERED -> CANCELLED is legal for user and admin', () => {
      const req = dummyRequest(REQUEST_STATUS.OFFERED);
      expect(isTransitionLegal(req, REQUEST_STATUS.CANCELLED, 'user').legal).toBe(true);
    });
  });

  describe('From ACCEPTED', () => {
    test('ACCEPTED -> IN_PROGRESS is legal for helper and admin', () => {
      const req = dummyRequest(REQUEST_STATUS.ACCEPTED);
      expect(isTransitionLegal(req, REQUEST_STATUS.IN_PROGRESS, 'helper').legal).toBe(true);
      expect(isTransitionLegal(req, REQUEST_STATUS.IN_PROGRESS, 'user').legal).toBe(false);
    });

    test('ACCEPTED -> CANCELLED is legal for user and admin', () => {
      const req = dummyRequest(REQUEST_STATUS.ACCEPTED);
      expect(isTransitionLegal(req, REQUEST_STATUS.CANCELLED, 'user').legal).toBe(true);
    });
  });

  describe('From IN_PROGRESS', () => {
    test('IN_PROGRESS -> COMPLETED is legal for helper and admin', () => {
      const req = dummyRequest(REQUEST_STATUS.IN_PROGRESS);
      expect(isTransitionLegal(req, REQUEST_STATUS.COMPLETED, 'helper').legal).toBe(true);
    });

    test('IN_PROGRESS -> CANCELLED is illegal once work has started', () => {
      const req = dummyRequest(REQUEST_STATUS.IN_PROGRESS);
      expect(isTransitionLegal(req, REQUEST_STATUS.CANCELLED, 'user').legal).toBe(false);
    });
  });

  describe('From COMPLETED', () => {
    test('Paid job COMPLETED -> PAID is legal', () => {
      const req = dummyRequest(REQUEST_STATUS.COMPLETED, PRICING_TYPE.FIXED);
      expect(isTransitionLegal(req, REQUEST_STATUS.PAID, 'user').legal).toBe(true);
    });

    test('Free job COMPLETED -> PAID is rejected (free jobs skip PAID)', () => {
      const req = dummyRequest(REQUEST_STATUS.COMPLETED, PRICING_TYPE.FREE);
      expect(isTransitionLegal(req, REQUEST_STATUS.PAID, 'user').legal).toBe(false);
    });

    test('Free job COMPLETED -> RATED is legal (skips PAID)', () => {
      const req = dummyRequest(REQUEST_STATUS.COMPLETED, PRICING_TYPE.FREE);
      expect(isTransitionLegal(req, REQUEST_STATUS.RATED, 'user').legal).toBe(true);
    });

    test('Paid job COMPLETED -> RATED directly is rejected (must pay first)', () => {
      const req = dummyRequest(REQUEST_STATUS.COMPLETED, PRICING_TYPE.FIXED);
      expect(isTransitionLegal(req, REQUEST_STATUS.RATED, 'user').legal).toBe(false);
    });

    test('COMPLETED -> DISPUTED is legal for user, helper and admin', () => {
      const req = dummyRequest(REQUEST_STATUS.COMPLETED, PRICING_TYPE.FIXED);
      expect(isTransitionLegal(req, REQUEST_STATUS.DISPUTED, 'user').legal).toBe(true);
      expect(isTransitionLegal(req, REQUEST_STATUS.DISPUTED, 'helper').legal).toBe(true);
    });
  });

  describe('From PAID', () => {
    test('PAID -> RATED is legal for user and admin', () => {
      const req = dummyRequest(REQUEST_STATUS.PAID);
      expect(isTransitionLegal(req, REQUEST_STATUS.RATED, 'user').legal).toBe(true);
    });

    test('PAID -> DISPUTED is legal for user and helper', () => {
      const req = dummyRequest(REQUEST_STATUS.PAID);
      expect(isTransitionLegal(req, REQUEST_STATUS.DISPUTED, 'user').legal).toBe(true);
    });
  });

  describe('From DISPUTED', () => {
    test('DISPUTED -> PAID is legal for admin only', () => {
      const req = dummyRequest(REQUEST_STATUS.DISPUTED);
      expect(isTransitionLegal(req, REQUEST_STATUS.PAID, 'admin').legal).toBe(true);
      expect(isTransitionLegal(req, REQUEST_STATUS.PAID, 'user').legal).toBe(false);
      expect(isTransitionLegal(req, REQUEST_STATUS.PAID, 'helper').legal).toBe(false);
    });

    test('DISPUTED -> RATED is legal for admin only', () => {
      const req = dummyRequest(REQUEST_STATUS.DISPUTED);
      expect(isTransitionLegal(req, REQUEST_STATUS.RATED, 'admin').legal).toBe(true);
      expect(isTransitionLegal(req, REQUEST_STATUS.RATED, 'user').legal).toBe(false);
    });

    test('DISPUTED -> CANCELLED is legal for admin only', () => {
      const req = dummyRequest(REQUEST_STATUS.DISPUTED);
      expect(isTransitionLegal(req, REQUEST_STATUS.CANCELLED, 'admin').legal).toBe(true);
      expect(isTransitionLegal(req, REQUEST_STATUS.CANCELLED, 'user').legal).toBe(false);
    });
  });
});
