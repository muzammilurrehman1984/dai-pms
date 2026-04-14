import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';
import SubmissionURLForm from '../../components/student/SubmissionURLForm';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { listDeadlines, listSubmissions, listSubmissionVersions, formatDeadline } from '../../services/submissions.service';
import { Eye, ExternalLink } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import type { Submission, SubmissionDeadline, SubmissionType, SubmissionVersion } from '../../types';

const FYP_I_TYPES: SubmissionType[]  = ['Project Approval', 'SRS', 'SDD'];
const FYP_II_TYPES: SubmissionType[] = ['Final Documentation', 'Final Project Code'];

function statusVariant(status: Submission['status']): 'warning' | 'success' | 'danger' | 'info' {
  switch (status) {
    case 'Pending':  return 'warning';
    case 'Approved': return 'success';
    case 'Rejected': return 'danger';
    case 'Revision': return 'info';
  }
}

// ── Version Preview Modal ─────────────────────────────────────────────────────
function VersionPreviewModal({ version, onClose }: { version: SubmissionVersion | null; onClose: () => void }) {
  if (!version) return null;
  return (
    <Modal open={!!version} onClose={onClose} title="Submission Preview" size="md">
      <div className="flex flex-col gap-4">
        <div>
          <p className="form-label">Document URL</p>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-surface border border-surface-border">
            <a href={version.document_url} target="_blank" rel="noopener noreferrer"
              className="text-primary text-sm hover:underline truncate flex-1 min-w-0">
              {version.document_url}
            </a>
            <a href={version.document_url} target="_blank" rel="noopener noreferrer"
              className="btn btn-ghost p-1.5 flex-shrink-0" title="Open in new tab">
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {version.description && (
          <div>
            <p className="form-label">Description</p>
            <div className="p-3 rounded-xl bg-surface border border-surface-border text-sm text-ink whitespace-pre-wrap">
              {version.description}
            </div>
          </div>
        )}

        <div>
          <p className="form-label">Submitted At</p>
          <p className="text-sm text-ink">{formatDateTime(version.submitted_at)}</p>
        </div>
      </div>
    </Modal>
  );
}

interface CardProps {
  submissionType: SubmissionType;
  studentId: string;
  semesterId: string;
  deadline: SubmissionDeadline | undefined;
  submission: Submission | undefined;
  onRefresh: () => void;
}

function SubmissionCard({ submissionType, studentId, semesterId, deadline, submission, onRefresh }: CardProps) {
  const [versions, setVersions]               = useState<SubmissionVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [previewVersion, setPreviewVersion]   = useState<SubmissionVersion | null>(null);

  useEffect(() => {
    if (!submission) { setVersions([]); return; }
    setLoadingVersions(true);
    listSubmissionVersions(submission.id)
      .then(setVersions).catch(() => setVersions([]))
      .finally(() => setLoadingVersions(false));
  }, [submission]);

  return (
    <div className="card flex flex-col gap-3">
      {/* Deadline banner — prominent red at top when passed */}
      {deadline?.deadline && (() => {
        const passed = new Date(deadline.deadline) < new Date();
        const locked = deadline.is_locked;
        if (passed || locked) {
          return (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium
              ${passed ? 'bg-danger/10 border border-danger/20 text-danger-dark' : 'bg-accent/10 border border-accent/20 text-accent-dark'}`}>
              <span className="flex-shrink-0">{passed ? '⛔' : '🔒'}</span>
              <span>
                {passed
                  ? `Deadline passed: ${formatDeadline(deadline.deadline)}`
                  : `Submissions locked by administrator`}
              </span>
            </div>
          );
        }
        return null;
      })()}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-medium text-ink">{submissionType}</h3>
        {submission
          ? <Badge variant={statusVariant(submission.status)}>{submission.status}</Badge>
          : <Badge variant="muted">Not Submitted</Badge>}
      </div>

      <p className="text-xs text-ink-muted">
        Deadline: <span className={`font-medium ${deadline?.deadline && new Date(deadline.deadline) < new Date() ? 'text-danger' : 'text-ink'}`}>
          {deadline?.deadline ? formatDeadline(deadline.deadline) : 'No deadline set'}
        </span>
      </p>

      <SubmissionURLForm studentId={studentId} semesterId={semesterId} submissionType={submissionType}
        deadline={deadline} currentSubmission={submission} onSuccess={onRefresh} />

      {submission?.description && (
        <div className="p-3 rounded-xl bg-surface border border-surface-border text-xs text-ink-muted">
          <span className="font-medium text-ink">Description: </span>{submission.description}
        </div>
      )}

      {loadingVersions ? (
        <p className="text-xs text-ink-muted">Loading history…</p>
      ) : versions.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-ink-muted mb-1.5">Version History</p>
          <ul className="flex flex-col gap-1">
            {versions.map((v, i) => (
              <li key={v.id} className="flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 hover:bg-surface transition-colors">
                <span className="w-5 text-right text-ink-faint flex-shrink-0">{versions.length - i}.</span>
                <span className="text-ink-faint flex-shrink-0">{formatDateTime(v.submitted_at)}</span>
                <a href={v.document_url} target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline truncate flex-1 min-w-0">{v.document_url}</a>
                <button type="button"
                  className="btn btn-ghost p-1 flex-shrink-0 text-ink-muted hover:text-primary"
                  onClick={() => setPreviewVersion(v)}
                  title="Preview">
                  <Eye size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <VersionPreviewModal version={previewVersion} onClose={() => setPreviewVersion(null)} />
    </div>
  );
}

export default function SubmissionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [semesterId, setSemesterId]       = useState<string | null>(null);
  const [semesterNumber, setSemesterNumber] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [deadlines, setDeadlines]     = useState<SubmissionDeadline[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const studentId = user?.id ?? '';

  const fetchData = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError('');
    try {
      // Get allocation to find session
      const { data: allocationData, error: allocationError } = await supabase
        .from('allocations').select('id, session_id').eq('student_id', studentId).maybeSingle();
      if (allocationError) throw new Error(allocationError.message);
      if (!allocationData) { setError('You have not been assigned to a supervisor yet.'); return; }

      // Get student's section to determine their semester number (7 or 8) — use the DB field directly
      const { data: studentData, error: studentError } = await supabase
        .from('students').select('section_id, sections(semester_number)')
        .eq('id', studentId).maybeSingle();
      if (studentError) throw new Error(studentError.message);

      // Supabase returns a FK join as a single object (not array) when it's many-to-one
      const sectionsJoin = studentData?.sections as { semester_number: number | null } | { semester_number: number | null }[] | null;
      const studentSemesterNumber: number | null = Array.isArray(sectionsJoin)
        ? (sectionsJoin[0]?.semester_number ?? null)
        : (sectionsJoin?.semester_number ?? null);

      // Fetch all semesters for the session, then pick the one matching the student's semester
      const { data: semestersData, error: semestersError } = await supabase
        .from('semesters').select('id, semester_number')
        .eq('session_id', allocationData.session_id)
        .order('semester_number', { ascending: true });
      if (semestersError) throw new Error(semestersError.message);
      if (!semestersData || semestersData.length === 0) {
        setError('No semesters found for your session.');
        return;
      }

      // Match semester by number from section name; fall back to latest
      const matchedSemester = studentSemesterNumber
        ? semestersData.find(s => s.semester_number === studentSemesterNumber)
        : semestersData[semestersData.length - 1];
      const targetSemester = matchedSemester ?? semestersData[semestersData.length - 1];

      setSemesterId(targetSemester.id);
      setSemesterNumber(targetSemester.semester_number);

      const [subs, dls] = await Promise.all([
        listSubmissions(studentId, targetSemester.id),
        listDeadlines(targetSemester.id),
      ]);
      setSubmissions(subs);
      setDeadlines(dls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { if (!authLoading) fetchData(); }, [authLoading, fetchData]);

  if (authLoading || loading) return <PageSpinner />;

  if (error) return (
    <div className="max-w-3xl">
      <h1 className="page-title mb-4">My Submissions</h1>
      <p className="text-sm text-danger">{error}</p>
    </div>
  );

  if (!semesterId) return null;

  const getDeadline = (type: SubmissionType) => deadlines.find(d => d.submission_type === type);
  const getSubmission = (type: SubmissionType) => submissions.find(s => s.submission_type === type);

  // Show only the phase matching the student's semester (7 = FYP-I, 8 = FYP-II)
  const showFypI  = semesterNumber === 7 || semesterNumber === null;
  const showFypII = semesterNumber === 8 || semesterNumber === null;

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <h1 className="page-title">My Submissions</h1>

      {showFypI && (
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg text-ink border-b border-surface-border pb-2">FYP-I</h2>
        {FYP_I_TYPES.map(type => (
          <SubmissionCard key={type} submissionType={type} studentId={studentId} semesterId={semesterId}
            deadline={getDeadline(type)} submission={getSubmission(type)} onRefresh={fetchData} />
        ))}
      </section>
      )}

      {showFypII && (
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg text-ink border-b border-surface-border pb-2">FYP-II</h2>
        {FYP_II_TYPES.map(type => (
          <SubmissionCard key={type} submissionType={type} studentId={studentId} semesterId={semesterId}
            deadline={getDeadline(type)} submission={getSubmission(type)} onRefresh={fetchData} />
        ))}
      </section>
      )}
    </div>
  );
}
