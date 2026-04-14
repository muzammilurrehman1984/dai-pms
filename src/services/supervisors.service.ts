import { supabase } from './supabase';
import type { Supervisor } from '../types';

async function createAuthUser(email: string, password: string, role: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password, role }),
    }
  );

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Failed to create user.');
  return json.id as string;
}

export async function createSupervisor(data: {
  teacher_name: string;
  designation: string;
  expertise?: string;
  mobile_number?: string;
  email: string;
  password: string;
}): Promise<Supervisor> {
  const { email, password, ...supervisorFields } = data;

  const userId = await createAuthUser(email, password, 'Supervisor');

  const { data: supervisor, error: supervisorError } = await supabase
    .from('supervisors')
    .insert({ id: userId, email, ...supervisorFields })
    .select()
    .single();

  if (supervisorError) {
    if (supervisorError.code === '23505') throw new Error('A supervisor with this email already exists.');
    throw new Error(supervisorError.message);
  }

  return supervisor as Supervisor;
}

export async function listSupervisors(filters?: {
  designation?: string;
  search?: string;
}): Promise<Supervisor[]> {
  let query = supabase.from('supervisors').select('*');
  if (filters?.designation) query = query.eq('designation', filters.designation);
  if (filters?.search) query = query.ilike('teacher_name', `%${filters.search}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Supervisor[];
}

export async function updateSupervisor(
  id: string,
  data: Partial<Pick<Supervisor, 'teacher_name' | 'designation' | 'expertise' | 'mobile_number'>>
): Promise<Supervisor> {
  const { data: supervisor, error } = await supabase
    .from('supervisors')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return supervisor as Supervisor;
}

export async function deleteSupervisor(id: string): Promise<void> {
  const { error } = await supabase.from('supervisors').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
