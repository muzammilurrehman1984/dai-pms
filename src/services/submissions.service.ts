import { supabase } from './supabase';
import type { Submission, SubmissionDeadline, SubmissionType, SubmissionVersion } from '../types';

/**
 * Format a UTC ISO string for display in local timezone.
 * Output: "2026-April-12 11:59:59pm"
 */
export function formatDeadline(utcString: string | null | undefined): string {
  if (!utcString) return '—';
  const d = new Date(utcString);
  if (isNaN(d.getTime())) return '—';
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const pad = (n: number) => String(n).padStart(2, '0');
  const year  = d.getFullYear();
  const month = MONTHS[d.getMonth()];
  const day   = pad(d.getDate());
  const h24   = d.getHours();
  const h12   = pad(h24 % 12 === 0 ? 12 : h24 % 12);
  const ampm  = h24 < 12 ? 'am' : 'pm';
  const min   = pad(d.getMinutes());
  const sec   = pad(d.getSeconds());
  return `${year}-${month}-${day} ${h12}:${min}:${sec}${ampm}`;
}

export function utcToLocalInput(utcString: string | null | undefined): string {
  if (!utcString) return '';
  const d = new Date(utcString);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Convert a date input value (YYYY-MM-DD, local) to a UTC ISO string,
 * always at end-of-day 23:59:59.999 in the user's local timezone.
 */
export function localInputToUtc(localString: string | null | undefined): string | null {
  if (!localString) return null;
  // Parse as local midnight then set to end of day
  const d = new Date(`${localString}T23:59:59.999`);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function listDeadlines(semesterId: string): Promise<SubmissionDeadline[]> {
  const { data, error } = await supabase
    .from('submission_deadlines')
    .select('*')
    .eq('semester_id', semesterId);

  if (error) throw new Error(error.message);
  return (data ?? []) as SubmissionDeadline[];
}

export async function updateDeadline(
  semesterId: string,
  submissionType: SubmissionType,
  data: { is_locked: boolean; deadline?: string | null }
): Promise<SubmissionDeadline> {
  const { data: deadline, error } = await supabase
    .from('submission_deadlines')
    .upsert(
      {
        semester_id: semesterId,
        submission_type: submissionType,
        is_locked: data.is_locked,
        deadline: data.deadline ?? null,
      },
      { onConflict: 'semester_id,submission_type' }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return deadline as SubmissionDeadline;
}

const FYP_I_SEQUENCE: SubmissionType[] = ['Project Approval', 'SRS', 'SDD'];
const FYP_II_SEQUENCE: SubmissionType[] = ['Final Documentation', 'Final Project Code'];

export async function listSubmissions(studentId: string, semesterId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('student_id', studentId)
    .eq('semester_id', semesterId);

  if (error) throw new Error(error.message);
  return (data ?? []) as Submission[];
}

export async function listSubmissionVersions(submissionId: string): Promise<SubmissionVersion[]> {
  const { data, error } = await supabase
    .from('submission_versions')
    .select('*')
    .eq('submission_id', submissionId)
    .order('submitted_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as SubmissionVersion[];
}

export async function submitDocumentURL(
  studentId: string,
  semesterId: string,
  submissionType: SubmissionType,
  documentUrl: string,
  description?: string
): Promise<Submission> {
  // 1. Fetch deadline and check locked status
  const { data: deadlineData, error: deadlineError } = await supabase
    .from('submission_deadlines')
    .select('*')
    .eq('semester_id', semesterId)
    .eq('submission_type', submissionType)
    .maybeSingle();

  if (deadlineError) throw new Error(deadlineError.message);

  if (deadlineData?.is_locked) {
    throw new Error('Submissions are currently closed.');
  }

  // 2. Check deadline has not passed
  if (deadlineData?.deadline && new Date(deadlineData.deadline) < new Date()) {
    throw new Error('The submission deadline has passed.');
  }

  // 3. Check sequence: all preceding types must be 'Approved'
  const sequence = FYP_I_SEQUENCE.includes(submissionType) ? FYP_I_SEQUENCE : FYP_II_SEQUENCE;
  const currentIndex = sequence.indexOf(submissionType);

  if (currentIndex > 0) {
    const precedingTypes = sequence.slice(0, currentIndex);
    const { data: precedingSubmissions, error: seqError } = await supabase
      .from('submissions')
      .select('submission_type, status')
      .eq('student_id', studentId)
      .eq('semester_id', semesterId)
      .in('submission_type', precedingTypes);

    if (seqError) throw new Error(seqError.message);

    for (const precedingType of precedingTypes) {
      const found = (precedingSubmissions ?? []).find(
        (s) => s.submission_type === precedingType && s.status === 'Approved'
      );
      if (!found) {
        throw new Error(`Please complete ${precedingType} first.`);
      }
    }
  }

  // 4. Check existing submission status
  const { data: existing, error: existingError } = await supabase
    .from('submissions')
    .select('*')
    .eq('student_id', studentId)
    .eq('semester_id', semesterId)
    .eq('submission_type', submissionType)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing && (existing.status === 'Pending' || existing.status === 'Approved')) {
    throw new Error('A submission already exists for this type.');
  }

  // 5. Validate URL format
  if (!/^https?:\/\/.+/.test(documentUrl)) {
    throw new Error('Please provide a valid document URL.');
  }

  // 6. Upsert submission and insert version
  const { data: submission, error: upsertError } = await supabase
    .from('submissions')
    .upsert(
      {
        student_id: studentId,
        semester_id: semesterId,
        submission_type: submissionType,
        status: 'Pending',
        marks: 0,
        description: description?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,semester_id,submission_type' }
    )
    .select()
    .single();

  if (upsertError) throw new Error(upsertError.message);

  const { error: versionError } = await supabase
    .from('submission_versions')
    .insert({
      submission_id: (submission as Submission).id,
      document_url: documentUrl,
      description: description?.trim() || null,
    });

  if (versionError) throw new Error(versionError.message);

  return submission as Submission;
}

const MAX_MARKS: Record<SubmissionType, number> = {
  'Project Approval': 20,
  'SRS': 30,
  'SDD': 30,
  'Final Documentation': 40,
  'Final Project Code': 40,
};

export async function evaluateSubmission(
  submissionId: string,
  status: 'Approved' | 'Rejected' | 'Revision',
  _supervisorId: string,
  marks?: number
): Promise<Submission> {
  // 1. Fetch the submission
  const { data: submission, error: fetchError } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const sub = submission as Submission;

  // 2. Check deadline lock
  const { data: deadlineData, error: deadlineError } = await supabase
    .from('submission_deadlines')
    .select('is_locked')
    .eq('semester_id', sub.semester_id)
    .eq('submission_type', sub.submission_type)
    .maybeSingle();

  if (deadlineError) throw new Error(deadlineError.message);

  if (deadlineData?.is_locked) {
    throw new Error('Submissions are currently locked.');
  }

  // 3. Determine marks
  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'Approved') {
    // Use provided marks if given, otherwise fall back to max
    updatePayload.marks = marks !== undefined ? marks : MAX_MARKS[sub.submission_type];
  } else if (status === 'Rejected') {
    updatePayload.marks = 0;
  }
  // 'Revision' → marks unchanged

  // 4. Update the submission row
  const { data: updated, error: updateError } = await supabase
    .from('submissions')
    .update(updatePayload)
    .eq('id', submissionId)
    .select()
    .single();

  if (updateError) throw new Error(updateError.message);

  // Create notification for the student — non-fatal
  await supabase
    .from('notifications')
    .insert({
      user_id: sub.student_id,
      type: 'submission_evaluated',
      payload: {
        submission_id: submissionId,
        status,
        submission_type: sub.submission_type,
      },
    });

  return updated as Submission;
}

export async function listAllSubmissions(filters?: {
  supervisorId?: string;
  semesterId?: string;
  status?: string;
}): Promise<Submission[]> {
  let query = supabase.from('submissions').select('*');

  if (filters?.semesterId) {
    query = query.eq('semester_id', filters.semesterId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.supervisorId) {
    // Filter by supervisor via the allocations table
    const { data: allocations, error: allocError } = await supabase
      .from('allocations')
      .select('student_id')
      .eq('supervisor_id', filters.supervisorId);

    if (allocError) throw new Error(allocError.message);

    const studentIds = (allocations ?? []).map((a: { student_id: string }) => a.student_id);

    if (studentIds.length === 0) return [];

    query = query.in('student_id', studentIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Submission[];
}
