import express from 'express';
import { ok } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import * as ratingsService from './ratings.service.js';
import { createRatingSchema } from './ratings.validation.js';

export const mountPath = '/ratings';
export const router = express.Router();
export const service = ratingsService;

/**
 * GET /api/ratings/helper/:id
 * Retrieve ratings summary and reviews for a helper.
 */
router.get(
  '/helper/:id',
  asyncHandler(async (req, res) => {
    const data = await ratingsService.getRatingsForHelper(req.params.id);
    return ok(res, data);
  })
);

/**
 * GET /api/ratings/request/:requestId
 * Retrieve ratings submitted on a specific request.
 */
router.get(
  '/request/:requestId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const ratings = await ratingsService.getRequestRatings(req.params.requestId);
    return ok(res, { ratings });
  })
);

/**
 * POST /api/ratings/:requestId
 * Submit a rating for a service request.
 */
router.post(
  '/:requestId',
  requireAuth,
  validate(createRatingSchema),
  asyncHandler(async (req, res) => {
    const result = await ratingsService.createRating(
      req.params.requestId,
      req.user,
      req.body
    );
    return ok(res, result, 201);
  })
);

export default {
  mountPath,
  router,
  service,
};
