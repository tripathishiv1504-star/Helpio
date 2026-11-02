import express from 'express';
import { ok } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import * as paymentsService from './payments.service.js';

export const mountPath = '/payments';
export const router = express.Router();
export const service = paymentsService;

// All payment routes require authentication
router.use(requireAuth);

/**
 * POST /api/payments/:requestId/pay
 * Customer processes payment for completed request.
 */
router.post(
  '/:requestId/pay',
  asyncHandler(async (req, res) => {
    const result = await paymentsService.payRequest(
      req.params.requestId,
      req.user
    );
    return ok(res, result, 200);
  })
);

/**
 * GET /api/payments/mine
 * List payments for the authenticated user (as customer or helper).
 */
router.get(
  '/mine',
  asyncHandler(async (req, res) => {
    const payments = await paymentsService.getPaymentsMine(req.user);
    return ok(res, { payments });
  })
);

export default {
  mountPath,
  router,
  service,
};
