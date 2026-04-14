import { supabase } from './supabase';
import type { Meeting, MeetingScope, MeetingStatus } from '../types';

const MAX_APPROVED_MEETINGS = 10;

export async function createMeeting(data: {
  supervisor_id: string;
  semester_id: string;
  scope: MeetingScope;
  scheduled_at: string;
  student_ids: string[];
}): Promise<Meeting> {
  // Fetch approved meeting IDs for this semester
  const { data: approvedMeetings, error: approvedError } = await supabase
    .from('meetings')
    .select('id')
    .eq('semester_id', data.semester_id)
    .eq('status', 'Approved');

  if (approvedError) throw new Error(approvedError.message);

  const approvedMeetingIds = (approvedMeetings ?? []).map((m: { id: string }) => m.id);

  // Check 10-meeting cap per student per semester
  for (const studentId of data.student_ids) {
    if (approvedMeetingIds.length > 0) {
      const { count, error: countError } = await supabase
        .from('meeting_participants')
        .select('meeting_id', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .in('meeting_id', approvedMeetingIds);

      if (countError) throw new Error(countError.message);

      if ((count ?? 0) >= MAX_APPROVED_MEETINGS) {
        throw new Error(
          `Student ${studentId} has reached the maximum of 10 approved meetings for this semester.`
        );
      }
    }
  }

  // Insert meeting
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .insert({
      supervisor_id: data.supervisor_id,
      semester_id: data.semester_id,
      scope: data.scope,
      scheduled_at: data.scheduled_at,
    })
    .select()
    .single();

  if (meetingError) throw new Error(meetingError.message);

  const created = meeting as Meeting;

  // Insert participants
  const participants = data.student_ids.map((student_id) => ({
    meeting_id: created.id,
    student_id,
    marks: 0,
  }));

  const { error: participantsError } = await supabase
    .from('meeting_participants')
    .insert(participants);

  if (participantsError) throw new Error(participantsError.message);

  return created;
}

export async function updateMeeting(
  meetingId: string,
  data: { status?: MeetingStatus; scheduled_at?: string }
): Promise<Meeting> {
  const { data: updated, error } = await supabase
    .from('meetings')
    .update(data)
    .eq('id', meetingId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const meeting = updated as Meeting;

  if (data.status === 'Approved') {
    const { error: marksError } = await supabase
      .from('meeting_participants')
      .update({ marks: 2 })
      .eq('meeting_id', meetingId);

    if (marksError) throw new Error(marksError.message);
  } else if (data.status === 'Rejected') {
    const { error: marksError } = await supabase
      .from('meeting_participants')
      .update({ marks: 0 })
      .eq('meeting_id', meetingId);

    if (marksError) throw new Error(marksError.message);
  }

  return meeting;
}

export async function listMeetings(filters?: {
  supervisorId?: string;
  semesterId?: string;
  status?: MeetingStatus;
  studentId?: string;
}): Promise<(Meeting & { participants: string[] })[]> {
  let query = supabase.from('meetings').select('*');

  if (filters?.supervisorId) {
    query = query.eq('supervisor_id', filters.supervisorId);
  }
  if (filters?.semesterId) {
    query = query.eq('semester_id', filters.semesterId);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.studentId) {
    // Get meeting IDs where this student is a participant
    const { data: participations, error: partError } = await supabase
      .from('meeting_participants')
      .select('meeting_id')
      .eq('student_id', filters.studentId);

    if (partError) throw new Error(partError.message);

    const meetingIds = (participations ?? []).map(
      (p: { meeting_id: string }) => p.meeting_id
    );

    if (meetingIds.length === 0) return [];

    query = query.in('id', meetingIds);
  }

  const { data: meetings, error } = await query;
  if (error) throw new Error(error.message);

  const meetingList = (meetings ?? []) as Meeting[];

  if (meetingList.length === 0) return [];

  // Fetch all participants for these meetings in one query
  const meetingIds = meetingList.map((m) => m.id);
  const { data: allParticipants, error: partError } = await supabase
    .from('meeting_participants')
    .select('meeting_id, student_id')
    .in('meeting_id', meetingIds);

  if (partError) throw new Error(partError.message);

  const participantsByMeeting = new Map<string, string[]>();
  for (const p of allParticipants ?? []) {
    const entry = participantsByMeeting.get(p.meeting_id) ?? [];
    entry.push(p.student_id);
    participantsByMeeting.set(p.meeting_id, entry);
  }

  return meetingList.map((m) => ({
    ...m,
    participants: participantsByMeeting.get(m.id) ?? [],
  }));
}
