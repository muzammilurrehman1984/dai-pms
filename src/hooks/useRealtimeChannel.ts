import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

interface UseRealtimeChannelOptions<T> {
  channelName: string;
  table: string;
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: T) => void;
  onToast?: (message: string) => void;
}

const MAX_BACKOFF_MS = 30_000;

export function useRealtimeChannel<T>({
  channelName,
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onToast,
}: UseRealtimeChannelOptions<T>): void {
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    function subscribe() {
      const config: { event: '*'; schema: string; table: string; filter?: string } = {
        event: '*',
        schema: 'public',
        table,
      };
      if (filter) config.filter = filter;

      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { ...config, event: 'INSERT' }, (payload) => {
          onInsert?.(payload.new as T);
        })
        .on('postgres_changes', { ...config, event: 'UPDATE' }, (payload) => {
          onUpdate?.(payload.new as T);
        })
        .on('postgres_changes', { ...config, event: 'DELETE' }, (payload) => {
          onDelete?.(payload.old as T);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            retryCountRef.current = 0;
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (!mountedRef.current) return;

            onToast?.('Connection lost. Reconnecting...');
            supabase.removeChannel(channel);

            const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), MAX_BACKOFF_MS);
            retryCountRef.current += 1;

            retryTimerRef.current = setTimeout(() => {
              if (mountedRef.current) subscribe();
            }, delay);
          }
        });

      return channel;
    }

    const channel = subscribe();

    return () => {
      mountedRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, table, filter]);
}
