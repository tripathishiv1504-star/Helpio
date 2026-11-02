import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  User,
  HelperProfile,
  ServiceRequest,
  Category,
  Report,
  Setting,
} from '../src/models/index.js';
import {
  REQUEST_STATUS,
  REPORT_STATUS,
  PRICING_TYPE,
  VERIFICATION_STATUS,
  ROLES,
} from '../../shared/constants.js';
import * as adminService from '../src/modules/admin/admin.service.js';
import * as reportsService from '../src/modules/reports/reports.service.js';

describe('Part 9 — Admin Panel, Reports, and Disputes Tests', () => {
  let mongoServer;
  let adminUser, normalUser, helperUser, helperProfile, category;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    adminUser = await User.create({
      name: 'System Admin',
      email: 'admin.test@helpio.local',
      phone: '+919999911111',
      passwordHash: 'hash',
      roles: [ROLES.USER, ROLES.ADMIN],
    });

    normalUser = await User.create({
      name: 'Customer Cathy',
      email: 'cathy@test.com',
      phone: '+919999911112',
      passwordHash: 'hash',
      roles: [ROLES.USER],
    });

    helperUser = await User.create({
      name: 'Helper Harry',
      email: 'harry@test.com',
      phone: '+919999911113',
      passwordHash: 'hash',
      roles: [ROLES.USER, ROLES.HELPER],
    });

    category = await Category.create({
      name: 'Maintenance',
      type: 'professional',
      subcategories: ['carpenter'],
      active: true,
    });

    helperProfile = await HelperProfile.create({
      user: helperUser._id,
      bio: 'Skilled carpenter',
      skills: [{ category: category._id, subcategory: 'carpenter', rate: 400, rateType: 'fixed' }],
      location: { type: 'Point', coordinates: [77.2, 28.6] },
      radiusKm: 10,
      isOnline: false,
      verificationStatus: VERIFICATION_STATUS.PENDING,
      stats: { ratingAvg: 3.5, ratingCount: 0, completed: 0, accepted: 0, offered: 0 },
      earningsTotal: 0,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  describe('Helper Verification by Admin', () => {
    test('admin approves pending helper with a note', async () => {
      expect(helperProfile.verificationStatus).toBe(VERIFICATION_STATUS.PENDING);

      const updated = await adminService.verifyHelper(helperProfile._id, {
        verificationStatus: VERIFICATION_STATUS.APPROVED,
        note: 'ID documents verified and approved.',
      });

      expect(updated.verificationStatus).toBe(VERIFICATION_STATUS.APPROVED);
      expect(updated.verificationNote).toBe('ID documents verified and approved.');

      const inDb = await HelperProfile.findById(helperProfile._id);
      expect(inDb.verificationStatus).toBe(VERIFICATION_STATUS.APPROVED);
    });

    test('admin rejects helper and forces offline', async () => {
      // Temporarily mark online
      await HelperProfile.findByIdAndUpdate(helperProfile._id, { isOnline: true });

      const updated = await adminService.verifyHelper(helperProfile._id, {
        verificationStatus: VERIFICATION_STATUS.REJECTED,
        note: 'Failed background check.',
      });

      expect(updated.verificationStatus).toBe(VERIFICATION_STATUS.REJECTED);
      expect(updated.isOnline).toBe(false);
    });
  });

  describe('Commission Settings Management', () => {
    test('admin can read and change commission percentage', async () => {
      const initial = await adminService.getSettings();
      expect(initial.commissionPercent).toBeDefined();

      const updated = await adminService.updateSettings({ commissionPercent: 15 });
      expect(updated.commissionPercent).toBe(15);

      const refreshed = await adminService.getSettings();
      expect(refreshed.commissionPercent).toBe(15);
    });
  });

  describe('Disputes and Reports', () => {
    const createReq = async (status) => {
      return await ServiceRequest.create({
        user: normalUser._id,
        helper: helperUser._id,
        category: category._id,
        subcategory: 'carpenter',
        description: 'Fix wooden table leg',
        location: {
          type: 'Point',
          coordinates: [77.2, 28.6],
          address: '77 Defence Colony, New Delhi',
        },
        asap: true,
        pricingType: PRICING_TYPE.FIXED,
        budget: 500,
        finalAmount: 500,
        status,
        statusHistory: [{ status, actor: 'system' }],
      });
    };

    test('filing a report on a COMPLETED request moves status to DISPUTED', async () => {
      const req = await createReq(REQUEST_STATUS.COMPLETED);

      const report = await reportsService.createReport(normalUser, {
        requestId: req._id.toString(),
        reason: 'Work was incomplete and table leg is still loose.',
      });

      expect(report.status).toBe(REPORT_STATUS.OPEN);
      expect(report.filedBy._id.toString()).toBe(normalUser._id.toString());
      expect(report.against._id.toString()).toBe(helperUser._id.toString());

      const inDbReq = await ServiceRequest.findById(req._id);
      expect(inDbReq.status).toBe(REQUEST_STATUS.DISPUTED);
    });

    test('filing a report on a PAID request moves status to DISPUTED', async () => {
      const req = await createReq(REQUEST_STATUS.PAID);

      const report = await reportsService.createReport(normalUser, {
        requestId: req._id.toString(),
        reason: 'Payment taken but helper left mess behind.',
      });

      expect(report.status).toBe(REPORT_STATUS.OPEN);

      const inDbReq = await ServiceRequest.findById(req._id);
      expect(inDbReq.status).toBe(REQUEST_STATUS.DISPUTED);
    });

    test('admin can resolve a dispute into CANCELLED', async () => {
      const req = await createReq(REQUEST_STATUS.COMPLETED);
      const report = await reportsService.createReport(normalUser, {
        requestId: req._id.toString(),
        reason: 'Helper did not show up.',
      });

      const resolved = await reportsService.resolveReport(report._id, adminUser, {
        targetStatus: REQUEST_STATUS.CANCELLED,
        resolution: 'Customer complaint verified. Service cancelled and refund initiated.',
      });

      expect(resolved.report.status).toBe(REPORT_STATUS.RESOLVED);
      expect(resolved.report.resolution).toContain('Customer complaint verified');

      const inDbReq = await ServiceRequest.findById(req._id);
      expect(inDbReq.status).toBe(REQUEST_STATUS.CANCELLED);
    });

    test('admin can resolve a dispute into PAID', async () => {
      const req = await createReq(REQUEST_STATUS.COMPLETED);
      const report = await reportsService.createReport(helperUser, {
        requestId: req._id.toString(),
        reason: 'Customer refusing to pay after work completed.',
      });

      const resolved = await reportsService.resolveReport(report._id, adminUser, {
        targetStatus: REQUEST_STATUS.PAID,
        resolution: 'Helper proof of completion verified. Disbursing payment to helper.',
      });

      expect(resolved.report.status).toBe(REPORT_STATUS.RESOLVED);

      const inDbReq = await ServiceRequest.findById(req._id);
      expect(inDbReq.status).toBe(REQUEST_STATUS.PAID);
    });

    test('unauthorized third-party cannot file a report', async () => {
      const outsider = await User.create({
        name: 'Outsider Oliver',
        email: 'oliver@test.com',
        phone: '+919999911199',
        passwordHash: 'hash',
        roles: [ROLES.USER],
      });

      const req = await createReq(REQUEST_STATUS.COMPLETED);
      await expect(
        reportsService.createReport(outsider, {
          requestId: req._id.toString(),
          reason: 'I am not related to this job',
        })
      ).rejects.toThrow(/Only the request owner or assigned helper/);
    });
  });

  describe('Categories Management by Admin', () => {
    test('admin can create and update a category', async () => {
      const newCat = await adminService.createCategory({
        name: 'Plumbing & Sanitation',
        type: 'professional',
        subcategories: ['drainage', 'tap repair'],
        active: true,
      });

      expect(newCat.name).toBe('Plumbing & Sanitation');

      const updated = await adminService.updateCategory(newCat._id, {
        active: false,
      });
      expect(updated.active).toBe(false);
    });
  });
});
