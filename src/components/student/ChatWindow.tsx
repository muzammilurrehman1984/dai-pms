import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRealtimeChannel } from '../../hooks/useRealtimeChannel';
import { listAllocations } from '../../services/allocations.service';
import { listMessages, sendMessage } from '../../services/messages.service';
import { listSupervisors } from '../../services/supervisors.service';
import { formatDateTime } from '../../utils/formatters';
import type { Message, Supervisor } from '../../types';

function formatTime(iso: string): string {
  return formatDateTime(iso);
}

export function ChatWindow() {
  const { user } = useAuth();
  const studentId = user?.id ?? '';

  const [supervisor, setSupervisor] = useState<Supervisor | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load assigned supervisor
  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    listAllocations({ studentId })
      .then(async (allocations) => {
        if (allocations.length === 0) return;
        const supervisorId = allocations[0].supervisor_id;
        const all = await listSupervisors();
        const found = all.find((s) => s.id === supervisorId) ?? null;
        setSupervisor(found);
        if (found) {
          const msgs = await listMessages(studentId, found.id);
          setMessages(msgs);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [studentId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription
  useRealtimeChannel<Message>({
    channelName: `messages:student:${studentId}`,
    table: 'messages',
    onInsert: (msg) => {
      if (!supervisor) return;
      const relevant =
        (msg.sender_id === studentId && msg.recipient_id === supervisor.id) ||
        (msg.sender_id === supervisor.id && msg.recipient_id === studentId);
      if (!relevant) return;
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
    },
  });

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !supervisor || !studentId) return;
    setSending(true);
    try {
      await sendMessage(studentId, supervisor.id, body.trim());
      setBody('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400 p-4">Loading…</p>;
  }

  if (!supervisor) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400 p-4">
        No supervisor assigned yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <p className="text-sm font-semibold text-gray-700">{supervisor.teacher_name}</p>
        <p className="text-xs text-gray-400">{supervisor.designation}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No messages yet.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === studentId;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-gray-400 mb-1">{formatTime(m.created_at)}</span>
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words ${
                  mine
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-gray-200 p-3 flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message…"
          rows={2}
          className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as unknown as React.FormEvent);
            }
          }}
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="self-end px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}

export default ChatWindow;
