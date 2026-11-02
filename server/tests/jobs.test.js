import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  User,
  ServiceRequest,
  Category,
  Message,
} from '../src/models/index.js';
import {
  REQUEST_STATUS,
  PRICING_TYPE,
  ROLES,
} from '../../shared/constants.js';
import * as jobsService from '../src/modules/jobs/jobs.service.js';
import { events, EVENT_NAMES } from '../src/modules/requests/events.js';

describe('Job Lifecycle and Chat Service Tests', () => {
  let mongoServer;
  let user1, user2, helper1, helper2, category;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Create test category
    category = await Category.create({
      name: 'Electrical Help',
      type: 'professional',
      subcategories: ['electrician'],
      active: true,
    });

    // Create test users
    user1 = await User.create({
      name: 'Alice Requester',
      email: 'alice.jobs@test.com',
      phone: '+919999900001',
      passwordHash: 'hash',
      roles: [ROLES.USER],
    });

    user2 = await User.create({
      name: 'Bob Outsider',
      email: 'bob.jobs@test.com',
      phone: '+919999900002',
      passwordHash: 'hash',
      roles: [ROLES.USER],
    });

    helper1 = await User.create({
      name: 'Charlie Assigned Helper',
      email: 'charlie.jobs@test.com',
      phone: '+919999900003',
      passwordHash: 'hash',
      roles: [ROLES.USER, ROLES.HELPER],
    });

    helper2 = await User.create({
      name: 'Dave Other Helper',
      email: 'dave.jobs@test.com',
      phone: '+919999900004',
      passwordHash: 'hash',
      roles: [ROLES.USER, ROLES.HELPER],
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  // Helper to create a request
  const createTestRequest = async (status, pricingType = PRICING_TYPE.FIXED, budget = 500) => {
    return await ServiceRequest.create({
      user: user1._id,
      helper: helper1._id,
      category: category._id,
      subcategory: 'electrician',
      description: 'Fix short circuit in living room',
      location: {
        type: 'Point',
        coordinates: [77.209, 28.6139],
        address: '123 Connaught Place, New Delhi',
      },
      asap: true,
      pricingType,
      budget,
      status,
      statusHistory: [{ status, actor: 'system' }],
    });
  };

  describe('startJob (ACCEPTED -> IN_PROGRESS)', () => {
    test('assigned helper can start an ACCEPTED job', async () => {
      const req = await createTestRequest(REQUEST_STATUS.ACCEPTED);
      const updated = await jobsService.startJob(req._id, helper1);

      expect(updated.status).toBe(REQUEST_STATUS.IN_PROGRESS);
      const inDb = await ServiceRequest.findById(req._id);
      expect(inDb.status).toBe(REQUEST_STATUS.IN_PROGRESS);
    });

    test('non-assigned helper cannot start the job', async () => {
      const req = await createTestRequest(REQUEST_STATUS.ACCEPTED);
      await expect(jobsService.startJob(req._id, helper2)).rejects.toThrow(
        /Only the assigned helper/
      );
    });

    test('requester cannot start the job', async () => {
      const req = await createTestRequest(REQUEST_STATUS.ACCEPTED);
      await expect(jobsService.startJob(req._id, user1)).rejects.toThrow(
        /Only the assigned helper/
      );
    });

    test('cannot start job if status is not ACCEPTED (e.g. POSTED)', async () => {
      const req = await createTestRequest(REQUEST_STATUS.POSTED);
      await expect(jobsService.startJob(req._id, helper1)).rejects.toThrow(
        /Job cannot be started from.*status/i
      );
    });
  });

  describe('completeJob (IN_PROGRESS -> COMPLETED)', () => {
    test('assigned helper can complete paid job with finalAmount', async () => {
      const req = await createTestRequest(REQUEST_STATUS.IN_PROGRESS, PRICING_TYPE.FIXED, 600);
      const updated = await jobsService.completeJob(req._id, helper1, { finalAmount: 650 });

      expect(updated.status).toBe(REQUEST_STATUS.COMPLETED);
      const inDb = await ServiceRequest.findById(req._id);
      expect(inDb.status).toBe(REQUEST_STATUS.COMPLETED);
      expect(inDb.finalAmount).toBe(650);
    });

    test('paid job requires finalAmount > 0', async () => {
      const req = await createTestRequest(REQUEST_STATUS.IN_PROGRESS, PRICING_TYPE.FIXED, 500);
      await expect(
        jobsService.completeJob(req._id, helper1, { finalAmount: 0 })
      ).rejects.toThrow(/Final amount is required/);

      await expect(
        jobsService.completeJob(req._id, helper1, {})
      ).rejects.toThrow(/Final amount is required/);
    });

    test('free community job completes without requiring finalAmount', async () => {
      const req = await createTestRequest(REQUEST_STATUS.IN_PROGRESS, PRICING_TYPE.FREE, 0);
      const updated = await jobsService.completeJob(req._id, helper1);

      expect(updated.status).toBe(REQUEST_STATUS.COMPLETED);
      const inDb = await ServiceRequest.findById(req._id);
      expect(inDb.finalAmount).toBe(0);
    });

    test('non-assigned helper cannot complete job', async () => {
      const req = await createTestRequest(REQUEST_STATUS.IN_PROGRESS, PRICING_TYPE.FIXED, 500);
      await expect(
        jobsService.completeJob(req._id, helper2, { finalAmount: 500 })
      ).rejects.toThrow(/Only the assigned helper/);
    });

    test('cannot complete job if not in IN_PROGRESS status', async () => {
      const req = await createTestRequest(REQUEST_STATUS.ACCEPTED, PRICING_TYPE.FIXED, 500);
      await expect(
        jobsService.completeJob(req._id, helper1, { finalAmount: 500 })
      ).rejects.toThrow(/Job cannot be completed from.*status/i);
    });
  });

  describe('Chat and Direct Messages', () => {
    test('chat is blocked before acceptance (e.g. POSTED)', async () => {
      const req = await createTestRequest(REQUEST_STATUS.POSTED);
      await expect(jobsService.getMessages(req._id, user1)).rejects.toThrow(
        /Chat is only accessible once an offer has been accepted/
      );
      await expect(
        jobsService.sendMessage(req._id, user1, 'Hello!')
      ).rejects.toThrow(/chat is only active while status is between ACCEPTED and PAID/);
    });

    test('both requester and assigned helper can exchange messages when ACCEPTED', async () => {
      const req = await createTestRequest(REQUEST_STATUS.ACCEPTED);

      let eventEmitted = false;
      const listener = (msg) => {
        if (msg.request.toString() === req._id.toString()) {
          eventEmitted = true;
        }
      };
      events.on(EVENT_NAMES.MESSAGE_CREATED, listener);

      // User sends message
      const msg1 = await jobsService.sendMessage(
        req._id,
        user1,
        'Hi Charlie, what time will you arrive?'
      );
      expect(msg1.text).toBe('Hi Charlie, what time will you arrive?');
      expect(msg1.sender._id.toString()).toBe(user1._id.toString());
      expect(eventEmitted).toBe(true);

      // Helper sends message
      const msg2 = await jobsService.sendMessage(
        req._id,
        helper1,
        'I am 10 minutes away, arriving shortly!'
      );
      expect(msg2.text).toBe('I am 10 minutes away, arriving shortly!');

      // Both can read message thread
      const userThread = await jobsService.getMessages(req._id, user1);
      const helperThread = await jobsService.getMessages(req._id, helper1);

      expect(userThread.length).toBe(2);
      expect(helperThread.length).toBe(2);
      expect(userThread[0].text).toBe('Hi Charlie, what time will you arrive?');
      expect(userThread[1].text).toBe('I am 10 minutes away, arriving shortly!');

      events.off(EVENT_NAMES.MESSAGE_CREATED, listener);
    });

    test('third party cannot access messages or send messages', async () => {
      const req = await createTestRequest(REQUEST_STATUS.ACCEPTED);
      await expect(jobsService.getMessages(req._id, user2)).rejects.toThrow(
        /Access denied/
      );
      await expect(
        jobsService.sendMessage(req._id, user2, 'Can I join this chat?')
      ).rejects.toThrow(/Access denied/);
    });

    test('empty messages or messages over 1000 characters are rejected', async () => {
      const req = await createTestRequest(REQUEST_STATUS.IN_PROGRESS);

      await expect(jobsService.sendMessage(req._id, user1, '   ')).rejects.toThrow(
        /Message cannot be empty/
      );

      const hugeText = 'a'.repeat(1001);
      await expect(jobsService.sendMessage(req._id, user1, hugeText)).rejects.toThrow(
        /exceeds maximum limit of 1000 characters/
      );
    });
  });

  describe('getHelperJobs', () => {
    test('returns active and past jobs for the helper', async () => {
      const result = await jobsService.getHelperJobs(helper1);
      expect(result).toHaveProperty('jobs');
      expect(result).toHaveProperty('activeJobs');
      expect(result).toHaveProperty('pastJobs');
      expect(result.jobs.length).toBeGreaterThan(0);
    });
  });
});
