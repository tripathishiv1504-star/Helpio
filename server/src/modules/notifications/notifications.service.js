import {
  Notification,
  ServiceRequest,
} from '../../models/index.js';
import {
  REQUEST_STATUS,
  ROLES,
} from '../../../../shared/constants.js';
import { events, EVENT_NAMES } from '../requests/events.js';

/**
 * Creates a notification document for a user.
 */
export async function createNotification(userId, type, payload) {
  if (!userId) return null;
  try {
    return await Notification.create({
      user: userId,
      type,
      payload,
      read: false,
    });
  } catch (err) {
    console.warn(`[Notification] Failed to create notification for user ${userId}:`, err.message);
    return null;
  }
}

/**
 * Fetches notifications for a user, sorted chronologically descending.
 */
export async function getUserNotifications(userId, limit = 50) {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit),
    Notification.countDocuments({ user: userId, read: false }),
  ]);

  return {
    notifications,
    unreadCount,
  };
}

/**
 * Marks a single notification as read.
 */
export async function markAsRead(notificationId, userId) {
  const updated = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true },
    { new: true }
  );

  return updated;
}

/**
 * Marks all unread notifications for a user as read.
 */
export async function markAllAsRead(userId) {
  await Notification.updateMany(
    { user: userId, read: false },
    { read: true }
  );

  return { success: true };
}

/**
 * Subscribes to application events and generates relevant notifications.
 */
export function subscribeToEvents() {
  // 1. Offer Created -> Notify helper
  events.on(EVENT_NAMES.OFFER_CREATED, async (offer) => {
    try {
      if (!offer || !offer.helper) return;

      const request = await ServiceRequest.findById(offer.request)
        .populate('category', 'name type');

      await createNotification(offer.helper, 'offer:created', {
        title: 'New Service Offer Available!',
        message: `New ${request?.subcategory || 'service'} request nearby (${offer.distanceKm} km away).`,
        requestId: offer.request,
        offerId: offer._id,
        link: '/helper/offers',
      });
    } catch (err) {
      console.warn('[Notification Worker] offer:created error:', err.message);
    }
  });

  // 2. Direct Message Created -> Notify counterparty
  events.on(EVENT_NAMES.MESSAGE_CREATED, async (message) => {
    try {
      if (!message || !message.request || !message.sender) return;

      const request = await ServiceRequest.findById(message.request)
        .populate('user', 'name')
        .populate('helper', 'name');

      if (!request) return;

      const senderId = message.sender?._id?.toString() || message.sender?.toString();
      const ownerId = request.user?._id?.toString() || request.user?.toString();
      const helperId = request.helper?._id?.toString() || request.helper?.toString();

      const recipientId = senderId === ownerId ? helperId : ownerId;
      if (!recipientId) return;

      const senderName =
        senderId === ownerId
          ? request.user?.name || 'Customer'
          : request.helper?.name || 'Helper';

      await createNotification(recipientId, 'message:created', {
        title: `Message from ${senderName}`,
        message: message.text.length > 80 ? message.text.substring(0, 77) + '...' : message.text,
        requestId: request._id,
        link: `/requests/${request._id}`,
      });
    } catch (err) {
      console.warn('[Notification Worker] message:created error:', err.message);
    }
  });

  // 3. Status Changed -> Lifecycle notifications
  events.on(EVENT_NAMES.STATUS_CHANGED, async ({ request, from, to, actor, meta }) => {
    try {
      if (!request) return;

      const ownerId = request.user?._id || request.user;
      const helperId = request.helper?._id || request.helper;

      switch (to) {
        case REQUEST_STATUS.ACCEPTED:
          // Notify customer
          await createNotification(ownerId, 'status:accepted', {
            title: 'Helper Assigned!',
            message: 'A helper has accepted your request and is ready to assist you.',
            requestId: request._id,
            link: `/requests/${request._id}`,
          });
          break;

        case REQUEST_STATUS.IN_PROGRESS:
          // Notify customer
          await createNotification(ownerId, 'status:in_progress', {
            title: 'Service In Progress',
            message: 'Your assigned helper has started working on your request.',
            requestId: request._id,
            link: `/requests/${request._id}`,
          });
          break;

        case REQUEST_STATUS.COMPLETED:
          // Notify customer to pay / rate
          await createNotification(ownerId, 'status:completed', {
            title: 'Job Completed',
            message: 'The helper has completed work. Please review and complete payment.',
            requestId: request._id,
            link: `/requests/${request._id}`,
          });
          break;

        case REQUEST_STATUS.PAID:
          // Notify helper of payment
          if (helperId) {
            await createNotification(helperId, 'status:paid', {
              title: 'Payment Received!',
              message: `Payment of ₹${meta?.amount || request.finalAmount || ''} has been settled. Helper payout: ₹${meta?.helperPayout || ''}.`,
              requestId: request._id,
              link: `/requests/${request._id}`,
            });
          }
          break;

        case REQUEST_STATUS.RATED:
          // Notify recipient of review
          if (actor === 'user' && helperId) {
            await createNotification(helperId, 'status:rated', {
              title: 'New Rating & Review',
              message: `Your customer gave you a ${meta?.stars || 5}-star review!`,
              requestId: request._id,
              link: `/requests/${request._id}`,
            });
          } else if (actor === 'helper') {
            await createNotification(ownerId, 'status:rated', {
              title: 'Customer Review Received',
              message: 'Your helper submitted a review for your service interaction.',
              requestId: request._id,
              link: `/requests/${request._id}`,
            });
          }
          break;

        case REQUEST_STATUS.CANCELLED:
          if (actor === 'user' && helperId) {
            await createNotification(helperId, 'status:cancelled', {
              title: 'Request Cancelled',
              message: 'The customer cancelled this service request.',
              requestId: request._id,
              link: `/requests/${request._id}`,
            });
          } else if (actor === 'admin') {
            await createNotification(ownerId, 'status:cancelled', {
              title: 'Request Cancelled by Administrator',
              message: meta?.reason || 'This request was cancelled by platform admin.',
              requestId: request._id,
              link: `/requests/${request._id}`,
            });
            if (helperId) {
              await createNotification(helperId, 'status:cancelled', {
                title: 'Request Cancelled by Administrator',
                message: meta?.reason || 'This request was cancelled by platform admin.',
                requestId: request._id,
                link: `/requests/${request._id}`,
              });
            }
          }
          break;

        case REQUEST_STATUS.EXPIRED:
          await createNotification(ownerId, 'status:expired', {
            title: 'Request Expired',
            message: 'No helpers were available to accept your request within the time window.',
            requestId: request._id,
            link: `/requests/${request._id}`,
          });
          break;

        case REQUEST_STATUS.DISPUTED:
          // Notify counterparty that dispute was filed
          const disputedTarget = actor === 'user' ? helperId : ownerId;
          if (disputedTarget) {
            await createNotification(disputedTarget, 'status:disputed', {
              title: 'Dispute Filed',
              message: 'A problem was reported on this request and is under administrator review.',
              requestId: request._id,
              link: `/requests/${request._id}`,
            });
          }
          break;

        default:
          break;
      }
    } catch (err) {
      console.warn('[Notification Worker] status:changed error:', err.message);
    }
  });
}

export default {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  subscribeToEvents,
};
