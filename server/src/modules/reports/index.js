import express from 'express';
import { ok } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ROLES } from '../../../../shared/constants.js';
import * as reportsService from './reports.service.js';
import { createReportSchema, resolveReportSchema } from './reports.validation.js';

export const mountPath = '/reports';
export const router = express.Router();
export const service = reportsService;

router.use(requireAuth);

/**
 * POST /api/reports
 * Customer or helper files a report on a request.
 */
router.post(
  '/',
  validate(createReportSchema),
  asyncHandler(async (req, res) => {
    const report = await reportsService.createReport(req.user, req.body);
    return ok(res, { report }, 201);
  })
);

/**
 * GET /api/reports
 * Admin lists all filed reports.
 */
router.get(
  '/',
  requireRole(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const reports = await reportsService.getReports(req.query);
    return ok(res, { reports });
  })
);

/**
 * POST /api/reports/:id/resolve
 * Admin resolves a report and transitions DISPUTED request.
 */
router.post(
  '/:id/resolve',
  requireRole(ROLES.ADMIN),
  validate(resolveReportSchema),
  asyncHandler(async (req, res) => {
    const result = await reportsService.resolveReport(
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
