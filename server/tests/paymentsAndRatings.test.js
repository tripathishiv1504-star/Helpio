import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  User,
  HelperProfile,
  ServiceRequest,
  Category,
  Payment,
  Rating,
  Setting,
} from '../src/models/index.js';
import {
  REQUEST_STATUS,
  PRICING_TYPE,
  PAYMENT_STATUS,
  VERIFICATION_STATUS,
  ROLES,
} from '../../shared/constants.js';
import * as paymentsService from '../src/modules/payments/payments.service.js';
import * as ratingsService from '../src/modules/ratings/ratings.service.js';

describe('Part 8 — Payments, Commission, and Ratings Tests', () => {
  let mongoServer;
  let user1, helper1, helperProfile1, category;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Configure 10% commission
    await Setting.create({
      key: 'commissionPercent',
      value: 10,
    });

    category = await Category.create({
      name: 'Home Services',
      type: 'professional',
      subcategories: ['plumber'],
      active: true,
    });

    user1 = await User.create({
      name: 'Requester Rachel',
      email: 'rachel@test.com',
      phone: '+919999900010',
      passwordHash: 'hash',
      roles: [ROLES.USER],
    });

    helper1 = await User.create({
      name: 'Helper Henry',
      email: 'henry@test.com',
      phone: '+919999900020',
      passwordHash: 'hash',
      roles: [ROLES.USER, ROLES.HELPER],
    });

    helperProfile1 = await HelperProfile.create({
      user: helper1._id,
      bio: 'Professional plumber with 5 years experience',
      skills: [{ category: category._id, subcategory: 'plumber', rate: 500, rateType: 'fixed' }],
      location: { type: 'Point', coordinates: [77.2, 28.6] },
      radiusKm: 15,
      isOnline: true,
      verificationStatus: VERIFICATION_STATUS.APPROVED,
      stats: { ratingAvg: 0, ratingCount: 0, completed: 0, accepted: 0, offered: 0 },
      earningsTotal: 0,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  const createRequest = async (pricingType, status, finalAmount = 500) => {
    return await ServiceRequest.create({
      user: user1._id,
      helper: helper1._id,
      category: category._id,
      subcategory: 'plumber',
      description: 'Fix bathroom pipe leak',
      location: {
        type: 'Point',
        coordinates: [77.2, 28.6],
        address: '45 Green Park, New Delhi',
      },
      asap: true,
      pricingType,
      budget: finalAmount,
      finalAmount,
      status,
      statusHistory: [{ status, actor: 'system' }],
    });
  };

  describe('Payments & Commission Calculation', () => {
    test('a ₹500 job at 10% pays out ₹450 and keeps ₹50', async () => {
      const req = await createRequest(PRICING_TYPE.FIXED, REQUEST_STATUS.COMPLETED, 500);

      const initialEarnings = (await HelperProfile.findById(helperProfile1._id)).earningsTotal;
      expect(initialEarnings).toBe(0);

      const result = await paymentsService.payRequest(req._id, user1);

      expect(result.payment.amount).toBe(500);
      expect(result.payment.platformFee).toBe(50);
      expect(result.payment.helperPayout).toBe(450);
      expect(result.payment.status).toBe(PAYMENT_STATUS.PAID);
      expect(result.request.status).toBe(REQUEST_STATUS.PAID);

      // Verify HelperProfile.earningsTotal incremented by 450
      const updatedProfile = await HelperProfile.findById(helperProfile1._id);
      expect(updatedProfile.earningsTotal).toBe(450);
    });

    test('a free community job rejects payment processing', async () => {
      const req = await createRequest(PRICING_TYPE.FREE, REQUEST_STATUS.COMPLETED, 0);

      await expect(paymentsService.payRequest(req._id, user1)).rejects.toThrow(
        /Free community help requests do not require payment/
      );
    });

    test('non-owner cannot pay for request', async () => {
      const req = await createRequest(PRICING_TYPE.FIXED, REQUEST_STATUS.COMPLETED, 300);

      await expect(paymentsService.payRequest(req._id, helper1)).rejects.toThrow(
        /Only the request owner/
      );
    });

    test('cannot pay if request is not in COMPLETED status', async () => {
      const req = await createRequest(PRICING_TYPE.FIXED, REQUEST_STATUS.IN_PROGRESS, 500);

      await expect(paymentsService.payRequest(req._id, user1)).rejects.toThrow(
        /Payment can only be made for requests in COMPLETED status/
      );
    });
  });

  describe('Ratings & Review Aggregation', () => {
    test('rating updates helper average and count incrementally (first rating: 5 stars)', async () => {
      // Create request in PAID status
      const req1 = await createRequest(PRICING_TYPE.FIXED, REQUEST_STATUS.PAID, 500);

      const result = await ratingsService.createRating(req1._id, user1, {
        stars: 5,
        comment: 'Excellent plumbing work, very punctual!',
      });

      expect(result.rating.stars).toBe(5);
      expect(result.request.status).toBe(REQUEST_STATUS.RATED);

      // Verify HelperProfile stats updated
      const profileAfter1 = await HelperProfile.findById(helperProfile1._id);
      expect(profileAfter1.stats.ratingCount).toBe(1);
      expect(profileAfter1.stats.ratingAvg).toBe(5.0);
    });

    test('second job rated 4 stars updates average to 4.5', async () => {
      const req2 = await createRequest(PRICING_TYPE.FIXED, REQUEST_STATUS.PAID, 400);

      const result = await ratingsService.createRating(req2._id, user1, {
        stars: 4,
        comment: 'Good work, arrived on time.',
      });

      expect(result.rating.stars).toBe(4);

      // Average of 5 and 4 should be 4.5
      const profileAfter2 = await HelperProfile.findById(helperProfile1._id);
      expect(profileAfter2.stats.ratingCount).toBe(2);
      expect(profileAfter2.stats.ratingAvg).toBe(4.5);
    });

    test('free community job allows rating directly from COMPLETED to RATED', async () => {
      const freeReq = await createRequest(PRICING_TYPE.FREE, REQUEST_STATUS.COMPLETED, 0);

      const result = await ratingsService.createRating(freeReq._id, user1, {
        stars: 5,
        comment: 'Thank you for helping our community!',
      });

      expect(result.request.status).toBe(REQUEST_STATUS.RATED);
    });

    test('rating the same request twice from the same user is rejected', async () => {
      const req3 = await createRequest(PRICING_TYPE.FIXED, REQUEST_STATUS.PAID, 500);
      await ratingsService.createRating(req3._id, user1, { stars: 5, comment: 'Great!' });

      await expect(
        ratingsService.createRating(req3._id, user1, { stars: 4, comment: 'Changing mind' })
      ).rejects.toThrow(/already submitted a rating/);
    });

    test('helper rating customer does not change request status', async () => {
      const req4 = await createRequest(PRICING_TYPE.FIXED, REQUEST_STATUS.COMPLETED, 500);

      const result = await ratingsService.createRating(req4._id, helper1, {
        stars: 5,
        comment: 'Courteous customer, clear instructions.',
      });

      expect((result.rating.to._id || result.rating.to).toString()).toBe(user1._id.toString());
      // Status remains COMPLETED
      expect(result.request.status).toBe(REQUEST_STATUS.COMPLETED);
    });
  });
});
