export const ROLES = Object.freeze({
  USER: 'user',
  HELPER: 'helper',
  ADMIN: 'admin',
});

export const URGENCY = Object.freeze({
  NORMAL: 'normal',
  URGENT: 'urgent',
  EMERGENCY: 'emergency',
});

export const REQUEST_STATUS = Object.freeze({
  POSTED: 'posted',
  OFFERED: 'offered',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  PAID: 'paid',
  RATED: 'rated',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  DISPUTED: 'disputed',
});

export const PRICING_TYPE = Object.freeze({
  FREE: 'free',
  FIXED: 'fixed',
  HOURLY: 'hourly',
});

export const CATEGORY_TYPE = Object.freeze({
  COMMUNITY: 'community',
  PROFESSIONAL: 'professional',
  INSTANT: 'instant',
});

export const OFFER_STATUS = Object.freeze({
  SENT: 'sent',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  TAKEN: 'taken',
});

export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
});

export const VERIFICATION_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

export const REPORT_STATUS = Object.freeze({
  OPEN: 'open',
  RESOLVED: 'resolved',
});
