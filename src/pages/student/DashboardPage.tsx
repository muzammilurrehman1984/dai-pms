import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { listAllocations } from '../../services/allocations.service';
import { listSubmissions } from '../../services/submissions.service';
import { getStudentGrades } from '../../services/grades.service';
import { supabase } from '../../services/supabase';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { FileText, MessageSquare, Calendar } from 'lucide-react';
import type { Submission, SubmissionStatus, SubmissionType } from '../../types';

const statusVariant: Record<SubmissionStatus, 'muted' | 'success' | 'warning' | 'danger' | 'info'> = {
  Pending:  'warning',
  Approved: 'success',
  Rejected: 'danger',
  Revision: 'info',
};

const MAX_MARKS: Record<SubmissionType, number> = {
  'Project Approval': 20,
  'SRS': 30,
  'SDD': 30,
  'Final Documentation': 40,
  'Final Project Code': 40,
};

const ALL_TYPES: SubmissionType[] = [
  'Project Approval', 'SRS', 'SDD', 'Final Documentation', 'Final Project Code',
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [totalMarks, setTotalMarks]         = useState(0);
  const [grade, setGrade]                   = useState('N/A');
  const [approvedMeetings, setApprovedMeetings] = useState(0);
  const [totalMeetings, setTotalMeetings]   = useState(0);
  const [meetingMarks, setMeetingMarks]     = useState(0);
  const [submissions, setSubmissions]       = useState<Submission[]>([]);
  const [semesterNumber, setSemesterNumber] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setLoading(true);
        const allocations = await listAllocations({ studentId: user.id });
        if (allocations.length === 0) { setLoading(false); return; }

        // Derive semester from student's section
        const { data: studentData } = await supabase
          .from('students').select('sections(semester_number)')
          .eq('id', user.id).maybeSingle();
        const sectionsJoin = studentData?.sections as { semester_number: number | null } | { semester_number: number | null }[] | null;
        const studentSemNum: number | null = Array.isArray(sectionsJoin)
          ? (sectionsJoin[0]?.semester_number ?? null)
          : (sectionsJoin?.semester_number ?? null);
        setSemesterNumber(studentSemNum);

        const { data: semestersData } = await supabase
          .from('semesters').select('id, semester_number')
          .eq('session_id', allocations[0].session_id)
          .order('semester_number', { ascending: true });

        const matched = studentSemNum
          ? (semestersData ?? []).find((s: { id: string; semester_number: number }) => s.semester_number === studentSemNum)
          : null;
        const arr = semestersData ?? [];
        const targetSem = matched ?? arr[arr.length - 1];
        if (!targetSem) { setLoading(false); return; }

        const semesterId = targetSem.id;

        const [subs, gradesResult] = await Promise.all([
          listSubmissions(user.id, semesterId),
          getStudentGrades(user.id, semesterId),
        ]);
        setSubmissions(subs);
        setTotalMarks(gradesResult.total);
        setGrade(gradesResult.grade);

        // Meetings counts + marks from meeting_participants
        const { data: myParticipations } = await supabase
          .from('meeting_participants')
          .select('meeting_id, marks')
          .eq('student_id', user.id);

        const myMeetingIds = (myParticipations ?? []).map((r: { meeting_id: string; marks: number }) => r.meeting_id);
        setTotalMeetings(myMeetingIds.length);

        if (myMeetingIds.length > 0) {
          // Count approved meetings in this semester
          const { data: approvedRows } = await supabase
            .from('meetings').select('id')
            .eq('semester_id', semesterId)
            .eq('status', 'Approved')
            .in('id', myMeetingIds);
          const approvedIds = new Set((approvedRows ?? []).map((r: { id: string }) => r.id));
          setApprovedMeetings(approvedIds.size);

          // Sum marks from participants for meetings in this semester
          const { data: semParticipations } = await supabase
            .from('meeting_participants')
            .select('marks, meeting_id')
            .eq('student_id', user.id)
            .in('meeting_id', myMeetingIds);

          // Only count marks for meetings in this semester
          const { data: semMeetings } = await supabase
            .from('meetings').select('id')
            .eq('semester_id', semesterId)
            .in('id', myMeetingIds);
          const semMeetingIdSet = new Set((semMeetings ?? []).map((m: { id: string }) => m.id));
          const totalMeetingMarks = (semParticipations ?? [])
            .filter((p: { meeting_id: string; marks: number }) => semMeetingIdSet.has(p.meeting_id))
            .reduce((sum: number, p: { marks: number }) => sum + (p.marks ?? 0), 0);
          setMeetingMarks(totalMeetingMarks);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <PageSpinner />;

  // Only show submission types relevant to the student's semester
  const relevantTypes = semesterNumber === 7
    ? ALL_TYPES.filter(t => ['Project Approval', 'SRS', 'SDD'].includes(t))
    : semesterNumber === 8
      ? ALL_TYPES.filter(t => ['Final Documentation', 'Final Project Code'].includes(t))
      : ALL_TYPES;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title">Dashboard</h1>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Summary stat cards */}
      <div className="stat-grid-responsive">
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Total Marks</span>
          <span className="text-3xl font-bold text-primary">{totalMarks}</span>
          <span className="text-xs text-ink-faint">earned so far</span>
        </div>
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Grade</span>
          <span className="text-3xl font-bold text-secondary">{grade}</span>
          <span className="text-xs text-ink-faint">current grade</span>
        </div>
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Approved Meetings</span>
          <span className="text-3xl font-bold text-success">{approvedMeetings}</span>
          <span className="text-xs text-ink-faint">of {totalMeetings} total</span>
        </div>
      </div>

      {/* Submission progress table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h2 className="font-display text-lg text-ink">Submission Progress</h2>
          {semesterNumber && (
            <p className="text-xs text-ink-muted mt-0.5">
              Semester {semesterNumber} — {semesterNumber === 7 ? 'FYP-I' : 'FYP-II'}
            </p>
          )}
        </div>
        <div className="table-wrap">
          <table className="table-base">
            <thead><tr>
              <th className="w-1/4">Phase</th>
              <th className="w-1/4">Status</th>
              <th className="w-1/4">Marks</th>
              <th className="w-1/4">Max</th>
            </tr></thead>
            <tbody>
              {relevantTypes.map(type => {
                const sub = submissions.find(s => s.submission_type === type);
                return (
                  <tr key={type}>
                    <td className="font-medium text-ink w-1/4">{type}</td>
                    <td className="w-1/4">
                      {sub
                        ? <Badge variant={statusVariant[sub.status]}>{sub.status}</Badge>
                        : <Badge variant="muted">Not Submitted</Badge>}
                    </td>
                    <td className="w-1/4">
                      {sub?.status === 'Approved'
                        ? <span className="font-semibold text-success">{sub.marks}</span>
                        : <span className="text-ink-faint">—</span>}
                    </td>
                    <td className="text-ink-muted w-1/4">{MAX_MARKS[type]}</td>
                  </tr>
                );
              })}

              {/* Submissions subtotal */}
              <tr className="bg-surface">
                <td colSpan={2} className="font-semibold text-ink">Submissions Total</td>
                <td className="font-semibold text-primary">
                  {submissions.filter(s => s.status === 'Approved').reduce((sum, s) => sum + s.marks, 0)}
                </td>
                <td className="text-ink-muted font-medium">
                  {relevantTypes.reduce((sum, t) => sum + MAX_MARKS[t], 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Meetings summary */}
        <div className="border-t border-surface-border">
          <div className="px-5 py-3 border-b border-surface-border bg-surface">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Meetings</p>
          </div>
          <table className="table-base">
            <tbody>
              <tr>
                <td className="font-medium text-ink w-1/4">
                  Meetings Attended
                  <span className="ml-1 text-xs text-ink-faint">(2 marks each, max 10)</span>
                </td>
                <td className="w-1/4"><Badge variant="success">{approvedMeetings} approved</Badge></td>
                <td className="font-semibold text-success w-1/4">{meetingMarks}</td>
                <td className="text-ink-muted w-1/4">20</td>
              </tr>
              <tr className="bg-surface">
                <td colSpan={2} className="font-semibold text-ink">Meetings Total</td>
                <td className="font-semibold text-primary">{meetingMarks}</td>
                <td className="text-ink-muted font-medium">20</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Net total */}
        <div className="border-t-2 border-primary/20 bg-primary/5 px-5 py-4 flex items-center justify-between">
          <span className="font-display text-base font-semibold text-ink">Net Total</span>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-primary">
              {submissions.filter(s => s.status === 'Approved').reduce((sum, s) => sum + s.marks, 0) + meetingMarks}
            </span>
            <span className="text-ink-muted text-sm">
              / {relevantTypes.reduce((sum, t) => sum + MAX_MARKS[t], 0) + 20}
            </span>
            <span className="badge badge-secondary text-sm px-3 py-1">{grade}</span>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-3 flex-wrap">
        <Link to="/student/submissions" className="btn btn-primary">
          <FileText size={15} /> My Submissions
        </Link>
        <Link to="/student/meetings" className="btn btn-outline">
          <Calendar size={15} /> My Meetings
        </Link>
        <Link to="/student/chat" className="btn btn-outline">
          <MessageSquare size={15} /> Chat with Supervisor
        </Link>
      </div>
    </div>
  );
}
