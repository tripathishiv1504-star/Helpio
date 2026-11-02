import React from 'react';
import { Card, Badge, Button } from '../../components/ui/index.js';
import { REQUEST_STATUS } from '@shared/constants.js';

export const MatchStatusPanel = {
  id: 'match-status',
  order: 15,
  visibleWhen: (request) => {
    // Visible for all requests to show matching status
    return Boolean(request);
  },
  Component: function MatchStatusComponent({ request, user }) {
    if (!request) return null;

    const isSearching = [REQUEST_STATUS.POSTED, REQUEST_STATUS.OFFERED].includes(request.status);
    const isAccepted = [
      REQUEST_STATUS.ACCEPTED,
      REQUEST_STATUS.IN_PROGRESS,
      REQUEST_STATUS.COMPLETED,
      REQUEST_STATUS.PAID,
      REQUEST_STATUS.RATED,
      REQUEST_STATUS.DISPUTED,
    ].includes(request.status);
    const isExpired = request.status === REQUEST_STATUS.EXPIRED;
    const isCancelled = request.status === REQUEST_STATUS.CANCELLED;

    if (isSearching) {
      return (
        <Card className="mb-6 border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/60 via-white to-primary-50/40">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-2xl shadow-sm shrink-0 animate-pulse">
              📡
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Contacting Nearby Helpers...
                </h3>
                <Badge variant="primary" className="animate-pulse">
                  Searching Live
                </Badge>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                We're matching your request to the top verified helpers within your area (
                <span className="font-semibold text-slate-800">
                  {request.searchRadiusKm || 10} km radius
                </span>
                ). The first helper to accept will take the job.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-4">
                <span>⏱️ Window: ~{request.urgency === 'emergency' ? 5 : request.urgency === 'urgent' ? 10 : 30} mins</span>
                <span>•</span>
                <span>Top 5 candidates contacted</span>
              </div>
            </div>
          </div>
        </Card>
      );
    }

    if (isAccepted && request.helper) {
      const helper = request.helper;
      return (
        <Card className="mb-6 border-2 border-emerald-300 bg-gradient-to-r from-emerald-50/40 via-white to-teal-50/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl font-bold shadow-sm uppercase shrink-0">
                {helper.name?.[0] || 'H'}
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Assigned Helper
                </span>
                <h3 className="text-base font-bold text-slate-900">{helper.name}</h3>
                {helper.phone && (
                  <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                    <span>📞 {helper.phone}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="success" size="lg" className="font-semibold shadow-sm">
                ✓ Helper Confirmed
              </Badge>
            </div>
          </div>
        </Card>
      );
    }

    if (isExpired) {
      return (
        <Card className="mb-6 border-2 border-rose-200 bg-rose-50/40">
          <div className="flex items-start gap-4">
            <span className="text-3xl shrink-0">⏳</span>
            <div>
              <h3 className="text-base font-bold text-rose-900">No Helpers Accepted in Time</h3>
              <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                We reached out to all nearby providers within a widened radius, but none were able to
                accept within the urgency window. You can post a new request with a wider timeframe or
                adjusted budget.
              </p>
            </div>
          </div>
        </Card>
      );
    }

    if (isCancelled) {
      return (
        <Card className="mb-6 border border-slate-200 bg-slate-50">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🚫</span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Request Cancelled</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                This request was cancelled by the user before work started.
              </p>
            </div>
          </div>
        </Card>
      );
    }

    return null;
  },
};

export default MatchStatusPanel;
