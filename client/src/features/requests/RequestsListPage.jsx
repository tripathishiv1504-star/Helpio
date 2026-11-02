import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  Button,
  StatusBadge,
  Spinner,
  PageHeader,
  EmptyState,
} from '../../components/ui/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import api from '../../lib/api.js';

export function RequestsListPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function fetchRequests() {
      try {
        const data = await api.get('/requests/mine');
        setRequests(data.requests || []);
      } catch (err) {
        toast.error('Failed to load requests: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchRequests();
  }, []);

  const filtered = requests.filter((r) => {
    if (filter === 'active') {
      return !['completed', 'paid', 'rated', 'cancelled', 'expired'].includes(r.status);
    }
    if (filter === 'completed') {
      return ['completed', 'paid', 'rated'].includes(r.status);
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="My Service Requests"
        subtitle="Full history of requests you have posted or worked on"
        action={
          <Link to="/requests/new">
            <Button size="sm" variant="primary">
              + Post a Need
            </Button>
          </Link>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-3">
        {[
          { key: 'all', label: `All Requests (${requests.length})` },
          {
            key: 'active',
            label: `Active (${
              requests.filter(
                (r) => !['completed', 'paid', 'rated', 'cancelled', 'expired'].includes(r.status)
              ).length
            })`,
          },
          {
            key: 'completed',
            label: `Completed (${
              requests.filter((r) => ['completed', 'paid', 'rated'].includes(r.status)).length
            })`,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === tab.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No requests match this filter"
          description="You don't have any requests in this view right now."
          action={
            <Link to="/requests/new">
              <Button variant="secondary" size="sm">
                Create a Request
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <Card key={req._id} hoverable className="p-4">
              <Link to={`/requests/${req._id}`} className="block">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={req.status} />
                      <span className="text-xs font-semibold text-slate-500 uppercase">
                        {req.category?.name || 'Service'}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-400">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 capitalize">
                      {req.subcategory}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1 max-w-lg">
                      {req.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Pricing</span>
                      <span className="font-semibold text-slate-800">
                        {req.pricingType === 'free'
                          ? 'Free'
                          : req.budget
                          ? `₹${req.budget}`
                          : req.pricingType}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Timing</span>
                      <span className="font-semibold text-slate-800">
                        {req.asap ? 'ASAP' : 'Scheduled'}
                      </span>
                    </div>

                    <span className="text-slate-400 text-sm">→</span>
                  </div>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default RequestsListPage;
