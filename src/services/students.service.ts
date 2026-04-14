import { supabase } from './supabase';
import { resetStudentPassword as authResetStudentPassword } from './auth.service';
import type { Student } from '../types';

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

function mapStudentError(error: { code?: string; message: string; details?: string | null }): string {
  if (error.code === '23505') {
    if (error.details?.includes('reg_number')) return 'A student with this registration number already exists.';
    if (error.details?.includes('email')) return 'A student with this email already exists.';
  }
  return error.message;
}

export async function createStudent(data: {
  reg_number: string;
  student_name: string;
  father_name?: string;
  mobile_number?: string;
  email: string;
  password: string;
  section_id: string;
}): Promise<Student> {
  const { email, password, ...studentFields } = data;

  const userId = await createAuthUser(email, password, 'Student');

  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert({ id: userId, email, ...studentFields })
    .select()
    .single();

  if (studentError) {
    throw new Error(mapStudentError(studentError));
  }

  return student as Student;
}

export async function listStudents(filters?: {
  sessionId?: string;
  sectionId?: string;
  search?: string;
}): Promise<Student[]> {
  let query = supabase.from('students').select('*');
  if (filters?.sectionId) query = query.eq('section_id', filters.sectionId);
  if (filters?.search) {
    const term = `%${filters.search}%`;
    query = query.or(`student_name.ilike.${term},reg_number.ilike.${term}`);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Student[];
}

export async function updateStudent(
  id: string,
  data: Partial<Pick<Student, 'student_name' | 'father_name' | 'mobile_number'>>
): Promise<Student> {
  const { data: student, error } = await supabase
    .from('students')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return student as Student;
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function resetStudentPassword(studentId: string, newPassword: string): Promise<void> {
  return authResetStudentPassword(studentId, newPassword);
}
