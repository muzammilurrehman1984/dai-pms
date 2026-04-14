import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRealtimeChannel } from '../../hooks/useRealtimeChannel';
import { listAllocations } from '../../services/allocations.service';
import { listMessages, sendMessage } from '../../services/messages.service';
import { listStudents } from '../../services/students.service';
import { formatDateTime } from '../../utils/formatters';
import type { Message, Student } from '../../types';

function formatTime(iso: string): string {
  return formatDateTime(iso);
}

export function ChatWindow() {
  const { user } = useAuth();
  const supervisorId = user?.id ?? '';

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Keep a ref so the realtime callback always sees the current selected student
  const selectedStudentRef = useRef<Student | null>(null);
  function selectStudent(s: Student | null) {
    selectedStudentRef.current = s;
    setSelectedStudent(s);
  }

  // Load assigned students
  useEffect(() => {
    if (!supervisorId) return;
    setLoadingStudents(true);
    listAllocations({ supervisorId })
      .then(async (allocations) => {
        const studentIds = allocations.map((a) => a.student_id);
        if (studentIds.length === 0) { setStudents([]); return; }
        const all = await listStudents();
        setStudents(all.filter((s) => studentIds.includes(s.id)));
      })
      .catch(console.error)
      .finally(() => setLoadingStudents(false));
  }, [supervisorId]);

  // Load messages when student selected
  useEffect(() => {
    if (!selectedStudent || !supervisorId) return;
    listMessages(supervisorId, selectedStudent.id)
      .then(setMessages)
      .catch(console.error);
  }, [selectedStudent, supervisorId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription — use ref to avoid stale closure on selectedStudent
  useRealtimeChannel<Message>({
    channelName: `messages:supervisor:${supervisorId}`,
    table: 'messages',
    onInsert: (msg) => {
      const current = selectedStudentRef.current;
      if (!current) return;
      const relevant =
        (msg.sender_id === supervisorId && msg.recipient_id === current.id) ||
        (msg.sender_id === current.id && msg.recipient_id === supervisorId);
      if (!relevant) return;
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
    },
  });

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !selectedStudent || !supervisorId) return;
    setSending(true);
    try {
      const sent = await sendMessage(supervisorId, selectedStudent.id, body.trim());
      setBody('');
      // Optimistically append — realtime may also fire but dedup handles it
      setMessages(prev => prev.some(m => m.id === sent.id) ? prev : [...prev, sent]);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Conversation list */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Students</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingStudents ? (
            <p className="px-4 py-3 text-sm text-gray-400">Loading…</p>
          ) : students.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400 italic">No assigned students.</p>
          ) : (
            students.map((s) => (
              <button
                key={s.id}
                onClick={() => selectStudent(s)}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 ${
                  selectedStudent?.id === s.id ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700'
                }`}
              >
                <span className="block truncate">{s.student_name}</span>
                <span className="block text-xs text-gray-400 truncate">{s.reg_number}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Message thread */}
      <div className="flex-1 flex flex-col min-h-0">
        {!selectedStudent ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Select a student to start chatting
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-semibold text-gray-700">{selectedStudent.student_name}</p>
              <p className="text-xs text-gray-400">{selectedStudent.reg_number}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No messages yet.</p>
              )}
              {messages.map((m) => {
                const mine = m.sender_id === supervisorId;
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
          </>
        )}
      </div>
    </div>
  );
}

export default ChatWindow;
