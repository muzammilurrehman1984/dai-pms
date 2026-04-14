import { supabase } from './supabase';
import type { Message } from '../types';

export async function sendMessage(
  senderId: string,
  recipientId: string,
  body: string
): Promise<Message> {
  const { data: message, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, recipient_id: recipientId, body })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Insert notification for recipient — non-fatal if it fails
  await supabase
    .from('notifications')
    .insert({
      user_id: recipientId,
      type: 'new_message',
      payload: {
        message_id: (message as Message).id,
        sender_id: senderId,
      },
    });

  return message as Message;
}

export async function listMessages(
  userId1: string,
  userId2: string
): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${userId1},recipient_id.eq.${userId2}),and(sender_id.eq.${userId2},recipient_id.eq.${userId1})`
    )
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Message[];
}
