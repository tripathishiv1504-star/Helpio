import React from 'react';
import { REQUEST_STATUS } from '@shared/constants.js';

export function StatusBadge({ status, className = '' }) {
  const normalized = (status || '').toLowerCase();

  const config = {
    [REQUEST_STATUS.POSTED]: {
      label: 'Posted',
      classes: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    [REQUEST_STATUS.OFFERED]: {
      label: 'Matching',
      classes: 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse',
    },
    [REQUEST_STATUS.ACCEPTED]: {
      label: 'Accepted',
      classes: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    [REQUEST_STATUS.IN_PROGRESS]: {
      label: 'In Progress',
      classes: 'bg-amber-50 text-amber-800 border-amber-300',
    },
    [REQUEST_STATUS.COMPLETED]: {
      label: 'Completed',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    [REQUEST_STATUS.PAID]: {
      label: 'Paid',
      classes: 'bg-teal-50 text-teal-800 border-teal-200',
    },
    [REQUEST_STATUS.RATED]: {
      label: 'Finished',
      classes: 'bg-teal-100 text-teal-900 border-teal-300',
    },
    [REQUEST_STATUS.CANCELLED]: {
      label: 'Cancelled',
      classes: 'bg-slate-100 text-slate-600 border-slate-300',
    },
    [REQUEST_STATUS.EXPIRED]: {
      label: 'Expired',
      classes: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    [REQUEST_STATUS.DISPUTED]: {
      label: 'Disputed',
      classes: 'bg-orange-50 text-orange-800 border-orange-300',
    },
  };

  const item = config[normalized] || {
    label: status || 'Unknown',
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${item.classes} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
      {item.label}
    </span>
  );
}

export default StatusBadge;
