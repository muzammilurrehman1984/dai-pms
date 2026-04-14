import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Spinner } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import { useRealtimeChannel } from '../../hooks/useRealtimeChannel';
import { listAllocations } from '../../services/allocations.service';
import { listStudents } from '../../services/students.service';
import { listSubmissions } from '../../services/submissions.service';
import { getStudentGrades } from '../../services/grades.service';
import { supabase } from '../../services/supabase';
import type { Student, Submission, SubmissionStatus, SubmissionType } from '../../types';

const SUBMISSION_TYPES: SubmissionType[] = [
  'Project Approval', 'SRS', 'SDD', 'Final Documentation', 'Final Project Code',
];

function statusVariant(status: SubmissionStatus): 'warning' | 'success' | 'danger' | 'info' {
  switch (status) {
    case 'Pending': return 'warning';
    case 'Approved': return 'success';
    case 'Rejected': return 'danger';
    case 'Revision': return 'info';
  }
}

interface StudentRow {
  student: Student;
  semesterId: string;
  submissions: Submission[];
  approvedMeetingsCount: number;
  total: number;
  grade: string;
}

const SupervisorDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const supervisorId = user?.id ?? '';

  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!supervisorId) return;
    setLoading(true);
    setError('');
    try {
      const allocations = await listAllocations({ supervisorId });
      if (allocations.length === 0) {
        setRows([]);
        return;
      }

      const allStudents = await listStudents();
      const studentMap = new Map<string, Student>(allStudents.map((s) => [s.id, s]));

      // Build section_id → semester_id map via section.semester_number
      const sessionIds = [...new Set(allocations.map((a) => a.session_id))];
      const sectionSemesterMap = new Map<string, string>();
      for (const sessionId of sessionIds) {
        const [{ data: semesters }, { data: sections }] = await Promise.all([
          supabase.from('semesters').select('id, semester_number').eq('session_id', sessionId),
          supabase.from('sections').select('id, semester_number').eq('session_id', sessionId),
        ]);
        if (semesters && sections) {
          const semByNum = new Map(
            (semesters as { id: string; semester_number: number }[]).map(s => [s.semester_number, s.id])
          );
          for (const sec of sections as { id: string; semester_number: number | null }[]) {
            if (sec.semester_number && semByNum.has(sec.semester_number)) {
              sectionSemesterMap.set(sec.id, semByNum.get(sec.semester_number)!);
            }
          }
        }
      }

      const built = await Promise.all(
        allocations.map(async (allocation) => {
          const student = studentMap.get(allocation.student_id);
          if (!student) return null;

          // Derive semester from student's section
          const semesterId = sectionSemesterMap.get(student.section_id) ?? '';

          const submissions = semesterId
            ? await listSubmissions(allocation.student_id, semesterId)
            : [];

          let approvedMeetingsCount = 0;
          if (semesterId) {
            const { data: approvedMeetings } = await supabase
              .from('meetings')
              .select('id')
              .eq('semester_id', semesterId)
              .eq('status', 'Approved');

            const approvedMeetingIds = (approvedMeetings ?? []).map((m: { id: string }) => m.id);
            if (approvedMeetingIds.length > 0) {
              const { count } = await supabase
                .from('meeting_participants')
                .select('meeting_id', { count: 'exact', head: true })
                .eq('student_id', allocation.student_id)
                .in('meeting_id', approvedMeetingIds);
              approvedMeetingsCount = count ?? 0;
            }
          }

          let total = 0;
          let grade = 'N/A';
          if (semesterId) {
            try {
              const result = await getStudentGrades(allocation.student_id, semesterId);
              total = result.total;
              grade = result.grade;
            } catch {
              // grades not yet available
            }
          }

          return { student, semesterId, submissions, approvedMeetingsCount, total, grade };
        })
      );

      setRows(built.filter((r): r is StudentRow => r !== null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [supervisorId]);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  // Realtime updates on submissions table
  useRealtimeChannel<Submission>({
    channelName: `supervisor-dashboard-${supervisorId}`,
    table: 'submissions',
    onInsert: () => fetchData(),
    onUpdate: () => fetchData(),
  });

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-danger p-6">{error}</p>;
  }

  if (rows.length === 0) {
    return <p className="text-sm text-ink-muted p-6">No students assigned yet.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title">Dashboard</h1>

      <div className="table-wrap">
        <table className="table-base">
          <thead>
            <tr>
              <th className="whitespace-nowrap">Student</th>
              <th className="whitespace-nowrap">Reg #</th>
              {SUBMISSION_TYPES.map((type) => (
                <th key={type} className="whitespace-nowrap">{type}</th>
              ))}
              <th className="whitespace-nowrap">Meetings</th>
              <th className="whitespace-nowrap">Total</th>
              <th className="whitespace-nowrap">Grade</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const hasPending = row.submissions.some((s) => s.status === 'Pending');
              return (
                <tr key={row.student.id} className={hasPending ? 'bg-accent/5' : ''}>
                  <td className="font-medium text-ink whitespace-nowrap">{row.student.student_name}</td>
                  <td className="font-mono text-xs text-ink-muted whitespace-nowrap">{row.student.reg_number}</td>
                  {SUBMISSION_TYPES.map((type) => {
                    const sub = row.submissions.find((s) => s.submission_type === type);
                    return (
                      <td key={type} className="whitespace-nowrap">
                        {sub ? (
                          <div className="flex flex-col gap-0.5">
                            <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
                            {sub.status === 'Approved' && (
                              <span className="text-xs text-success font-medium">{sub.marks} marks</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-ink-faint text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-ink whitespace-nowrap">{row.approvedMeetingsCount}</td>
                  <td className="font-semibold text-ink whitespace-nowrap">{row.total}</td>
                  <td className="font-semibold text-ink whitespace-nowrap">{row.grade}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupervisorDashboard;
