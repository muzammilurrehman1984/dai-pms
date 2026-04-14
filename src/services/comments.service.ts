import { supabase } from './supabase';
import type { Comment } from '../types';

export async function addComment(
  submissionId: string,
  authorId: string,
  body: string,
  recipientId: string
): Promise<Comment> {
  const { data: comment, error } = await supabase
    .from('comments')
    .insert({ submission_id: submissionId, author_id: authorId, body })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const { error: notifError } = await supabase
    .from('notifications')
    .insert({
      user_id: recipientId,
      type: 'new_comment',
      payload: {
        submission_id: submissionId,
        comment_id: (comment as Comment).id,
        author_id: authorId,
      },
    });

  if (notifError) throw new Error(notifError.message);

  return comment as Comment;
}

export async function listComments(submissionId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Comment[];
}
