import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Badge,
  Spinner,
  EmptyState,
  PageHeader,
} from '../../components/ui/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import api from '../../lib/api.js';
import useSession from '../../lib/session.js';

export function PaymentsHistoryPage() {
  const { user } = useSession();
  const { toast } = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    try {
      const data = await api.get('/payments/mine');
      setPayments(data.payments || []);
    } catch (err) {
      toast.error('Failed to load payments: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="Payment History"
        subtitle="Review all transactions, platform fees, and helper payouts."
      />

      {loading ? (
        <div className="py-16 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon="💳"
          title="No transactions yet"
          description="Completed job payments will appear here."
        />
      ) : (
        <Card className="p-0 overflow-hidden border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Service</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5 text-right">Total Amount</th>
                  <th className="px-5 py-3.5 text-right">Platform Fee</th>
                  <th className="px-5 py-3.5 text-right">Helper Payout</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => {
                  const isCustomer =
                    p.request?.user?._id === user?.id ||
                    p.request?.user === user?.id;

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {new Date(p.createdAt).toLocaleDateString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-900 capitalize">
                        {p.request?.subcategory || 'Service'}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            isCustomer
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {isCustomer ? 'Customer' : 'Helper'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-slate-900">
                        ₹{p.amount}
                      </td>
                      <td className="px-5 py-4 text-right text-xs text-slate-500">
                        ₹{p.platformFee}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-teal-800">
                        ₹{p.helperPayout}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Badge variant="success" size="sm">
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default PaymentsHistoryPage;
