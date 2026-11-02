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
import useSession from '../../lib/session.js';

export function UserDashboard() {
  const { user } = useSession();
  const { toast } = useToast();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRequests() {
      try {
        const data = await api.get('/requests/mine');
        setRequests(data.requests || []);
      } catch (err) {
        toast.error('Failed to load your requests: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadRequests();
  }, []);

  const activeRequests = requests.filter(
    (r) => !['completed', 'paid', 'rated', 'cancelled', 'expired'].includes(r.status)
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Action Banner */}
      <div className="mb-8 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-primary-600 via-primary-700 to-teal-800 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-200 block mb-1">
            Need help right now?
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Connect with nearby helpers
          </h2>
          <p className="text-primary-100 text-xs sm:text-sm mt-1 max-w-lg">
            Post an urgent task, household repair, or community need. We'll match you to trusted,
            verified helpers in minutes.
          </p>
        </div>
        <Link to="/requests/new" className="shrink-0 w-full sm:w-auto">
          <Button variant="accent" size="lg" className="w-full sm:w-auto font-bold shadow-lg">
            ⚡ Post a Need
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Your Requests"
        subtitle="Manage and track the progress of your ongoing and past needs"
        action={
          <Link to="/requests/new">
            <Button size="sm">+ New Request</Button>
          </Link>
        }
      />

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon="📝"
          title="No requests posted yet"
          description="Whenever you need help with electrical work, cleaning, moving, or everyday chores, tap below to create your first request."
          action={
            <Link to="/requests/new">
              <Button variant="primary">Post a Need Now</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <Card
              key={req._id}
              hoverable
              className="transition-all hover:scale-[1.01]"
            >
              <Link to={`/requests/${req._id}`} className="block">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={req.status} />
                      <span className="text-xs font-semibold text-slate-500 uppercase">
                        {req.category?.name || 'General'}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-400">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-800 capitalize">
                      {req.subcategory}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-1 max-w-xl">
                      {req.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 text-xs pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <span className="text-slate-400 block">Rate / Budget</span>
                      <span className="font-bold text-slate-800">
                        {req.pricingType === 'free'
                          ? 'Free'
                          : req.budget
                          ? `₹${req.budget}`
                          : req.pricingType}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 block">Timing</span>
                      <span className="font-medium text-slate-700">
                        {req.asap ? '⚡ ASAP' : 'Scheduled'}
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

export default UserDashboard;
