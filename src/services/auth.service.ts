import { supabase } from './supabase';

function mapAuthError(error: { code?: string; message: string }): string {
  if (error.code === 'invalid_credentials' || error.message === 'Invalid login credentials') {
    return 'Invalid email or password.';
  }
  if (error.code === 'email_not_confirmed') {
    return 'Please confirm your email before logging in.';
  }
  return error.message;
}

export async function login(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(mapAuthError(error));
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export async function changePassword(newPassword: string): Promise<void> {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);

  const userId = data.user?.id;
  if (userId) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ password_changed: true })
      .eq('id', userId);
    if (profileError) throw new Error(profileError.message);
  }
}

export async function resetStudentPassword(studentId: string, newPassword: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ userId: studentId, newPassword }),
    }
  );

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Failed to reset password.');
}

export async function resetSupervisorPassword(supervisorId: string, newPassword: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ userId: supervisorId, newPassword }),
    }
  );

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Failed to reset password.');
}
