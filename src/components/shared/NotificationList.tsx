import { useCallback } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../hooks/useAuth';
import { useRealtimeChannel } from '../../hooks/useRealtimeChannel';
import { markAsRead, markAllAsRead } from '../../services/notifications.service';
import { formatDate } from '../../utils/formatters';
import type { Notification } from '../../types';

const TYPE_LABELS: Record<string, string> = {
  submission_graded: 'Submission Graded',
  meeting_scheduled: 'Meeting Scheduled',
  meeting_status_changed: 'Meeting Updated',
  comment_added: 'New Comment',
  deadline_reminder: 'Deadline Reminder',
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(iso);
}

interface NotificationListProps {
  onClose?: () => void;
}

export function NotificationList({ onClose }: NotificationListProps) {
  const { user } = useAuth();
  const { notifications, unreadCount, loading } = useNotifications();

  // Subscribe to new notifications via realtime
  useRealtimeChannel<Notification>({
    channelName: `notification-list:${user?.id ?? 'anon'}`,
    table: 'notifications',
    filter: user ? `user_id=eq.${user.id}` : undefined,
  });

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      await markAsRead(notificationId);
    },
    []
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (!user) return;
    await markAllAsRead(user.id);
  }, [user]);

  // Sort: unread first, then read; within each group newest first
  const sorted = [...notifications].sort((a, b) => {
    if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="flex flex-col w-80 max-h-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-800">
          Notifications {unreadCount > 0 && (
            <span className="ml-1 text-xs font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5">
              {unreadCount}
            </span>
          )}
        </span>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-6">Loading...</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No notifications</p>
        ) : (
          sorted.map((n) => (
            <button
              key={n.id}
              onClick={async () => {
                if (!n.is_read) await handleMarkAsRead(n.id);
                onClose?.();
              }}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                !n.is_read ? 'bg-blue-50' : ''
              }`}
            >
              {/* Unread dot */}
              <span
                className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${
                  n.is_read ? 'bg-transparent' : 'bg-blue-500'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700 truncate">
                  {TYPE_LABELS[n.type] ?? n.type}
                </p>
                {n.payload && typeof n.payload.message === 'string' && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {n.payload.message}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">{formatTimestamp(n.created_at)}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
