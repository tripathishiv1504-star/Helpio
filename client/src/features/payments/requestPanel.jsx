import React, { useState } from 'react';
import {
  Card,
  Button,
  Badge,
  Spinner,
} from '../../components/ui/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import api from '../../lib/api.js';
import { REQUEST_STATUS, PRICING_TYPE } from '@shared/constants.js';

function PaymentComponent({ request, user, onRefresh }) {
  const { toast } = useToast();
  const [paying, setPaying] = useState(false);

  const amount = Number(request.finalAmount || request.budget || 0);
  const platformFee = Math.round((amount * 10) / 100);
  const helperPayout = amount - platformFee;

  const isCompleted = request.status === REQUEST_STATUS.COMPLETED;
  const isPaidOrRated = [REQUEST_STATUS.PAID, REQUEST_STATUS.RATED].includes(request.status);

  const handlePay = async () => {
    setPaying(true);
    try {
      await api.post(`/payments/${request._id}/pay`);
      toast.success(`Payment of ₹${amount} completed successfully!`);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50/40 via-white to-teal-50/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-100">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="text-xl">💳</span>
            {isCompleted ? 'Payment Due' : 'Payment Receipt'}
          </h3>
          <p className="text-xs text-slate-500">
            {isCompleted
              ? 'The helper has completed the service. Please review and settle payment.'
              : 'Payment has been processed and credited to the helper.'}
          </p>
        </div>
        <Badge variant={isCompleted ? 'warning' : 'success'} size="md">
          {isCompleted ? 'Pending Payment' : 'Paid'}
        </Badge>
      </div>

      <div className="mt-4 bg-white rounded-lg p-4 border border-slate-200 space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-600">Helper Service ({request.subcategory || 'Service'}):</span>
          <span className="font-semibold text-slate-900">₹{amount}</span>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Helper Payout (90%):</span>
          <span>₹{helperPayout}</span>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500">
          <span>Helpio Platform Fee (10%):</span>
          <span>₹{platformFee}</span>
        </div>

        <div className="flex justify-between items-center text-base font-bold text-slate-900 pt-3 border-t border-slate-200">
          <span>Total Amount:</span>
          <span className="text-teal-900 text-lg">₹{amount}</span>
        </div>
      </div>

      {isCompleted && (
        <div className="mt-5 space-y-3">
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs text-teal-900 flex items-center gap-2">
            <span>🛡️</span>
            <span>
              Helpio Simulated Checkout: Payment will be securely simulated and released immediately to the helper.
            </span>
          </div>

          <Button
            variant="primary"
            className="w-full sm:w-auto font-bold px-8 shadow-sm"
            loading={paying}
            onClick={handlePay}
          >
            Pay Now ₹{amount}
          </Button>
        </div>
      )}

      {isPaidOrRated && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-900">
          <span className="text-base">✅</span>
          <div>
            <span className="font-bold">Payment Verified</span> — Settle completed via Helpio Simulated Gateway.
          </div>
        </div>
      )}
    </Card>
  );
}

export default {
  id: 'pay',
  order: 35,
  visibleWhen: (request, user) => {
    if (!request || !user) return false;
    // Free jobs skip payment
    if (request.pricingType === PRICING_TYPE.FREE) return false;

    const userId = user._id || user.id;
    const ownerId = request.user?._id || request.user?.id || request.user;
    const isOwner = String(ownerId) === String(userId);
    const isAdmin = user.roles && user.roles.includes('admin');

    const isPayableOrPaid = [
      REQUEST_STATUS.COMPLETED,
      REQUEST_STATUS.PAID,
      REQUEST_STATUS.RATED,
    ].includes(request.status);

    return (isOwner || isAdmin) && isPayableOrPaid;
  },
  Component: PaymentComponent,
};
