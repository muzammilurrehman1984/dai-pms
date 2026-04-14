import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import type { Notification } from '../types';

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
}

export function useNotifications(): UseNotificationsResult {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    async function fetchNotifications() {
      setLoading(true);
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      setNotifications((data as Notification[]) ?? []);
      setLoading(false);
    }

    fetchNotifications();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, unreadCount, loading };
}
