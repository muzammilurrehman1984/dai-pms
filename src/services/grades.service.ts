import { supabase } from './supabase';
import { computeTotal, computeGrade } from '../utils/grading';
import { compareRegNumbers } from '../utils/formatters';
import type { GradeComponents, Student } from '../types';

export interface SectionReportRow {
  student: Student;
  components: GradeComponents;
  total: number;
  grade: string;
}

export async function getStudentGrades(
  studentId: string,
  semesterId: string
): Promise<{ total: number; grade: string; components: GradeComponents }> {
  // Fetch semester number
  const { data: semesterData, error: semesterError } = await supabase
    .from('semesters')
    .select('semester_number')
    .eq('id', semesterId)
    .single();

  if (semesterError) throw new Error(semesterError.message);

  const semesterNumber = (semesterData as { semester_number: 7 | 8 }).semester_number;

  // Fetch all submissions for this student/semester
  const { data: submissions, error: submissionsError } = await supabase
    .from('submissions')
    .select('submission_type, marks')
    .eq('student_id', studentId)
    .eq('semester_id', semesterId);

  if (submissionsError) throw new Error(submissionsError.message);

  // Build a map of submission_type -> marks
  const submissionMap = new Map<string, number>();
  for (const s of submissions ?? []) {
    submissionMap.set(s.submission_type as string, s.marks as number);
  }

  // Fetch meeting marks: sum of meeting_participants.marks for approved meetings in this semester
  const { data: approvedMeetings, error: meetingsError } = await supabase
    .from('meetings')
    .select('id')
    .eq('semester_id', semesterId)
    .eq('status', 'Approved');

  if (meetingsError) throw new Error(meetingsError.message);

  const approvedMeetingIds = (approvedMeetings ?? []).map((m: { id: string }) => m.id);

  let meetingMarks = 0;
  if (approvedMeetingIds.length > 0) {
    const { data: participantRows, error: participantError } = await supabase
      .from('meeting_participants')
      .select('marks')
      .eq('student_id', studentId)
      .in('meeting_id', approvedMeetingIds);

    if (participantError) throw new Error(participantError.message);

    meetingMarks = (participantRows ?? []).reduce(
      (sum: number, row: { marks: number }) => sum + (row.marks ?? 0),
      0
    );
  }

  // Build GradeComponents based on semester number
  let components: GradeComponents;
  if (semesterNumber === 7) {
    components = {
      semesterNumber: 7,
      projectApproval: submissionMap.get('Project Approval') ?? 0,
      srs: submissionMap.get('SRS') ?? 0,
      sdd: submissionMap.get('SDD') ?? 0,
      meetingMarks,
    };
  } else {
    components = {
      semesterNumber: 8,
      finalDocumentation: submissionMap.get('Final Documentation') ?? 0,
      finalProjectCode: submissionMap.get('Final Project Code') ?? 0,
      meetingMarks,
    };
  }

  const total = computeTotal(components);
  const grade = computeGrade(total);

  return { total, grade, components };
}

export async function getSectionReport(
  sectionId: string,
  semesterId: string
): Promise<SectionReportRow[]> {
  // Fetch all students in the section
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('*')
    .eq('section_id', sectionId);

  if (studentsError) throw new Error(studentsError.message);

  const studentList = (students ?? []) as Student[];

  // For each student, compute grades
  const rows = await Promise.all(
    studentList.map(async (student) => {
      const { total, grade, components } = await getStudentGrades(student.id, semesterId);
      return { student, components, total, grade };
    })
  );

  // Sort by reg_number using compareRegNumbers
  return rows.sort((a, b) => compareRegNumbers(a.student.reg_number, b.student.reg_number));
}
