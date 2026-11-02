import React from 'react';
import { Card, Badge, StatusBadge, MapView } from '../../components/ui/index.js';

// 1. Summary Panel (Order 10)
export const SummaryPanel = {
  id: 'request-summary',
  order: 10,
  visibleWhen: () => true, // Always visible
  Component: function RequestSummaryPanel({ request, user }) {
    if (!request) return null;

    const coords = request.location?.coordinates || [77.2090, 28.6139];
    const lng = coords[0];
    const lat = coords[1];

    return (
      <Card title="Request Details" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Description
              </span>
              <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                {request.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Category</span>
                <span className="font-semibold text-slate-800">
                  {request.category?.name || 'Service'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Subcategory</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {request.subcategory}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Pricing Type</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {request.pricingType}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Budget / Rate</span>
                <span className="font-semibold text-slate-800">
                  {request.pricingType === 'free'
                    ? 'Free'
                    : request.budget
                    ? `₹${request.budget}`
                    : 'Standard rate'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Timing</span>
                <span className="font-semibold text-slate-800">
                  {request.asap
                    ? '⚡ ASAP'
                    : request.scheduledFor
                    ? new Date(request.scheduledFor).toLocaleString()
                    : 'Scheduled'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Urgency</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {request.urgency}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Location
              </span>
              <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                📍 {request.location?.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
              </p>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Location Map
            </span>
            <MapView lat={lat} lng={lng} zoom={14} height="200px" />
          </div>
        </div>
      </Card>
    );
  },
};

// 2. Status Timeline Panel (Order 20)
export const StatusTimelinePanel = {
  id: 'request-timeline',
  order: 20,
  visibleWhen: () => true, // Always visible
  Component: function RequestStatusTimelinePanel({ request }) {
    if (!request || !request.statusHistory) return null;

    const history = [...request.statusHistory].reverse();

    return (
      <Card title="Activity & Status History" className="mb-6">
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {history.map((item, idx) => (
            <div key={idx} className="relative flex items-start gap-3">
              <span
                className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-white ${
                  idx === 0 ? 'bg-primary-600 ring-4 ring-primary-100' : 'bg-slate-300'
                }`}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.status} />
                  <span className="text-xs text-slate-400">
                    {new Date(item.changedAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Updated by <span className="font-semibold capitalize">{item.actor}</span>
                  {item.meta?.reason && ` — "${item.meta.reason}"`}
                  {item.meta?.description && ` — ${item.meta.description}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  },
};

// Export as an array so both Summary and StatusTimeline are registered
export default [SummaryPanel, StatusTimelinePanel];
