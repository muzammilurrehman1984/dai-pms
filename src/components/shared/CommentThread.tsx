import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRealtimeChannel } from '../../hooks/useRealtimeChannel';
import { addComment, listComments } from '../../services/comments.service';
import { formatDateTime } from '../../utils/formatters';
import type { Comment } from '../../types';

interface CommentThreadProps {
  submissionId: string;
  recipientId: string;
}

function formatTime(iso: string): string {
  return formatDateTime(iso);
}

export function CommentThread({ submissionId, recipientId }: CommentThreadProps) {
  const { user, role } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listComments(submissionId).then(setComments).catch(console.error);
  }, [submissionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  useRealtimeChannel<Comment>({
    channelName: `comments:${submissionId}`,
    table: 'comments',
    filter: `submission_id=eq.${submissionId}`,
    onInsert: (newComment) => {
      setComments((prev) => {
        if (prev.some((c) => c.id === newComment.id)) return prev;
        return [...prev, newComment];
      });
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !user) return;
    setSubmitting(true);
    try {
      await addComment(submissionId, user.id, body.trim(), recipientId);
      setBody('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  function authorLabel(authorId: string): string {
    if (authorId === user?.id) return 'You';
    return role === 'Supervisor' ? 'Student' : 'Supervisor';
  }

  const isCurrentUser = (authorId: string) => authorId === user?.id;

  return (
    <div className="flex flex-col h-full">
      {/* Comment list */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {comments.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No comments yet.</p>
        )}
        {comments.map((c) => {
          const mine = isCurrentUser(c.author_id);
          return (
            <div
              key={c.id}
              className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
            >
              <span className="text-xs text-gray-500 mb-1">
                {authorLabel(c.author_id)} · {formatTime(c.created_at)}
              </span>
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words ${
                  mine
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}
              >
                {c.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment…"
          rows={2}
          className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
        />
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="self-end px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
