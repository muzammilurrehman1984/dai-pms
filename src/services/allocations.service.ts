import { supabase } from './supabase';
import type { Allocation } from '../types';

export async function createAllocation(data: {
  session_id: string;
  supervisor_id: string;
  student_id: string;
  section_id: string;
}, forceOverwrite = false): Promise<Allocation> {
  if (forceOverwrite) {
    // Upsert: delete existing allocation for this student+session first, then insert
    await supabase
      .from('allocations')
      .delete()
      .eq('student_id', data.student_id)
      .eq('session_id', data.session_id);
  }

  const { data: allocation, error } = await supabase
    .from('allocations')
    .insert(data)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This student is already allocated to a supervisor in this session.');
    }
    throw new Error(error.message);
  }

  return allocation as Allocation;
}

export async function randomAllocate(
  sessionId: string,
  options?: { sectionId?: string; forceOverwrite?: boolean }
): Promise<Allocation[]> {
  const { sectionId, forceOverwrite = false } = options ?? {};

  // Fetch sections — scoped to sectionId if provided
  let sectionIds: string[];
  if (sectionId) {
    sectionIds = [sectionId];
  } else {
    const { data: sections, error: sectionsError } = await supabase
      .from('sections').select('id').eq('session_id', sessionId);
    if (sectionsError) throw new Error(sectionsError.message);
    sectionIds = (sections ?? []).map((s: { id: string }) => s.id);
  }

  if (sectionIds.length === 0) return [];

  // Fetch students in scope
  const { data: students, error: studentsError } = await supabase
    .from('students').select('id, section_id').in('section_id', sectionIds);
  if (studentsError) throw new Error(studentsError.message);

  let targets: { id: string; section_id: string }[];

  if (forceOverwrite) {
    // Overwrite all students in scope — delete existing allocations first
    const studentIds = (students ?? []).map((s: { id: string }) => s.id);
    if (studentIds.length > 0) {
      await supabase.from('allocations')
        .delete()
        .eq('session_id', sessionId)
        .in('student_id', studentIds);
    }
    targets = students ?? [];
  } else {
    // Only unallocated students
    const { data: existing, error: existingError } = await supabase
      .from('allocations').select('student_id').eq('session_id', sessionId);
    if (existingError) throw new Error(existingError.message);
    const allocatedIds = new Set((existing ?? []).map((a: { student_id: string }) => a.student_id));
    targets = (students ?? []).filter((s: { id: string }) => !allocatedIds.has(s.id));
  }

  if (targets.length === 0) return [];

  // Fetch supervisors
  const { data: supervisors, error: supervisorsError } = await supabase
    .from('supervisors').select('id');
  if (supervisorsError) throw new Error(supervisorsError.message);
  if (!supervisors || supervisors.length === 0) throw new Error('No supervisors available for allocation.');

  // Shuffle and round-robin distribute
  const shuffled = [...targets].sort(() => Math.random() - 0.5);
  const newAllocations = shuffled.map((student: { id: string; section_id: string }, index: number) => ({
    session_id: sessionId,
    supervisor_id: supervisors[index % supervisors.length].id,
    student_id: student.id,
    section_id: student.section_id,
  }));

  const { data: created, error: insertError } = await supabase
    .from('allocations').insert(newAllocations).select();
  if (insertError) throw new Error(insertError.message);

  return (created ?? []) as Allocation[];
}

export async function bulkAllocateCSV(
  sessionId: string,
  rows: { reg_number: string; supervisor_email: string; section_name: string }[],
  forceOverwrite = false
): Promise<{ successes: Allocation[]; failures: { row: number; reason: string }[] }> {
  const successes: Allocation[] = [];
  const failures: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const { reg_number, supervisor_email, section_name } = rows[i];
    const rowNum = i + 1;

    const { data: sectionData, error: sectionError } = await supabase
      .from('sections')
      .select('id')
      .eq('session_id', sessionId)
      .eq('section_name', section_name)
      .single();

    if (sectionError || !sectionData) {
      failures.push({ row: rowNum, reason: `Section "${section_name}" not found in this session.` });
      continue;
    }

    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('reg_number', reg_number)
      .eq('section_id', sectionData.id)
      .single();

    if (studentError || !studentData) {
      failures.push({ row: rowNum, reason: `Student with reg number "${reg_number}" not found in section "${section_name}".` });
      continue;
    }

    const { data: supervisorData, error: supervisorError } = await supabase
      .from('supervisors')
      .select('id')
      .eq('email', supervisor_email)
      .single();

    if (supervisorError || !supervisorData) {
      failures.push({ row: rowNum, reason: `Supervisor with email "${supervisor_email}" not found.` });
      continue;
    }

    try {
      const allocation = await createAllocation({
        session_id: sessionId,
        supervisor_id: supervisorData.id,
        student_id: studentData.id,
        section_id: sectionData.id,
      }, forceOverwrite);
      successes.push(allocation);
    } catch (err) {
      failures.push({ row: rowNum, reason: err instanceof Error ? err.message : 'Unknown error.' });
    }
  }

  return { successes, failures };
}

export async function listAllocations(filters?: {
  sessionId?: string;
  sectionId?: string;
  supervisorId?: string;
  studentId?: string;
}): Promise<Allocation[]> {
  let query = supabase.from('allocations').select('*');

  if (filters?.sessionId)    query = query.eq('session_id',    filters.sessionId);
  if (filters?.sectionId)    query = query.eq('section_id',    filters.sectionId);
  if (filters?.supervisorId) query = query.eq('supervisor_id', filters.supervisorId);
  if (filters?.studentId)    query = query.eq('student_id',    filters.studentId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Allocation[];
}

export async function deleteAllocation(id: string): Promise<void> {
  const { error } = await supabase.from('allocations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function bulkDeleteAllocations(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('allocations').delete().in('id', ids);
  if (error) throw new Error(error.message);
}

export async function updateAllocation(
  id: string,
  data: { supervisor_id: string }
): Promise<Allocation> {
  const { data: allocation, error } = await supabase
    .from('allocations')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return allocation as Allocation;
}
