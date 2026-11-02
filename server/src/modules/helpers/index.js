import express from 'express';
import { ok } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ROLES } from '../../../../shared/constants.js';
import {
  onboardSchema,
  updateProfileSchema,
  availabilitySchema,
  onlineSchema,
} from './helpers.validation.js';
import * as helpersService from './helpers.service.js';

export const mountPath = '/helpers';
export const router = express.Router();
export const service = helpersService;

// All helper routes require the helper role
router.use(requireAuth, requireRole(ROLES.HELPER));

// POST /api/helpers/onboard
router.post(
  '/onboard',
  validate(onboardSchema),
  asyncHandler(async (req, res) => {
    const profile = await helpersService.onboardHelper(req.user.id, req.body);
    return ok(res, { profile }, 201);
  })
);

// GET /api/helpers/me
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const profile = await helpersService.getHelperProfile(req.user.id);
    return ok(res, { profile });
  })
);

// PATCH /api/helpers/me
router.patch(
  '/me',
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const updated = await helpersService.updateProfile(req.user.id, req.body);
    return ok(res, { profile: updated });
  })
);

// PATCH /api/helpers/me/availability
router.patch(
  '/me/availability',
  validate(availabilitySchema),
  asyncHandler(async (req, res) => {
    const updated = await helpersService.updateAvailability(
      req.user.id,
      req.body.weeklyAvailability
    );
    return ok(res, { profile: updated });
  })
);

// PATCH /api/helpers/me/online
router.patch(
  '/me/online',
  validate(onlineSchema),
  asyncHandler(async (req, res) => {
    const result = await helpersService.setOnlineStatus(
      req.user.id,
      req.body.isOnline
    );
    return ok(res, result);
  })
);

// GET /api/helpers/me/earnings
router.get(
  '/me/earnings',
  asyncHandler(async (req, res) => {
    const earnings = await helpersService.getHelperEarnings(req.user.id);
    return ok(res, earnings);
  })
);

export default {
  mountPath,
  router,
  service,
};
