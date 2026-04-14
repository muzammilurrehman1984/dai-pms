export type Role = 'Department_Admin' | 'Supervisor' | 'Student';
export type SubmissionType = 'Project Approval' | 'SRS' | 'SDD' | 'Final Documentation' | 'Final Project Code';
export type SubmissionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Revision';
export type MeetingScope = 'Individual' | 'Group' | 'All';
export type MeetingStatus = 'Pending' | 'Approved' | 'Rejected' | 'Re-scheduled';

export interface Session { id: string; session_name: string; created_at: string; }
export interface Semester { id: string; session_id: string; semester_number: 7 | 8; }
export interface Section { id: string; session_id: string; section_name: string; semester_number: 7 | 8 | null; }
export interface Student {
  id: string; reg_number: string; student_name: string;
  father_name: string | null; mobile_number: string | null;
  email: string; section_id: string;
}
export interface Supervisor {
  id: string; teacher_name: string; designation: string;
  expertise: string | null; mobile_number: string | null; email: string;
}
export interface Allocation {
  id: string; session_id: string; supervisor_id: string;
  student_id: string; section_id: string;
}
export interface SubmissionDeadline {
  id: string; semester_id: string; submission_type: SubmissionType;
  is_locked: boolean; deadline: string | null;
}
export interface Submission {
  id: string; student_id: string; semester_id: string;
  submission_type: SubmissionType; status: SubmissionStatus;
  marks: number; description: string | null; created_at: string; updated_at: string;
}
export interface SubmissionVersion {
  id: string; submission_id: string; document_url: string;
  description: string | null; submitted_at: string;
}
export interface Meeting {
  id: string; supervisor_id: string; semester_id: string;
  scope: MeetingScope; status: MeetingStatus; scheduled_at: string;
}
export interface MeetingParticipant {
  id: string; meeting_id: string; student_id: string; marks: number;
}
export interface Comment {
  id: string; submission_id: string; author_id: string;
  body: string; created_at: string;
}
export interface Message {
  id: string; sender_id: string; recipient_id: string;
  body: string; created_at: string;
}
export interface Notification {
  id: string; user_id: string; type: string;
  payload: Record<string, unknown> | null; is_read: boolean; created_at: string;
}
export interface Profile {
  id: string; role: Role; password_changed: boolean; created_at: string;
}
export interface GradeComponents {
  projectApproval?: number;
  srs?: number;
  sdd?: number;
  finalDocumentation?: number;
  finalProjectCode?: number;
  meetingMarks: number;
  semesterNumber: 7 | 8;
}
export interface RowError {
  row: number;
  reason: string;
}
export interface SortField<T> {
  key: keyof T;
  label: string;
}
export interface FilterConfig {
  key: string;
  label: string;
  options?: { value: string; label: string }[];
}
