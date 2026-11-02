import React, { useState } from 'react';
import {
  Card,
  Button,
  Textarea,
  Badge,
  Modal,
} from '../../components/ui/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import api from '../../lib/api.js';
import { REQUEST_STATUS } from '@shared/constants.js';

function DisputeComponent({ request, user, onRefresh }) {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isDisputed = request.status === REQUEST_STATUS.DISPUTED;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      toast.error('Please describe the problem in at least 5 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/reports', {
        requestId: request._id,
        reason: reason.trim(),
      });
      toast.success('Dispute report filed successfully. Platform admin will review it.');
      setShowModal(false);
      setReason('');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.message || 'Failed to file dispute');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-red-100 bg-slate-50/50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>⚠️</span>
            Need Help or Have an Issue?
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {isDisputed
              ? 'This service request is currently disputed and locked under administrator review.'
              : 'If there is an unresolved problem, quality issue, or dispute, you can report it to Helpio support.'}
          </p>
        </div>

        {isDisputed ? (
          <Badge variant="danger" size="md">
            Under Dispute Review
          </Badge>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowModal(true)}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 shrink-0"
          >
            File a Dispute
          </Button>
        )}
      </div>

      {/* Dispute Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="File a Service Dispute"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={submitting}
              onClick={handleSubmit}
            >
              Submit Dispute
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Filing a dispute on completed or paid requests will place the transaction on hold until an administrator reviews and resolves it.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Reason / Problem Description <span className="text-red-500">*</span>
            </label>
            <Textarea
              rows={4}
              maxLength={1000}
              placeholder="Please explain the issue in detail..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              helperText={`${reason.length}/1000 characters`}
            />
          </div>
        </div>
      </Modal>
    </Card>
  );
}

export default {
  id: 'dispute',
  order: 60,
  visibleWhen: (request, user) => {
    if (!request || !user) return false;
    const userId = user._id || user.id;
    const ownerId = request.user?._id || request.user?.id || request.user;
    const helperId = request.helper?._id || request.helper?.id || request.helper;

    const isParticipant =
      String(ownerId) === String(userId) ||
      String(helperId) === String(userId) ||
      (user.roles && user.roles.includes('admin'));

    const isAllowedStatus = [
      REQUEST_STATUS.ACCEPTED,
      REQUEST_STATUS.IN_PROGRESS,
      REQUEST_STATUS.COMPLETED,
      REQUEST_STATUS.PAID,
      REQUEST_STATUS.DISPUTED,
    ].includes(request.status);

    return isParticipant && isAllowedStatus;
  },
  Component: DisputeComponent,
};
