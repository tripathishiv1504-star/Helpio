import {
  User,
  HelperProfile,
  Category,
  ServiceRequest,
  Payment,
  Report,
  Setting,
} from '../../models/index.js';
import {
  REQUEST_STATUS,
  PAYMENT_STATUS,
  REPORT_STATUS,
  VERIFICATION_STATUS,
  ROLES,
} from '../../../../shared/constants.js';
import * as reportsService from '../reports/reports.service.js';

/**
 * Aggregates platform operational and financial statistics.
 */
export async function getStats() {
  const [
    totalUsers,
    totalHelpers,
    pendingHelpers,
    totalRequests,
    openDisputes,
    payments,
    requestsByStatusAgg,
  ] = await Promise.all([
    User.countDocuments(),
    HelperProfile.countDocuments(),
    HelperProfile.countDocuments({ verificationStatus: VERIFICATION_STATUS.PENDING }),
    ServiceRequest.countDocuments(),
    Report.countDocuments({ status: REPORT_STATUS.OPEN }),
    Payment.find({ status: PAYMENT_STATUS.PAID }).select('amount platformFee helperPayout'),
    ServiceRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Aggregate paid volume & commission earned
  const paidVolume = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const commissionEarned = payments.reduce((acc, p) => acc + (p.platformFee || 0), 0);

  // Map requests by status
  const requestsByStatus = {};
  for (const status of Object.values(REQUEST_STATUS)) {
    requestsByStatus[status] = 0;
  }
  for (const item of requestsByStatusAgg) {
    if (item._id) requestsByStatus[item._id] = item.count;
  }

  return {
    counts: {
      users: totalUsers,
      helpers: totalHelpers,
      pendingHelpers,
      requests: totalRequests,
      openDisputes,
      completedRequests: requestsByStatus[REQUEST_STATUS.RATED] + requestsByStatus[REQUEST_STATUS.PAID] + requestsByStatus[REQUEST_STATUS.COMPLETED],
    },
    paidVolume,
    commissionEarned,
    requestsByStatus,
  };
}

/**
 * List and search users with optional filters.
 */
export async function getUsers({ search, role, status } = {}) {
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  if (role) {
    query.roles = role;
  }

  if (status) {
    query.status = status;
  }

  const users = await User.find(query)
    .select('-passwordHash')
    .sort({ createdAt: -1 });

  return users;
}

/**
 * Suspend or reactivate a user account.
 */
export async function updateUserStatus(userId, status) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  user.status = status;
  await user.save();

  return user;
}

/**
 * List helper profiles with optional verification status filter.
 */
export async function getHelpers({ verificationStatus } = {}) {
  const query = {};
  if (verificationStatus) {
    query.verificationStatus = verificationStatus;
  }

  const helpers = await HelperProfile.find(query)
    .populate('user', 'name email phone status roles createdAt')
    .sort({ createdAt: -1 });

  return helpers;
}

/**
 * Approve or reject a helper profile with an optional admin note.
 */
export async function verifyHelper(helperProfileId, { verificationStatus, note = '' }) {
  const helper = await HelperProfile.findById(helperProfileId);
  if (!helper) {
    const error = new Error('Helper profile not found.');
    error.status = 404;
    throw error;
  }

  helper.verificationStatus = verificationStatus;
  helper.verificationNote = note;

  // If rejected, ensure helper cannot stay online
  if (verificationStatus === VERIFICATION_STATUS.REJECTED) {
    helper.isOnline = false;
  }

  await helper.save();
  await helper.populate('user', 'name email phone status');

  return helper;
}

/**
 * Categories management: list, create, edit.
 */
export async function getCategories() {
  return await Category.find().sort({ type: 1, name: 1 });
}

export async function createCategory(data) {
  return await Category.create(data);
}

export async function updateCategory(categoryId, data) {
  const category = await Category.findByIdAndUpdate(categoryId, data, { new: true });
  if (!category) {
    const error = new Error('Category not found.');
    error.status = 404;
    throw error;
  }
  return category;
}

/**
 * List service requests with optional status filter.
 */
export async function getRequests({ status } = {}) {
  const query = {};
  if (status) query.status = status;

  return await ServiceRequest.find(query)
    .populate('user', 'name email phone')
    .populate('helper', 'name email phone')
    .populate('category', 'name type')
    .sort({ createdAt: -1 });
}

/**
 * List platform payments.
 */
export async function getPayments() {
  return await Payment.find()
    .populate({
      path: 'request',
      select: 'subcategory status pricingType finalAmount budget user helper createdAt',
      populate: [
        { path: 'user', select: 'name email phone' },
        { path: 'helper', select: 'name email phone' },
      ],
    })
    .sort({ createdAt: -1 });
}

/**
 * Platform settings management (commission percentage).
 */
export async function getSettings() {
  const commissionSetting = await Setting.findOne({ key: 'commissionPercent' });
  const commissionPercent =
    commissionSetting && !isNaN(Number(commissionSetting.value))
      ? Number(commissionSetting.value)
      : 10;

  return { commissionPercent };
}

export async function updateSettings({ commissionPercent }) {
  const setting = await Setting.findOneAndUpdate(
    { key: 'commissionPercent' },
    { value: Number(commissionPercent) },
    { upsert: true, new: true }
  );

  return { commissionPercent: Number(setting.value) };
}

/**
 * Reports and dispute management.
 */
export async function getReports(query) {
  return await reportsService.getReports(query);
}

export async function resolveReport(reportId, adminUser, data) {
  return await reportsService.resolveReport(reportId, adminUser, data);
}

export default {
  getStats,
  getUsers,
  updateUserStatus,
  getHelpers,
  verifyHelper,
  getCategories,
  createCategory,
  updateCategory,
  getRequests,
  getPayments,
  getSettings,
  updateSettings,
  getReports,
  resolveReport,
};
