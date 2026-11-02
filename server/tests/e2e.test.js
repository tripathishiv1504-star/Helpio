import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app, { modulesLoadedPromise } from '../src/app.js';
import { env } from '../src/config/env.js';
import {
  User,
  HelperProfile,
  ServiceRequest,
  Category,
  Offer,
  Payment,
  Rating,
  Notification,
  Setting,
} from '../src/models/index.js';
import {
  REQUEST_STATUS,
  OFFER_STATUS,
  PAYMENT_STATUS,
  VERIFICATION_STATUS,
  ROLES,
  PRICING_TYPE,
} from '../../shared/constants.js';
import * as matchingService from '../src/modules/matching/matching.service.js';

describe('Part 10 — Full End-to-End System Tests', () => {
  let mongoServer;
  let adminToken;
  let category;

  beforeAll(async () => {
    // 1. Ensure all Express modules are dynamically loaded
    await modulesLoadedPromise;

    // 2. Start fresh isolated MongoDB Memory instance
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // 3. Configure platform default commission = 10%
    await Setting.create({
      key: 'commissionPercent',
      value: 10,
    });

    // 4. Create standard test Category
    category = await Category.create({
      name: 'Electrical Help',
      type: 'professional',
      subcategories: ['electrician'],
      active: true,
    });

    // 5. Create Admin user & JWT token
    const adminUser = await User.create({
      name: 'Platform Admin',
      email: 'admin.e2e@helpio.local',
      phone: '+919999900000',
      passwordHash: 'hash',
      roles: [ROLES.USER, ROLES.ADMIN],
      status: 'active',
    });

    adminToken = jwt.sign(
      { id: adminUser._id.toString(), roles: adminUser.roles },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  test('Full Happy Path Lifecycle: Register -> Onboard -> Approve -> Online -> Post -> Accept -> Chat -> Start -> Complete -> Pay -> Rate -> RATED', async () => {
    // --- Step 1: Register Customer ---
    const custRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Cust Clara',
        email: 'clara.e2e@test.com',
        phone: '+919876543210',
        password: 'Password123!',
        wantsToHelp: false,
      });

    expect(custRes.status).toBe(201);
    expect(custRes.body.success).toBe(true);
    const custToken = custRes.body.data.token;
    const custUser = custRes.body.data.user;

    // --- Step 2: Register Helper ---
    const helperRegRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Helper Hans',
        email: 'hans.e2e@test.com',
        phone: '+919876543211',
        password: 'Password123!',
        wantsToHelp: true,
      });

    expect(helperRegRes.status).toBe(201);
    const helperToken = helperRegRes.body.data.token;
    const helperUser = helperRegRes.body.data.user;

    // --- Step 3: Helper Completes Onboarding ---
    const onboardRes = await request(app)
      .post('/api/helpers/onboard')
      .set('Authorization', `Bearer ${helperToken}`)
      .send({
        bio: 'Certified electrician with 8 years experience',
        skills: [
          {
            category: category._id.toString(),
            subcategory: 'electrician',
            rate: 500,
            rateType: 'fixed',
          },
        ],
        location: {
          lat: 28.6139,
          lng: 77.209,
          address: 'Connaught Place, New Delhi',
        },
        radiusKm: 15,
        weeklyAvailability: [{ day: 'monday', start: '09:00', end: '18:00' }],
      });

    expect(onboardRes.status).toBe(201);
    const helperProfile = onboardRes.body.data.profile;
    expect(helperProfile.verificationStatus).toBe(VERIFICATION_STATUS.PENDING);

    // Verify unapproved helper cannot toggle online
    const onlineFail = await request(app)
      .patch('/api/helpers/me/online')
      .set('Authorization', `Bearer ${helperToken}`)
      .send({ isOnline: true });
    expect(onlineFail.status).toBe(400);

    // --- Step 4: Admin Approves Helper ---
    const approveRes = await request(app)
      .patch(`/api/admin/helpers/${helperProfile._id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        verificationStatus: VERIFICATION_STATUS.APPROVED,
        note: 'ID verification passed.',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.helper.verificationStatus).toBe(
      VERIFICATION_STATUS.APPROVED
    );

    // --- Step 5: Helper Goes Online ---
    const onlineSuccess = await request(app)
      .patch('/api/helpers/me/online')
      .set('Authorization', `Bearer ${helperToken}`)
      .send({ isOnline: true });

    expect(onlineSuccess.status).toBe(200);
    expect(onlineSuccess.body.data.isOnline).toBe(true);

    // --- Step 6: User Posts Service Request ---
    const postReqRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${custToken}`)
      .send({
        category: category._id.toString(),
        subcategory: 'electrician',
        description: 'Short circuit repair in main electrical switchboard',
        location: {
          lat: 28.614,
          lng: 77.2095,
          address: 'Inner Circle, CP, New Delhi',
        },
        asap: true,
        urgency: 'normal',
        pricingType: 'fixed',
        budget: 500,
      });

    expect(postReqRes.status).toBe(201);
    const serviceReq = postReqRes.body.data.request;
    expect(serviceReq._id).toBeDefined();

    // Allow event listener to process matching
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Request should now be in OFFERED status
    const reqAfterOffer = await ServiceRequest.findById(serviceReq._id);
    expect(reqAfterOffer.status).toBe(REQUEST_STATUS.OFFERED);

    // --- Step 7: Helper Checks Offers and Accepts ---
    const offersRes = await request(app)
      .get('/api/offers')
      .set('Authorization', `Bearer ${helperToken}`);

    expect(offersRes.status).toBe(200);
    expect(offersRes.body.data.offers.length).toBeGreaterThan(0);
    const myOffer = offersRes.body.data.offers.find(
      (o) => o.request?._id?.toString() === serviceReq._id.toString()
    );
    expect(myOffer).toBeDefined();

    // Helper accepts offer
    const acceptRes = await request(app)
      .post(`/api/offers/${myOffer._id}/accept`)
      .set('Authorization', `Bearer ${helperToken}`);

    expect(acceptRes.status).toBe(200);

    const reqAfterAccept = await ServiceRequest.findById(serviceReq._id);
    expect(reqAfterAccept.status).toBe(REQUEST_STATUS.ACCEPTED);
    expect(reqAfterAccept.helper.toString()).toBe((helperUser.id || helperUser._id).toString());

    // --- Step 8: Verify Customer Notification Received ---
    const notifsRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${custToken}`);

    expect(notifsRes.status).toBe(200);
    expect(notifsRes.body.data.notifications.length).toBeGreaterThan(0);
    const acceptedNotif = notifsRes.body.data.notifications.find(
      (n) => n.type === 'status:accepted'
    );
    expect(acceptedNotif).toBeDefined();

    // --- Step 9: Bidirectional Direct Chat ---
    // User sends chat
    const userMsgRes = await request(app)
      .post(`/api/jobs/${serviceReq._id}/messages`)
      .set('Authorization', `Bearer ${custToken}`)
      .send({ text: 'Hello Hans, what is your estimated arrival time?' });
    expect(userMsgRes.status).toBe(201);

    // Helper sends reply
    const helperMsgRes = await request(app)
      .post(`/api/jobs/${serviceReq._id}/messages`)
      .set('Authorization', `Bearer ${helperToken}`)
      .send({ text: 'I am on my way, arriving in 10 minutes.' });
    expect(helperMsgRes.status).toBe(201);

    // Get message thread
    const threadRes = await request(app)
      .get(`/api/jobs/${serviceReq._id}/messages`)
      .set('Authorization', `Bearer ${custToken}`);
    expect(threadRes.status).toBe(200);
    expect(threadRes.body.data.messages.length).toBe(2);

    // --- Step 10: Helper Starts Job ---
    const startRes = await request(app)
      .post(`/api/jobs/${serviceReq._id}/start`)
      .set('Authorization', `Bearer ${helperToken}`);

    expect(startRes.status).toBe(200);
    const reqInProgress = await ServiceRequest.findById(serviceReq._id);
    expect(reqInProgress.status).toBe(REQUEST_STATUS.IN_PROGRESS);

    // --- Step 11: Helper Completes Job ---
    const completeRes = await request(app)
      .post(`/api/jobs/${serviceReq._id}/complete`)
      .set('Authorization', `Bearer ${helperToken}`)
      .send({ finalAmount: 500 });

    expect(completeRes.status).toBe(200);
    const reqCompleted = await ServiceRequest.findById(serviceReq._id);
    expect(reqCompleted.status).toBe(REQUEST_STATUS.COMPLETED);
    expect(reqCompleted.finalAmount).toBe(500);

    // --- Step 12: Customer Pays (₹500 -> 10% fee = ₹50, payout = ₹450) ---
    const payRes = await request(app)
      .post(`/api/payments/${serviceReq._id}/pay`)
      .set('Authorization', `Bearer ${custToken}`);

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.payment.amount).toBe(500);
    expect(payRes.body.data.payment.platformFee).toBe(50);
    expect(payRes.body.data.payment.helperPayout).toBe(450);
    expect(payRes.body.data.payment.status).toBe(PAYMENT_STATUS.PAID);

    const reqPaid = await ServiceRequest.findById(serviceReq._id);
    expect(reqPaid.status).toBe(REQUEST_STATUS.PAID);

    // Helper earnings incremented
    const updatedHelperProfile = await HelperProfile.findById(
      helperProfile._id
    );
    expect(updatedHelperProfile.earningsTotal).toBe(450);

    // --- Step 13: Customer Rates Helper (5 Stars) -> Moves to RATED ---
    const custRateRes = await request(app)
      .post(`/api/ratings/${serviceReq._id}`)
      .set('Authorization', `Bearer ${custToken}`)
      .send({
        stars: 5,
        comment: 'Outstanding electrician work! Very safe and polite.',
      });

    expect(custRateRes.status).toBe(201);
    const reqRated = await ServiceRequest.findById(serviceReq._id);
    expect(reqRated.status).toBe(REQUEST_STATUS.RATED);

    // Helper rating stats updated
    const ratedHelperProfile = await HelperProfile.findById(helperProfile._id);
    expect(ratedHelperProfile.stats.ratingCount).toBe(1);
    expect(ratedHelperProfile.stats.ratingAvg).toBe(5.0);

    // --- Step 14: Helper Rates Customer (5 Stars) -> Status Remains RATED ---
    const helperRateRes = await request(app)
      .post(`/api/ratings/${serviceReq._id}`)
      .set('Authorization', `Bearer ${helperToken}`)
      .send({
        stars: 5,
        comment: 'Great customer, quick payment!',
      });

    expect(helperRateRes.status).toBe(201);
    const finalReq = await ServiceRequest.findById(serviceReq._id);
    expect(finalReq.status).toBe(REQUEST_STATUS.RATED);
  });

  test('Second Flow: Reject Offer -> Expiry Check -> Radius Widening -> EXPIRED', async () => {
    // 1. Create a customer
    const custRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Cust Derek',
        email: 'derek.e2e@test.com',
        phone: '+919876543222',
        password: 'Password123!',
      });
    const custToken = custRes.body.data.token;

    // 2. Customer posts a request
    const postRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${custToken}`)
      .send({
        category: category._id.toString(),
        subcategory: 'electrician',
        description: 'Need help installing ceiling fan',
        location: {
          lat: 28.614,
          lng: 77.2095,
          address: 'Connaught Place, New Delhi',
        },
        asap: true,
        urgency: 'normal',
        pricingType: 'fixed',
        budget: 400,
      });

    const reqId = postRes.body.data.request._id;

    // Allow event listener to generate offers
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 3. Find created offer
    const offers = await Offer.find({ request: reqId });
    expect(offers.length).toBeGreaterThan(0);

    // 4. Reject all existing offers
    for (const o of offers) {
      o.status = OFFER_STATUS.REJECTED;
      await o.save();
    }

    // 5. Run expiry check worker (should widen once)
    await matchingService.runExpiryCheck();
    const reqAfterFirstCheck = await ServiceRequest.findById(reqId);
    expect(reqAfterFirstCheck.searchRadiusKm).toBe(15); // 10 * 1.5

    // Reject any new widened offers or expire them
    await Offer.updateMany(
      { request: reqId },
      { status: OFFER_STATUS.EXPIRED }
    );

    // 6. Run expiry check worker again (already widened, should transition to EXPIRED)
    await matchingService.runExpiryCheck();

    const finalReq = await ServiceRequest.findById(reqId);
    expect(finalReq.status).toBe(REQUEST_STATUS.EXPIRED);

    // 7. Customer receives notification of expiry
    const derekUserId = custRes.body.data.user.id || custRes.body.data.user._id;
    const notifs = await Notification.find({
      user: derekUserId,
      type: 'status:expired',
    });
    expect(notifs.length).toBeGreaterThan(0);
  });
});
