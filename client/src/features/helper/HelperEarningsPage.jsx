import React, { useState, useEffect } from 'react';
import {
  Card,
  Spinner,
  PageHeader,
  EmptyState,
  Badge,
} from '../../components/ui/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import api from '../../lib/api.js';

export function HelperEarningsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [earningsData, setEarningsData] = useState({
    total: 0,
    pending: 0,
    jobsCount: 0,
    jobs: [],
  });

  useEffect(() => {
    async function loadEarnings() {
      try {
        const data = await api.get('/helpers/me/earnings');
        setEarningsData(data);
      } catch (err) {
        toast.error('Failed to load earnings: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadEarnings();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Earnings & Payouts"
        subtitle="Track your platform payout totals, completed jobs, and commission deductions"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <Card className="p-6 text-center border-t-4 border-t-emerald-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Paid Out
          </span>
          <div className="text-3xl font-extrabold text-emerald-600">
            ₹{earningsData.total || 0}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Net earnings credited</span>
        </Card>

        <Card className="p-6 text-center border-t-4 border-t-amber-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Pending Settlement
          </span>
          <div className="text-3xl font-extrabold text-amber-600">
            ₹{earningsData.pending || 0}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">In processing or dispute</span>
        </Card>

        <Card className="p-6 text-center border-t-4 border-t-primary-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Paid Jobs Count
          </span>
          <div className="text-3xl font-extrabold text-slate-900">
            {earningsData.jobsCount || 0}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Successfully completed</span>
        </Card>
      </div>

      {/* Jobs / Payment History Table */}
      <Card title="Payment History">
        {earningsData.jobs.length === 0 ? (
          <EmptyState
            icon="💸"
            title="No earnings history yet"
            description="Once you accept requests, complete tasks, and clients confirm payment, your payouts will show up here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Job Amount</th>
                  <th className="py-3 px-4">Platform Fee</th>
                  <th className="py-3 px-4 font-bold text-slate-800">Your Payout</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {earningsData.jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-800 capitalize">
                      {job.subcategory}
                    </td>
                    <td className="py-3 px-4 text-slate-600">₹{job.amount}</td>
                    <td className="py-3 px-4 text-rose-500">-₹{job.platformFee}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">₹{job.helperPayout}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={job.status === 'paid' ? 'success' : 'warning'}
                        size="sm"
                        className="capitalize"
                      >
                        {job.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {job.date ? new Date(job.date).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default HelperEarningsPage;
