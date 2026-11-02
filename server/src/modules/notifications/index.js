import express from 'express';
import { ok } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import * as notificationsService from './notifications.service.js';

export const mountPath = '/notifications';
export const router = express.Router();
export const service = notificationsService;

/**
 * Initializes the notifications module by subscribing to all application events.
 */
export async function init() {
  notificationsService.subscribeToEvents();
  console.log('[Notifications] Subscribed to application lifecycle events.');
}

// All notification endpoints require authentication
router.use(requireAuth);

/**
 * GET /api/notifications
 * Retrieves user's notifications and unread count.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await notificationsService.getUserNotifications(req.user.id);
    return ok(res, data);
  })
);

/**
 * POST /api/notifications/:id/read
 * Marks a notification as read.
 */
router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const notification = await notificationsService.markAsRead(
      req.params.id,
      req.user.id
    );
    return ok(res, { notification });
  })
);

/**
 * POST /api/notifications/read-all
 * Marks all notifications for the user as read.
 */
router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    const result = await notificationsService.markAllAsRead(req.user.id);
    return ok(res, result);
  })
);

export default {
  mountPath,
  router,
  service,
  init,
};
