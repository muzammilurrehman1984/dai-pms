import { supabase } from './supabase';
import type { Session } from '../types';

const SESSION_NAME_REGEX = /^\d{4} (Spring|Fall)$/;

export async function createSession(sessionName: string): Promise<Session> {
  if (!SESSION_NAME_REGEX.test(sessionName)) {
    throw new Error("Session name must be in the format 'YYYY Spring' or 'YYYY Fall'.");
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert({ session_name: sessionName })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('A session with this name already exists.');
    throw new Error(error.message);
  }

  const session = data as Session;

  const { error: semesterError } = await supabase
    .from('semesters')
    .insert([
      { session_id: session.id, semester_number: 7 },
      { session_id: session.id, semester_number: 8 },
    ]);

  if (semesterError) throw new Error(semesterError.message);

  return session;
}

export async function listSessions(): Promise<Session[]> {
  const { data, error } = await supabase.from('sessions').select('*');
  if (error) throw new Error(error.message);
  return (data ?? []) as Session[];
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from('sessions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
