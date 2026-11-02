import express from 'express';
import { ok } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as categoriesService from './categories.service.js';

export const mountPath = '/categories';
export const router = express.Router();
export const service = categoriesService;

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await categoriesService.getActiveCategoriesGrouped();
    return ok(res, data);
  })
);

export default {
  mountPath,
  router,
  service,
};
