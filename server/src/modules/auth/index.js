import express from 'express';
import { ok } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from './auth.validation.js';
import * as authService from './auth.service.js';

export const mountPath = '/auth';
export const router = express.Router();
export const service = authService;

// Rate limit login endpoint: max 10 requests per minute per IP
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please wait a minute and try again.',
});

// POST /api/auth/register
router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    return ok(res, result, 201);
  })
);

// POST /api/auth/login
router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    return ok(res, result);
  })
);

// GET /api/auth/me
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.user.id);
    return ok(res, { user });
  })
);

// PATCH /api/auth/me
router.patch(
  '/me',
  requireAuth,
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const updatedUser = await authService.updateMe(req.user.id, req.body);
    return ok(res, { user: updatedUser });
  })
);

export default {
  mountPath,
  router,
  service,
};
