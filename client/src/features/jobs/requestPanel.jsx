import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  Button,
  Input,
  Badge,
  StatusBadge,
  Spinner,
  EmptyState,
} from '../../components/ui/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import api from '../../lib/api.js';
import { REQUEST_STATUS, PRICING_TYPE } from '@shared/constants.js';

// Statuses where work controls are relevant
const WORK_CONTROL_STATUSES = [
  REQUEST_STATUS.ACCEPTED,
  REQUEST_STATUS.IN_PROGRESS,
  REQUEST_STATUS.COMPLETED,
  REQUEST_STATUS.PAID,
  REQUEST_STATUS.RATED,
];

// Statuses where chat is visible
const CHAT_VISIBLE_STATUSES = [
  REQUEST_STATUS.ACCEPTED,
  REQUEST_STATUS.IN_PROGRESS,
  REQUEST_STATUS.COMPLETED,
  REQUEST_STATUS.PAID,
  REQUEST_STATUS.RATED,
];

// Statuses where sending messages is active
const CHAT_ACTIVE_STATUSES = [
  REQUEST_STATUS.ACCEPTED,
  REQUEST_STATUS.IN_PROGRESS,
  REQUEST_STATUS.COMPLETED,
  REQUEST_STATUS.PAID,
];

/**
 * WorkControls Component for the assigned helper.
 */
function WorkControlsComponent({ request, onRequestUpdated, onRefresh }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [finalAmount, setFinalAmount] = useState(
    request.budget !== undefined && request.budget !== null ? String(request.budget) : ''
  );

  const isFree = request.pricingType === PRICING_TYPE.FREE;

  // Handle Start Job
  const handleStartJob = async () => {
    setSubmitting(true);
    try {
      const data = await api.post(`/jobs/${request._id}/start`);
      toast.success('Job marked as In Progress!');
      if (onRequestUpdated) onRequestUpdated(data.request);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.message || 'Failed to start job');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Complete Job
  const handleCompleteJob = async (e) => {
    if (e) e.preventDefault();

    if (!isFree) {
      const num = Number(finalAmount);
      if (!finalAmount || isNaN(num) || num <= 0) {
        toast.error('Please enter a valid final amount greater than 0.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = isFree ? {} : { finalAmount: Number(finalAmount) };
      const data = await api.post(`/jobs/${request._id}/complete`, payload);
      toast.success('Job marked as Completed!');
      if (onRequestUpdated) onRequestUpdated(data.request);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.message || 'Failed to complete job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-teal-200 bg-gradient-to-br from-teal-50/40 via-white to-amber-50/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-teal-100">
        <div>
          <h3 className="text-lg font-bold text-teal-950 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
            Helper Work Controls
          </h3>
          <p className="text-xs text-slate-500">
            You are the assigned helper for this service request.
          </p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {/* Customer & Location Details */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Customer Information
          </p>
          <p className="text-sm font-bold text-slate-900">
            {request.user?.name || 'Customer'}
          </p>
          {request.user?.phone && (
            <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
              <span>📞</span>
              <a
                href={`tel:${request.user.phone}`}
                className="text-teal-700 hover:underline font-medium"
              >
                {request.user.phone}
              </a>
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Exact Service Address
          </p>
          <p className="text-sm font-medium text-slate-800 break-words">
            {request.location?.address || 'Address provided upon assignment'}
          </p>
          {request.location?.coordinates && (
            <p className="text-xs text-slate-500 mt-1">
              Coordinates: {request.location.coordinates[1]?.toFixed(5)},{' '}
              {request.location.coordinates[0]?.toFixed(5)}
            </p>
          )}
        </div>
      </div>

      {/* Action Area based on status */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        {request.status === REQUEST_STATUS.ACCEPTED && (
          <div className="space-y-3">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs text-teal-900 leading-relaxed">
              <strong>Next Step:</strong> When you arrive at the location or start the service, click below to mark work started.
            </div>
            <Button
              variant="primary"
              className="w-full sm:w-auto font-semibold px-6 shadow-sm"
              loading={submitting}
              onClick={handleStartJob}
            >
              Start Job Now
            </Button>
          </div>
        )}

        {request.status === REQUEST_STATUS.IN_PROGRESS && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 leading-relaxed">
              <strong>Work is In Progress:</strong> Complete the requested tasks. Once finished, submit completion to request payment/ratings.
            </div>

            <form onSubmit={handleCompleteJob} className="space-y-3 max-w-md">
              {!isFree ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Final Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="e.g. 500"
                    value={finalAmount}
                    onChange={(e) => setFinalAmount(e.target.value)}
                    helperText={`Agreed pricing: ${request.pricingType}. (Budget was ₹${request.budget || 'N/A'})`}
                  />
                </div>
              ) : (
                <div className="text-xs text-slate-600 bg-slate-100 p-2.5 rounded border border-slate-200">
                  This is a <strong>Free Community Service</strong> (Final Amount: ₹0).
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full sm:w-auto font-semibold px-6 shadow-sm"
                loading={submitting}
              >
                Complete Job
              </Button>
            </form>
          </div>
        )}

        {[REQUEST_STATUS.COMPLETED, REQUEST_STATUS.PAID, REQUEST_STATUS.RATED].includes(
          request.status
        ) && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-900 text-xs">
            <div>
              <span className="font-bold text-sm block text-emerald-950">
                Work Successfully Completed
              </span>
              <span>
                Final Amount: <strong>₹{request.finalAmount || 0}</strong> ({request.pricingType})
              </span>
            </div>
            <Badge variant="success" size="md">
              {request.status}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Direct Chat Component between Requester and Assigned Helper.
 */
function ChatComponent({ request }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  const isChatActive = CHAT_ACTIVE_STATUSES.includes(request.status);

  // Fetch messages from server
  const fetchMessages = useCallback(async () => {
    try {
      const data = await api.get(`/jobs/${request._id}/messages`);
      setMessages(data.messages || []);
    } catch (err) {
      // Quiet fail on poll, but log
      console.warn('Chat poll failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, [request._id]);

  // Initial load
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Polling every 5 seconds while chat is active
  useEffect(() => {
    if (!isChatActive) return;

    const intervalId = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [fetchMessages, isChatActive]);

  // Auto-scroll to bottom on messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle Send Message
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending || !isChatActive) return;

    setSending(true);
    try {
      const data = await api.post(`/jobs/${request._id}/messages`, { text: trimmed });
      setText('');
      setMessages((prev) => [...prev, data.message]);
    } catch (err) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-[460px] p-0 overflow-hidden border-slate-200 shadow-sm">
      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <div>
            <h3 className="text-sm font-bold tracking-tight">Direct Job Chat</h3>
            <p className="text-[11px] text-slate-400">
              {isChatActive
                ? 'Live coordination between requester & helper (polls every 5s)'
                : 'Chat archived for completed job'}
            </p>
          </div>
        </div>
        <Badge variant={isChatActive ? 'success' : 'default'} size="sm">
          {isChatActive ? 'Live' : 'Archived'}
        </Badge>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/70">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Spinner size="md" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xl mb-2">
              👋
            </div>
            <p className="text-sm font-semibold text-slate-700">No messages yet</p>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Coordinate timing, directions, or ask questions directly here.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const senderName = msg.sender?.name || 'User';
            const roles = msg.sender?.roles || [];
            const isHelperRole = roles.includes('helper');
            const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div key={msg._id} className="flex flex-col space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-slate-800">{senderName}</span>
                  {isHelperRole && (
                    <span className="text-[10px] font-semibold uppercase bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded">
                      Helper
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400">{formattedTime}</span>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-xl rounded-tl-sm px-3.5 py-2 text-xs text-slate-800 shadow-2xs max-w-xl leading-relaxed whitespace-pre-wrap break-words">
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 bg-white border-t border-slate-200">
        {isChatActive ? (
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                rows="2"
                maxLength={1000}
                placeholder="Type a message... (Press Enter to send)"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
              />
              <span className="absolute bottom-2 right-2 text-[10px] text-slate-400">
                {text.length}/1000
              </span>
            </div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!text.trim() || sending}
              loading={sending}
              className="h-9 px-4 shrink-0 font-medium"
            >
              Send
            </Button>
          </form>
        ) : (
          <div className="text-center py-2 text-xs text-slate-500 bg-slate-100 rounded-md">
            Direct chat is closed for completed requests.
          </div>
        )}
      </div>
    </Card>
  );
}

// Export both panels
export default [
  {
    id: 'work-controls',
    order: 25,
    visibleWhen: (request, user) => {
      if (!request || !user) return false;
      const userId = user._id || user.id;
      const assignedHelperId =
        request.helper?._id || request.helper?.id || request.helper;
      const isAssignedHelper = assignedHelperId && String(assignedHelperId) === String(userId);
      const isAdmin = user.roles && user.roles.includes('admin');

      return (
        (isAssignedHelper || isAdmin) &&
        WORK_CONTROL_STATUSES.includes(request.status)
      );
    },
    Component: WorkControlsComponent,
  },
  {
    id: 'chat',
    order: 40,
    visibleWhen: (request, user) => {
      if (!request || !user) return false;
      // Chat shows nothing before acceptance
      if (!CHAT_VISIBLE_STATUSES.includes(request.status)) return false;

      const userId = user._id || user.id;
      const ownerId = request.user?._id || request.user?.id || request.user;
      const assignedHelperId =
        request.helper?._id || request.helper?.id || request.helper;

      const isParticipant =
        String(ownerId) === String(userId) ||
        String(assignedHelperId) === String(userId) ||
        (user.roles && user.roles.includes('admin'));

      return isParticipant;
    },
    Component: ChatComponent,
  },
];
