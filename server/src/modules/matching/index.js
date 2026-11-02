import express from 'express';
import { ok } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { ROLES } from '../../../../shared/constants.js';
import { events, EVENT_NAMES } from '../requests/events.js';
import * as matchingService from './matching.service.js';

export const mountPath = '/offers';
export const router = express.Router();
export const service = matchingService;

// All offers routes require role 'helper'
router.use(requireAuth, requireRole(ROLES.HELPER));

// GET /api/offers & GET /api/offers/mine
router.get(
  ['/', '/mine'],
  asyncHandler(async (req, res) => {
    const offers = await matchingService.getHelperOffers(req.user.id);
    return ok(res, { offers });
  })
);

// POST /api/offers/:id/accept
router.post(
  '/:id/accept',
  asyncHandler(async (req, res) => {
    const result = await matchingService.acceptOffer(req.params.id, req.user.id);
    return ok(res, result);
  })
);

// POST /api/offers/:id/reject
router.post(
  '/:id/reject',
  asyncHandler(async (req, res) => {
    const offer = await matchingService.rejectOffer(req.params.id, req.user.id);
    return ok(res, { offer });
  })
);

/**
 * Module initialization:
 * 1. Subscribe to 'request:posted' event to automatically trigger matching & offers.
 * 2. Start the 15-second background expiry worker.
 */
let workerInterval = null;

export function init() {
  console.log('[Matching Module] Initializing matching listeners and worker...');

  // Event listener for incoming posted requests
  events.on(EVENT_NAMES.REQUEST_POSTED, async (request) => {
    console.log(`[Matching] Received "${EVENT_NAMES.REQUEST_POSTED}" for request ${request._id}`);
    try {
      await matchingService.matchAndOfferRequest(request);
    } catch (err) {
      console.error(`[Matching] Error matching request ${request._id}:`, err);
    }
  });

  // Background worker every 15 seconds to expire old offers
  if (!workerInterval) {
    workerInterval = setInterval(async () => {
      try {
        await matchingService.runExpiryCheck();
      } catch (err) {
        console.error('[Matching Worker] Error running expiry check:', err);
      }
    }, 15000);
    workerInterval.unref(); // Do not hold the Node.js process open
  }

  console.log('[Matching Module] Matching module initialized successfully.');
}

export default {
  mountPath,
  router,
  service,
  init,
};
