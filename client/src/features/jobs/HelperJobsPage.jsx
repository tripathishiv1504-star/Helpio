import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  Button,
  Badge,
  StatusBadge,
  Spinner,
  EmptyState,
  PageHeader,
} from '../../components/ui/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import api from '../../lib/api.js';
import { REQUEST_STATUS } from '@shared/constants.js';

export function HelperJobsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'past'
  const [loading, setLoading] = useState(true);
  const [activeJobs, setActiveJobs] = useState([]);
  const [pastJobs, setPastJobs] = useState([]);

  const fetchJobs = useCallback(async () => {
    try {
      const data = await api.get('/jobs');
      setActiveJobs(data.activeJobs || []);
      setPastJobs(data.pastJobs || []);
    } catch (err) {
      toast.error('Failed to load jobs: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const displayJobs = activeTab === 'active' ? activeJobs : pastJobs;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="My Jobs"
          subtitle="Manage active assignments, client communications, and past work history."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            fetchJobs();
          }}
          className="self-start sm:self-auto"
        >
          🔄 Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'active'
              ? 'border-teal-600 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Active Jobs</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'active'
                ? 'bg-teal-100 text-teal-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {activeJobs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('past')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'past'
              ? 'border-teal-600 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Past Jobs</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'past'
                ? 'bg-teal-100 text-teal-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {pastJobs.length}
          </span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : displayJobs.length === 0 ? (
        <EmptyState
          icon={activeTab === 'active' ? '⚡' : '📜'}
          title={activeTab === 'active' ? 'No active jobs' : 'No past jobs yet'}
          description={
            activeTab === 'active'
              ? 'You do not have any accepted or in-progress jobs right now. Check your incoming offers to accept new requests!'
              : 'Completed and past service requests will be archived here.'
          }
          action={
            activeTab === 'active' ? (
              <Link to="/helper/offers">
                <Button variant="primary">View Incoming Offers</Button>
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayJobs.map((job) => (
            <Card
              key={job._id}
              className="flex flex-col justify-between hover:shadow-md transition-shadow border-slate-200"
            >
              <div className="space-y-3">
                {/* Header status and urgency */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={job.status} />
                    {job.urgency && (
                      <Badge
                        variant={
                          job.urgency === 'urgent'
                            ? 'warning'
                            : job.urgency === 'emergency'
                            ? 'danger'
                            : 'default'
                        }
                        size="sm"
                      >
                        {job.urgency}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(job.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {/* Service Title */}
                <div>
                  <h4 className="font-bold text-slate-900 capitalize text-base">
                    {job.subcategory || 'General Request'}
                  </h4>
                  <p className="text-xs text-teal-700 font-medium">
                    {job.category?.name || 'Service'}
                  </p>
                </div>

                {/* Description */}
                {job.description && (
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {job.description}
                  </p>
                )}

                {/* Location & Customer Info */}
                <div className="bg-slate-50 rounded-lg p-2.5 space-y-1.5 text-xs text-slate-700 border border-slate-100">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span>👤</span>
                    <span>{job.user?.name || 'Customer'}</span>
                    {job.user?.phone && (
                      <span className="text-slate-400">({job.user.phone})</span>
                    )}
                  </div>
                  <div className="flex items-start gap-1.5 text-slate-600">
                    <span className="shrink-0 mt-0.5">📍</span>
                    <span className="line-clamp-2">
                      {job.location?.address || 'Address available in request details'}
                    </span>
                  </div>
                </div>

                {/* Pricing summary */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-500 capitalize">
                    Pricing: <strong>{job.pricingType}</strong>
                  </span>
                  <span className="text-teal-900 font-bold">
                    {job.finalAmount !== undefined && job.finalAmount !== null
                      ? `₹${job.finalAmount}`
                      : job.budget
                      ? `Budget: ₹${job.budget}`
                      : 'Community Free'}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  ID: {job._id.slice(-6)}
                </span>
                <Link to={`/requests/${job._id}`}>
                  <Button variant="primary" size="sm">
                    Open Job & Controls →
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default HelperJobsPage;
