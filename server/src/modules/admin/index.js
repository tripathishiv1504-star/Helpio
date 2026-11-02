import express from 'express';
import { ok } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ROLES } from '../../../../shared/constants.js';
import * as adminService from './admin.service.js';
import {
  verifyHelperSchema,
  createCategorySchema,
  updateCategorySchema,
  updateSettingsSchema,
  updateUserStatusSchema,
} from './admin.validation.js';
import { resolveReportSchema } from '../reports/reports.validation.js';

export const mountPath = '/admin';
export const router = express.Router();
export const service = adminService;

// All admin endpoints require authentication and the ADMIN role
router.use(requireAuth);
router.use(requireRole(ROLES.ADMIN));

/**
 * GET /api/admin/stats
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const stats = await adminService.getStats();
    return ok(res, stats);
  })
);

/**
 * GET /api/admin/users
 */
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const users = await adminService.getUsers(req.query);
    return ok(res, { users });
  })
);

/**
 * PATCH /api/admin/users/:id/status
 */
router.patch(
  '/users/:id/status',
  validate(updateUserStatusSchema),
  asyncHandler(async (req, res) => {
    const user = await adminService.updateUserStatus(
      req.params.id,
      req.body.status
    );
    return ok(res, { user });
  })
);

/**
 * GET /api/admin/helpers
 */
router.get(
  '/helpers',
  asyncHandler(async (req, res) => {
    const helpers = await adminService.getHelpers(req.query);
    return ok(res, { helpers });
  })
);

/**
 * PATCH /api/admin/helpers/:id/verify
 */
router.patch(
  '/helpers/:id/verify',
  validate(verifyHelperSchema),
  asyncHandler(async (req, res) => {
    const helper = await adminService.verifyHelper(
      req.params.id,
      req.body
    );
    return ok(res, { helper });
  })
);

/**
 * GET /api/admin/categories
 */
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const categories = await adminService.getCategories();
    return ok(res, { categories });
  })
);

/**
 * POST /api/admin/categories
 */
router.post(
  '/categories',
  validate(createCategorySchema),
  asyncHandler(async (req, res) => {
    const category = await adminService.createCategory(req.body);
    return ok(res, { category }, 201);
  })
);

/**
 * PATCH /api/admin/categories/:id
 */
router.patch(
  '/categories/:id',
  validate(updateCategorySchema),
  asyncHandler(async (req, res) => {
    const category = await adminService.updateCategory(
      req.params.id,
      req.body
    );
    return ok(res, { category });
  })
);

/**
 * GET /api/admin/requests
 */
router.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const requests = await adminService.getRequests(req.query);
    return ok(res, { requests });
  })
);

/**
 * GET /api/admin/payments
 */
router.get(
  '/payments',
  asyncHandler(async (req, res) => {
    const payments = await adminService.getPayments();
    return ok(res, { payments });
  })
);

/**
 * GET /api/admin/settings
 */
router.get(
  '/settings',
  asyncHandler(async (req, res) => {
    const settings = await adminService.getSettings();
    return ok(res, settings);
  })
);

/**
 * PATCH /api/admin/settings
 */
router.patch(
  '/settings',
  validate(updateSettingsSchema),
  asyncHandler(async (req, res) => {
    const settings = await adminService.updateSettings(req.body);
    return ok(res, settings);
  })
);

/**
 * GET /api/admin/reports
 */
router.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const reports = await adminService.getReports(req.query);
    return ok(res, { reports });
  })
);

/**
 * POST /api/admin/reports/:id/resolve
 */
router.post(
  '/reports/:id/resolve',
  validate(resolveReportSchema),
  asyncHandler(async (req, res) => {
    const result = await adminService.resolveReport(
      req.params.id,
      req.user,
      req.body
    );
    return ok(res, result);
  })
);

export default {
  mountPath,
  router,
  service,
};
