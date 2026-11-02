import express from 'express';
import { ok } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { createRequestSchema } from './requests.validation.js';
import * as requestsService from './requests.service.js';
import { transition } from './stateMachine.js';
import { events } from './events.js';

export const mountPath = '/requests';
export const router = express.Router();
export const service = {
  ...requestsService,
  transition,
};

// Re-export events and transition for direct module-to-module consumption
export { events } from './events.js';
export { transition } from './stateMachine.js';
export { setFinalAmount } from './requests.service.js';

// All routes require authentication
router.use(requireAuth);

// POST /api/requests
router.post(
  '/',
  validate(createRequestSchema),
  asyncHandler(async (req, res) => {
    const request = await requestsService.createRequest(req.user.id, req.body);
    return ok(res, { request }, 201);
  })
);

// GET /api/requests/mine
router.get(
  '/mine',
  asyncHandler(async (req, res) => {
    const requests = await requestsService.getRequestsMine(req.user);
    return ok(res, { requests });
  })
);

// GET /api/requests/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const request = await requestsService.getRequestById(req.params.id, req.user);
    return ok(res, { request });
  })
);

// POST /api/requests/:id/cancel
router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const cancelled = await requestsService.cancelRequest(req.params.id, req.user);
    return ok(res, { request: cancelled });
  })
);

export default {
  mountPath,
  router,
  service,
};
