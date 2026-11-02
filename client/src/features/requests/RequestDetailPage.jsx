import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Button,
  StatusBadge,
  Spinner,
  PageHeader,
  Modal,
} from '../../components/ui/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import api from '../../lib/api.js';
import useSession from '../../lib/session.js';
import { REQUEST_STATUS } from '@shared/constants.js';

// Dynamically discover all request detail panels from features/*/requestPanel.jsx
const panelModules = import.meta.glob('../features/*/requestPanel.jsx', { eager: true });

export function RequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const { toast } = useToast();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchRequest = useCallback(async () => {
    try {
      const data = await api.get(`/requests/${id}`);
      setRequest(data.request);
    } catch (err) {
      toast.error('Failed to load request: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  // Aggregate panels from all feature modules
  const panels = [];
  for (const path in panelModules) {
    const exported = panelModules[path].default;
    if (Array.isArray(exported)) {
      panels.push(...exported);
    } else if (exported && typeof exported === 'object') {
      panels.push(exported);
    }
  }

  // Sort panels by order
  panels.sort((a, b) => (a.order || 99) - (b.order || 99));

  // Determine if cancel button is available
  const isOwner =
    request && user && (request.user?._id === user.id || request.user === user.id);
  const canCancel =
    isOwner &&
    [
      REQUEST_STATUS.POSTED,
      REQUEST_STATUS.OFFERED,
      REQUEST_STATUS.ACCEPTED,
    ].includes(request.status);

  const handleCancelRequest = async () => {
    setCancelling(true);
    try {
      const res = await api.post(`/requests/${id}/cancel`);
      setRequest(res.request);
      setShowCancelModal(false);
      toast.info('Request has been cancelled.');
    } catch (err) {
      toast.error(err.message || 'Failed to cancel request');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Request Not Found</h2>
        <p className="text-slate-500 text-sm mb-6">
          The requested service request could not be found or you do not have permission to view it.
        </p>
        <Link to="/dashboard">
          <Button variant="primary">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/requests" className="text-xs text-primary-600 hover:underline">
              ← Back to Requests
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs text-slate-400 font-mono">#{request._id.slice(-6)}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 capitalize">
              {request.subcategory}
            </h1>
            <StatusBadge status={request.status} />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Posted by <span className="font-semibold">{request.user?.name || 'You'}</span> on{' '}
            {new Date(request.createdAt).toLocaleDateString()}
          </p>
        </div>

        {canCancel && (
          <div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowCancelModal(true)}
            >
              Cancel Request
            </Button>
          </div>
        )}
      </div>

      {/* Render Registered Request Panels */}
      <div className="space-y-6">
        {panels
          .filter((panel) => {
            if (typeof panel.visibleWhen === 'function') {
              try {
                return panel.visibleWhen(request, user);
              } catch {
                return false;
              }
            }
            return true;
          })
          .map((panel) => {
            const PanelComponent = panel.Component;
            return (
              <PanelComponent
                key={panel.id || panel.order}
                request={request}
                user={user}
                onRefresh={fetchRequest}
              />
            );
          })}
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Service Request?"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCancelModal(false)}
            >
              Keep Request
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={cancelling}
              onClick={handleCancelRequest}
            >
              Confirm Cancellation
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to cancel this request? Once cancelled, nearby helpers will no longer
          be matched, and the request cannot be resumed.
        </p>
      </Modal>
    </div>
  );
}

export default RequestDetailPage;
