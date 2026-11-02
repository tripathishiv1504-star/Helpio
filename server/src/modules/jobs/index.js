import express from 'express';
import { ok } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { ROLES } from '../../../../shared/constants.js';
import * as jobsService from './jobs.service.js';
import { completeJobSchema, createMessageSchema } from './jobs.validation.js';

export const mountPath = '/jobs';
export const router = express.Router();
export const service = jobsService;

// All job routes require an authenticated user
router.use(requireAuth);

// Rate limiter for chat messages: 30 messages per minute per IP
const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'You are sending messages too quickly. Please wait a moment.',
});

/**
 * GET /api/jobs & GET /api/jobs/mine
 * List active and past jobs for the authenticated helper.
 */
router.get(
  '/',
  requireRole(ROLES.HELPER),
  asyncHandler(async (req, res) => {
    const data = await jobsService.getHelperJobs(req.user);
    return ok(res, data);
  })
);

router.get(
  '/mine',
  requireRole(ROLES.HELPER),
  asyncHandler(async (req, res) => {
    const data = await jobsService.getHelperJobs(req.user);
    return ok(res, data);
  })
);

/**
 * POST /api/jobs/:requestId/start
 * Assigned helper marks work as started.
 */
router.post(
  '/:requestId/start',
  requireRole(ROLES.HELPER),
  asyncHandler(async (req, res) => {
    const request = await jobsService.startJob(req.params.requestId, req.user);
    return ok(res, { request }, 200);
  })
);

/**
 * POST /api/jobs/:requestId/complete
 * Assigned helper marks work as completed (with finalAmount for paid jobs).
 */
router.post(
  '/:requestId/complete',
  requireRole(ROLES.HELPER),
  validate(completeJobSchema),
  asyncHandler(async (req, res) => {
    const request = await jobsService.completeJob(
      req.params.requestId,
      req.user,
      req.body
    );
    return ok(res, { request }, 200);
  })
);

/**
 * GET /api/jobs/:requestId/messages
 * Retrieve direct messages for a request.
 */
router.get(
  '/:requestId/messages',
  asyncHandler(async (req, res) => {
    const messages = await jobsService.getMessages(req.params.requestId, req.user);
    return ok(res, { messages });
  })
);

/**
 * POST /api/jobs/:requestId/messages
 * Send a message for a request (active during ACCEPTED through PAID).
 */
router.post(
  '/:requestId/messages',
  chatRateLimiter,
  validate(createMessageSchema),
  asyncHandler(async (req, res) => {
    const message = await jobsService.sendMessage(
      req.params.requestId,
      req.user,
      req.body.text
    );
    return ok(res, { message }, 201);
  })
);

export default {
  mountPath,
  router,
  service,
};
