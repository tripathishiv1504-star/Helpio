import {
  ServiceRequest,
  Payment,
  HelperProfile,
  Setting,
} from '../../models/index.js';
import {
  REQUEST_STATUS,
  PRICING_TYPE,
  PAYMENT_STATUS,
  ROLES,
} from '../../../../shared/constants.js';
import { transition } from '../requests/index.js';
import { getPaymentProvider } from './provider.js';

/**
 * Processes payment for a completed service request.
 * amount = finalAmount (or budget fallback)
 * platformFee = round(amount * commissionPercent / 100)
 * helperPayout = amount - platformFee
 * Creates Payment, adds helperPayout to HelperProfile.earningsTotal, and transitions COMPLETED -> PAID.
 */
export async function payRequest(requestId, user) {
  const request = await ServiceRequest.findById(requestId)
    .populate('category', 'name type')
    .populate('user', 'name phone email')
    .populate('helper', 'name phone email');

  if (!request) {
    const error = new Error('Service request not found.');
    error.status = 404;
    throw error;
  }

  const userId = user._id?.toString() || user.id?.toString();
  const ownerId =
    request.user?._id?.toString() ||
    request.user?.id?.toString() ||
    request.user?.toString();

  const isAdmin = user.roles?.includes(ROLES.ADMIN);

  if (!isAdmin && ownerId !== userId) {
    const error = new Error('Only the request owner can process payment.');
    error.status = 403;
    throw error;
  }

  if (request.status !== REQUEST_STATUS.COMPLETED) {
    const error = new Error(
      `Payment can only be made for requests in COMPLETED status (current status: "${request.status}").`
    );
    error.status = 400;
    throw error;
  }

  if (request.pricingType === PRICING_TYPE.FREE) {
    const error = new Error('Free community help requests do not require payment.');
    error.status = 400;
    throw error;
  }

  const amount = Number(request.finalAmount || request.budget);
  if (!amount || isNaN(amount) || amount <= 0) {
    const error = new Error('Invalid final amount for payment.');
    error.status = 400;
    throw error;
  }

  // Prevent duplicate payment
  const existingPayment = await Payment.findOne({
    request: requestId,
    status: PAYMENT_STATUS.PAID,
  });

  if (existingPayment) {
    const error = new Error('Payment has already been processed for this request.');
    error.status = 400;
    throw error;
  }

  // Fetch commission setting (default 10%)
  const commissionSetting = await Setting.findOne({ key: 'commissionPercent' });
  const commissionPercent =
    commissionSetting && !isNaN(Number(commissionSetting.value))
      ? Number(commissionSetting.value)
      : 10;

  const platformFee = Math.round((amount * commissionPercent) / 100);
  const helperPayout = amount - platformFee;

  // Execute payment through provider
  const provider = getPaymentProvider();
  const chargeResult = await provider.charge(amount, {
    requestId: request._id,
    userId,
    helperId: request.helper?._id,
  });

  // Create payment record
  const payment = await Payment.create({
    request: request._id,
    amount,
    platformFee,
    helperPayout,
    method: chargeResult.provider || 'simulated',
    status: PAYMENT_STATUS.PAID,
    providerRef: chargeResult.transactionId || '',
  });

  // Credit helper's earningsTotal
  if (request.helper) {
    const helperUserId = request.helper._id || request.helper;
    await HelperProfile.findOneAndUpdate(
      { user: helperUserId },
      { $inc: { earningsTotal: helperPayout } }
    );
  }

  // Transition request to PAID
  const actor = isAdmin && ownerId !== userId ? 'admin' : 'user';
  const updatedRequest = await transition(request, REQUEST_STATUS.PAID, actor, {
    paymentId: payment._id,
    amount,
    platformFee,
    helperPayout,
  });

  return {
    payment,
    request: updatedRequest,
  };
}

/**
 * Retrieve payments for the authenticated user (both as customer and as helper).
 */
export async function getPaymentsMine(user) {
  const userId = user._id || user.id;

  // Find requests where user is either the customer or the assigned helper
  const requests = await ServiceRequest.find({
    $or: [{ user: userId }, { helper: userId }],
  }).select('_id');

  const requestIds = requests.map((r) => r._id);

  const payments = await Payment.find({
    request: { $in: requestIds },
  })
    .populate({
      path: 'request',
      select: 'category subcategory description status pricingType finalAmount budget user helper createdAt',
      populate: [
        { path: 'user', select: 'name email phone' },
        { path: 'helper', select: 'name email phone' },
        { path: 'category', select: 'name type' },
      ],
    })
    .sort({ createdAt: -1 });

  return payments;
}

export default {
  payRequest,
  getPaymentsMine,
};
