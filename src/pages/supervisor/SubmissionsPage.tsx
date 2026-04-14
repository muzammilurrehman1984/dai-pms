import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';
import { PaginationBar } from '../../components/shared/PaginationBar';
import SubmissionEvaluator from '../../components/supervisor/SubmissionEvaluator';
import { useAuth } from '../../hooks/useAuth';
import { usePagination } from '../../hooks/usePagination';
import { listAllocations } from '../../services/allocations.service';
import { listStudents } from '../../services/students.service';
import { listAllSubmissions, listDeadlines } from '../../services/submissions.service';
import { supabase } from '../../services/supabase';
import { Search, FileText } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import type { Submission, SubmissionDeadline, SubmissionStatus, SubmissionType, Student } from '../../types';

const MAX_MARKS: Record<SubmissionType, number> = {
  'Project Approval': 20, 'SRS': 30, 'SDD': 30,
  'Final Documentation': 40, 'Final Project Code': 40,
};

const ALL_SUBMISSION_TYPES: SubmissionType[] = [
  'Project Approval', 'SRS', 'SDD', 'Final Documentation', 'Final Project Code',
];

function statusVariant(status: SubmissionStatus): 'warning' | 'success' | 'danger' | 'info' {
  switch (status) {
    case 'Pending':  return 'warning';
    case 'Approved': return 'success';
    case 'Rejected': return 'danger';
    case 'Revision': return 'info';
  }
}

interface RowData { submission: Submission; studentName: string; deadline: string | null; }

export default function SubmissionsPage() {
  const { user, loading: authLoading } = useAuth();
  const supervisorId = user?.id ?? '';

  const [rows, setRows]       = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [filterStatus, setFilterStatus]   = useState<SubmissionStatus | ''>('');
  const [filterType, setFilterType]       = useState<SubmissionType | ''>('');
  const [filterStudent, setFilterStudent] = useState('');
  const [sortBy, setSortBy]               = useState<'deadline' | 'updated'>('updated');
  const [selected, setSelected]           = useState<RowData | null>(null);

  const pg = usePagination(50);

  const fetchData = useCallback(async () => {
    if (!supervisorId) return;
    setLoading(true); setError('');
    try {
      const allocations = await listAllocations({ supervisorId });
      const studentIds = allocations.map(a => a.student_id);
      if (studentIds.length === 0) { setRows([]); return; }
      const students = await listStudents();
      const studentMap = new Map<string, Student>(students.map(s => [s.id, s]));
      const submissions = await listAllSubmissions({ supervisorId });
      const sessionIds = [...new Set(allocations.map(a => a.session_id))];
      const deadlineMap = new Map<string, SubmissionDeadline>();
      for (const sessionId of sessionIds) {
        const { data: semData } = await supabase.from('semesters').select('id').eq('session_id', sessionId).maybeSingle();
        if (semData?.id) {
          const deadlines = await listDeadlines(semData.id);
          for (const d of deadlines) deadlineMap.set(d.submission_type, d);
        }
      }
      setRows(submissions.map(sub => ({ submission: sub, studentName: studentMap.get(sub.student_id)?.student_name ?? sub.student_id, deadline: deadlineMap.get(sub.submission_type)?.deadline ?? null })));
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load submissions.'); }
    finally { setLoading(false); }
  }, [supervisorId]);

  useEffect(() => { if (!authLoading) fetchData(); }, [authLoading, fetchData]);

  const filtered = useMemo(() => {
    let result = rows;
    if (filterStatus) result = result.filter(r => r.submission.status === filterStatus);
    if (filterType)   result = result.filter(r => r.submission.submission_type === filterType);
    if (filterStudent) { const term = filterStudent.toLowerCase(); result = result.filter(r => r.studentName.toLowerCase().includes(term)); }
    return [...result].sort((a, b) => {
      if (sortBy === 'deadline') {
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return da - db;
      }
      return new Date(b.submission.updated_at).getTime() - new Date(a.submission.updated_at).getTime();
    });
  }, [rows, filterStatus, filterType, filterStudent, sortBy]);

  const pages     = pg.totalPages(filtered.length);
  const paginated = pg.paginate(filtered);

  // Status breakdown stats
  const pendingCount  = rows.filter(r => r.submission.status === 'Pending').length;
  const approvedCount = rows.filter(r => r.submission.status === 'Approved').length;

  function handleFilter(fn: () => void) { fn(); pg.reset(); }

  if (authLoading || loading) return <PageSpinner />;

  const searchSlot = (
    <div className="relative flex-1 min-w-[160px] max-w-xs">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input className="form-input pl-9" placeholder="Search student…"
        value={filterStudent} onChange={e => { setFilterStudent(e.target.value); pg.reset(); }} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Student Submissions</h1>
        <p className="text-ink-muted text-sm mt-1">{rows.length} total</p>
      </div>

      {/* Stats */}
      <div className="stat-grid-responsive">
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Total</span>
          <span className="text-3xl font-bold text-primary">{rows.length}</span>
          <span className="text-xs text-ink-faint">submissions</span>
        </div>
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Pending</span>
          <span className="text-3xl font-bold text-accent">{pendingCount}</span>
          <span className="text-xs text-ink-faint">awaiting review</span>
        </div>
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Approved</span>
          <span className="text-3xl font-bold text-success">{approvedCount}</span>
          <span className="text-xs text-ink-faint">accepted</span>
        </div>
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">On This Page</span>
          <span className="text-3xl font-bold text-secondary">{paginated.length}</span>
          <span className="text-xs text-ink-faint">
            {filtered.length !== rows.length ? `of ${filtered.length} filtered` : `of ${filtered.length} total`}
          </span>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input className="form-input pl-9" placeholder="Search student…"
            value={filterStudent} onChange={e => { setFilterStudent(e.target.value); pg.reset(); }} />
        </div>
        <select className="form-input w-auto" value={filterStatus} onChange={e => handleFilter(() => setFilterStatus(e.target.value as SubmissionStatus | ''))}>
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Revision">Revision</option>
        </select>
        <select className="form-input w-auto" value={filterType} onChange={e => handleFilter(() => setFilterType(e.target.value as SubmissionType | ''))}>
          <option value="">All Types</option>
          {ALL_SUBMISSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="form-input w-auto" value={sortBy} onChange={e => setSortBy(e.target.value as 'deadline' | 'updated')}>
          <option value="updated">Sort: Last Updated</option>
          <option value="deadline">Sort: Deadline</option>
        </select>
        <span className="text-xs text-ink-muted self-center">{filtered.length} of {rows.length}</span>
      </div>

      {/* Top pagination bar */}
      <PaginationBar page={pg.page} pageSize={pg.pageSize} total={filtered.length}
        totalPages={pages} onPage={pg.setPage} onPageSize={pg.handlePageSize} searchSlot={searchSlot} />

      {/* Table */}
      <div className="table-wrap">
        <table className="table-base">
          <thead><tr><th>Student</th><th>Type</th><th>Status</th><th>Marks</th><th>Last Updated</th><th></th></tr></thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={6}><div className="flex flex-col items-center justify-center py-12 text-ink-muted gap-2"><FileText size={32} className="opacity-30" /><p className="text-sm">No submissions found</p></div></td></tr>
            ) : paginated.map(row => (
              <tr key={row.submission.id}>
                <td className="font-medium text-ink">{row.studentName}</td>
                <td className="text-ink-muted">{row.submission.submission_type}</td>
                <td><Badge variant={statusVariant(row.submission.status)}>{row.submission.status}</Badge></td>
                <td>
                  {row.submission.status === 'Pending' || row.submission.status === 'Revision'
                    ? <span className="text-ink-faint">—</span>
                    : <span className={`font-semibold ${row.submission.status === 'Approved' ? 'text-success' : 'text-danger'}`}>
                        {row.submission.marks} / {MAX_MARKS[row.submission.submission_type]}
                      </span>}
                </td>
                <td className="text-xs text-ink-muted">{formatDateTime(row.submission.updated_at)}</td>
                <td><button type="button" className="btn btn-ghost p-1.5 text-xs text-primary" onClick={() => setSelected(row)}>Evaluate</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom pagination bar */}
      <PaginationBar page={pg.page} pageSize={pg.pageSize} total={filtered.length}
        totalPages={pages} onPage={pg.setPage} onPageSize={pg.handlePageSize} />

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={`Evaluate: ${selected.submission.submission_type}`}>
          <p className="text-sm text-ink-muted mb-4">Student: <span className="font-medium text-ink">{selected.studentName}</span></p>
          <SubmissionEvaluator submission={selected.submission} supervisorId={supervisorId}
            onSuccess={() => { setSelected(null); fetchData(); }} />
        </Modal>
      )}
    </div>
  );
}
