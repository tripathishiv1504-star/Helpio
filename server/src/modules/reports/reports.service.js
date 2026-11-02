import {
  Report,
  ServiceRequest,
  User,
} from '../../models/index.js';
import {
  REQUEST_STATUS,
  REPORT_STATUS,
  PRICING_TYPE,
  ROLES,
} from '../../../../shared/constants.js';
import { transition } from '../requests/index.js';

/**
 * Creates a dispute or problem report on a request.
 * Allowed for request owner or assigned helper.
 * If status is COMPLETED or PAID, also transitions request to DISPUTED.
 */
export async function createReport(user, { requestId, reason }) {
  const request = await ServiceRequest.findById(requestId)
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

  const helperId =
    request.helper?._id?.toString() ||
    request.helper?.id?.toString() ||
    request.helper?.toString();

  const isOwner = ownerId === userId;
  const isHelper = helperId === userId;

  if (!isOwner && !isHelper) {
    const error = new Error('Only the request owner or assigned helper can file a report on this request.');
    error.status = 403;
    throw error;
  }

  let againstId;
  if (isOwner) {
    if (!helperId) {
      const error = new Error('Cannot file a complaint: no helper was assigned to this request.');
      error.status = 400;
      throw error;
    }
    againstId = helperId;
  } else {
    againstId = ownerId;
  }

  // Create report document
  const report = await Report.create({
    request: requestId,
    filedBy: userId,
    against: againstId,
    reason: (reason || '').trim(),
    status: REPORT_STATUS.OPEN,
  });

  // If request is COMPLETED or PAID, transition to DISPUTED
  if ([REQUEST_STATUS.COMPLETED, REQUEST_STATUS.PAID].includes(request.status)) {
    const actor = isOwner ? 'user' : 'helper';
    await transition(request, REQUEST_STATUS.DISPUTED, actor, {
      reportId: report._id,
      reason,
    });
  }

  await report.populate([
    { path: 'filedBy', select: 'name email phone roles' },
    { path: 'against', select: 'name email phone roles' },
    { path: 'request', select: 'subcategory status pricingType finalAmount budget' },
  ]);

  return report;
}

/**
 * Admin resolves a report and transitions DISPUTED request to target status.
 * Allowed target statuses from DISPUTED: PAID, RATED, CANCELLED.
 */
export async function resolveReport(reportId, adminUser, { targetStatus, resolution }) {
  const report = await Report.findById(reportId);
  if (!report) {
    const error = new Error('Report not found.');
    error.status = 404;
    throw error;
  }

  if (report.status === REPORT_STATUS.RESOLVED) {
    const error = new Error('This report has already been resolved.');
    error.status = 400;
    throw error;
  }

  const request = await ServiceRequest.findById(report.request);
  let updatedRequest = request;

  if (request && request.status === REQUEST_STATUS.DISPUTED) {
    const allowedTargets = [
      REQUEST_STATUS.PAID,
      REQUEST_STATUS.RATED,
      REQUEST_STATUS.CANCELLED,
    ];

    if (!allowedTargets.includes(targetStatus)) {
      const error = new Error(
        `Target status must be one of: ${allowedTargets.join(', ')}`
      );
      error.status = 400;
      throw error;
    }

    if (request.pricingType === PRICING_TYPE.FREE && targetStatus === REQUEST_STATUS.PAID) {
      const error = new Error('Free community requests cannot transition to PAID. Choose RATED or CANCELLED.');
      error.status = 400;
      throw error;
    }

    updatedRequest = await transition(request, targetStatus, 'admin', {
      reportId: report._id,
      resolution,
    });
  }

  report.status = REPORT_STATUS.RESOLVED;
  report.resolution = (resolution || '').trim();
  await report.save();

  await report.populate([
    { path: 'filedBy', select: 'name email phone' },
    { path: 'against', select: 'name email phone' },
    { path: 'request', select: 'subcategory status pricingType finalAmount budget' },
  ]);

  return {
    report,
    request: updatedRequest,
  };
}

/**
 * Fetch reports with optional filtering.
 */
export async function getReports(filter = {}) {
  const query = {};
  if (filter.status) query.status = filter.status;
  if (filter.request) query.request = filter.request;

  const reports = await Report.find(query)
    .populate('filedBy', 'name email phone roles')
    .populate('against', 'name email phone roles')
    .populate({
      path: 'request',
      select: 'subcategory category status pricingType finalAmount budget user helper createdAt',
      populate: [
        { path: 'user', select: 'name phone' },
        { path: 'helper', select: 'name phone' },
      ],
    })
    .sort({ createdAt: -1 });

  return reports;
}

export default {
  createReport,
  resolveReport,
  getReports,
};
