import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  Button,
  Spinner,
  EmptyState,
  PageHeader,
} from '../../components/ui/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import api from '../../lib/api.js';

export function NotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.get('/notifications');
      setNotifications(data.notifications || []);
    } catch (err) {
      toast.error('Failed to load notifications: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read.');
    } catch (err) {
      toast.error('Failed to mark all as read: ' + err.message);
    }
  };

  const handleMarkSingle = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch {
      // Non-critical
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Notifications"
          subtitle="Stay updated on service offers, order updates, customer chat, and payments."
        />
        {notifications.some((n) => !n.read) && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="self-start sm:self-auto"
          >
            Mark all as read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No notifications yet"
          description="Updates regarding your requests, offers, and chat will appear here."
        />
      ) : (
        <Card className="p-0 divide-y divide-slate-100 overflow-hidden border-slate-200">
          {notifications.map((n) => (
            <div
              key={n._id}
              className={`p-4 sm:p-5 flex items-start gap-4 transition-colors ${
                !n.read ? 'bg-teal-50/20' : 'hover:bg-slate-50/70'
              }`}
            >
              <span className="text-2xl mt-0.5 shrink-0">
                {n.type === 'offer:created'
                  ? '⚡'
                  : n.type === 'message:created'
                  ? '💬'
                  : n.type?.startsWith('status:')
                  ? '📋'
                  : '🔔'}
              </span>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-sm font-bold ${!n.read ? 'text-slate-900' : 'text-slate-700'}`}>
                    {n.payload?.title || 'Notification'}
                  </h4>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {new Date(n.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {n.payload?.message || ''}
                </p>

                <div className="pt-2 flex items-center gap-3">
                  {n.payload?.link && (
                    <Link
                      to={n.payload.link}
                      onClick={() => handleMarkSingle(n._id)}
                      className="text-xs font-semibold text-teal-800 hover:text-teal-950 underline"
                    >
                      View details →
                    </Link>
                  )}
                  {!n.read && (
                    <button
                      onClick={() => handleMarkSingle(n._id)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>

              {!n.read && (
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0 mt-2"></span>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export default NotificationsPage;
