import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';
import { PaginationBar } from '../../components/shared/PaginationBar';
import MeetingManager from '../../components/supervisor/MeetingManager';
import { useAuth } from '../../hooks/useAuth';
import { usePagination } from '../../hooks/usePagination';
import { listAllocations } from '../../services/allocations.service';
import { listMeetings, updateMeeting } from '../../services/meetings.service';
import { listStudents } from '../../services/students.service';
import { supabase } from '../../services/supabase';
import { toast } from '../../components/ui/Toast';
import { Plus, Calendar, Search } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import type { Meeting, MeetingScope, MeetingStatus, Student } from '../../types';

type MeetingWithParticipants = Meeting & { participants: string[] };

function statusVariant(status: MeetingStatus): 'success' | 'danger' | 'warning' | 'muted' {
  switch (status) {
    case 'Approved':     return 'success';
    case 'Rejected':     return 'danger';
    case 'Re-scheduled': return 'warning';
    default:             return 'muted';
  }
}

export default function MeetingsPage() {
  const { user, loading: authLoading } = useAuth();
  const supervisorId = user?.id ?? '';

  const [meetings, setMeetings]   = useState<MeetingWithParticipants[]>([]);
  const [students, setStudents]   = useState<Student[]>([]);
  const [semesterId, setSemesterId] = useState('');
  const [sectionSemesterMap, setSectionSemesterMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const [filterStatus, setFilterStatus]   = useState<MeetingStatus | ''>('');
  const [filterScope, setFilterScope]     = useState<MeetingScope | ''>('');
  const [filterStudent, setFilterStudent] = useState('');
  const [sortBy, setSortBy]               = useState<'date' | 'status'>('date');
  const [showCreate, setShowCreate]       = useState(false);

  const [rowUpdates, setRowUpdates] = useState<
    Record<string, { status: MeetingStatus; scheduledAt: string; saving: boolean }>
  >({});

  const pg = usePagination(50);

  const studentMap = useMemo(() => new Map<string, Student>(students.map(s => [s.id, s])), [students]);

  const fetchData = useCallback(async () => {
    if (!supervisorId) return;
    setLoading(true); setError('');
    try {
      const allocations = await listAllocations({ supervisorId });

      // Build a map: section_id → semester_id
      // by joining sections.semester_number → semesters.semester_number for the session
      let sectionSemesterMap: Map<string, string> = new Map();
      if (allocations.length > 0) {
        const sessionId = allocations[0].session_id;
        const { data: semesters } = await supabase
          .from('semesters').select('id, semester_number').eq('session_id', sessionId);
        const { data: sections } = await supabase
          .from('sections').select('id, semester_number').eq('session_id', sessionId);
        if (semesters && sections) {
          const semByNum = new Map((semesters as { id: string; semester_number: number }[])
            .map(s => [s.semester_number, s.id]));
          for (const sec of sections as { id: string; semester_number: number | null }[]) {
            if (sec.semester_number && semByNum.has(sec.semester_number)) {
              sectionSemesterMap.set(sec.id, semByNum.get(sec.semester_number)!);
            }
          }
        }
        // Fallback: if only one semester, use it for all
        if (sectionSemesterMap.size === 0 && semesters?.length === 1) {
          setSemesterId(semesters[0].id);
        }
      }
      setSectionSemesterMap(sectionSemesterMap);

      const studentIds = [...new Set(allocations.map(a => a.student_id))];
      const allStudents = await listStudents();
      setStudents(allStudents.filter(s => studentIds.includes(s.id)));
      const data = await listMeetings({ supervisorId });
      setMeetings(data);
      const initial: typeof rowUpdates = {};
      for (const m of data) initial[m.id] = { status: m.status, scheduledAt: '', saving: false };
      setRowUpdates(initial);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load meetings.'); }
    finally { setLoading(false); }
  }, [supervisorId]);

  useEffect(() => { if (!authLoading) fetchData(); }, [authLoading, fetchData]);

  async function handleUpdateMeeting(meetingId: string) {
    const row = rowUpdates[meetingId];
    if (!row) return;
    setRowUpdates(prev => ({ ...prev, [meetingId]: { ...prev[meetingId], saving: true } }));
    try {
      const payload: { status?: MeetingStatus; scheduled_at?: string } = { status: row.status };
      if (row.status === 'Re-scheduled' && row.scheduledAt) payload.scheduled_at = new Date(row.scheduledAt).toISOString();
      await updateMeeting(meetingId, payload);
      await fetchData();
      toast('Meeting updated', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update meeting.', 'error');
      setRowUpdates(prev => ({ ...prev, [meetingId]: { ...prev[meetingId], saving: false } }));
    }
  }

  const filtered = useMemo(() => {
    let result = meetings;
    if (filterStatus) result = result.filter(m => m.status === filterStatus);
    if (filterScope)  result = result.filter(m => m.scope === filterScope);
    if (filterStudent) {
      result = result.filter(m => m.participants.some(pid => {
        const s = studentMap.get(pid);
        return s?.student_name.toLowerCase().includes(filterStudent.toLowerCase()) ||
               s?.reg_number.toLowerCase().includes(filterStudent.toLowerCase());
      }));
    }
    return [...result].sort((a, b) =>
      sortBy === 'date'
        ? new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        : a.status.localeCompare(b.status)
    );
  }, [meetings, filterStatus, filterScope, filterStudent, sortBy, studentMap]);

  const pages     = pg.totalPages(filtered.length);
  const paginated = pg.paginate(filtered);

  // Status breakdown
  const approvedCount    = meetings.filter(m => m.status === 'Approved').length;
  const rescheduledCount = meetings.filter(m => m.status === 'Re-scheduled').length;

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
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Meetings</h1>
          <p className="text-ink-muted text-sm mt-1">{meetings.length} total</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Create Meeting
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid-responsive">
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Total Meetings</span>
          <span className="text-3xl font-bold text-primary">{meetings.length}</span>
          <span className="text-xs text-ink-faint">all time</span>
        </div>
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Approved</span>
          <span className="text-3xl font-bold text-success">{approvedCount}</span>
          <span className="text-xs text-ink-faint">confirmed</span>
        </div>
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Re-scheduled</span>
          <span className="text-3xl font-bold text-accent">{rescheduledCount}</span>
          <span className="text-xs text-ink-faint">pending new time</span>
        </div>
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">On This Page</span>
          <span className="text-3xl font-bold text-secondary">{paginated.length}</span>
          <span className="text-xs text-ink-faint">
            {filtered.length !== meetings.length ? `of ${filtered.length} filtered` : `of ${filtered.length} total`}
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
        <select className="form-input w-auto" value={filterStatus} onChange={e => handleFilter(() => setFilterStatus(e.target.value as MeetingStatus | ''))}>
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Re-scheduled">Re-scheduled</option>
        </select>
        <select className="form-input w-auto" value={filterScope} onChange={e => handleFilter(() => setFilterScope(e.target.value as MeetingScope | ''))}>
          <option value="">All Scopes</option>
          <option value="Individual">Individual</option>
          <option value="Group">Group</option>
          <option value="All">All</option>
        </select>
        <select className="form-input w-auto" value={sortBy} onChange={e => setSortBy(e.target.value as 'date' | 'status')}>
          <option value="date">Sort: Date</option>
          <option value="status">Sort: Status</option>
        </select>
        <span className="text-xs text-ink-muted self-center">{filtered.length} of {meetings.length}</span>
      </div>

      {/* Top pagination bar */}
      <PaginationBar page={pg.page} pageSize={pg.pageSize} total={filtered.length}
        totalPages={pages} onPage={pg.setPage} onPageSize={pg.handlePageSize} searchSlot={searchSlot} />

      {/* Table */}
      <div className="table-wrap">
        <table className="table-base">
          <thead><tr><th>Scheduled At</th><th>Scope</th><th>Status</th><th>Participants</th><th>Actions</th></tr></thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={5}><div className="flex flex-col items-center justify-center py-12 text-ink-muted gap-2"><Calendar size={32} className="opacity-30" /><p className="text-sm">No meetings found</p></div></td></tr>
            ) : paginated.map(m => {
              const row = rowUpdates[m.id];
              return (
                <tr key={m.id}>
                  <td className="text-sm text-ink">{formatDateTime(m.scheduled_at)}</td>
                  <td className="text-ink-muted">{m.scope}</td>
                  <td><Badge variant={statusVariant(m.status)}>{m.status}</Badge></td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {m.participants.map(pid => {
                        const s = studentMap.get(pid);
                        return s ? (
                          <span key={pid} className="badge badge-primary text-xs">{s.student_name}</span>
                        ) : null;
                      })}
                      {m.participants.length === 0 && <span className="text-ink-faint text-xs">—</span>}
                    </div>
                  </td>
                  <td>
                    {row && (
                      <div className="flex flex-col gap-2 min-w-[220px]">
                        <div className="flex items-center gap-2">
                          <select className="form-input w-auto text-xs py-1" value={row.status}
                            onChange={e => setRowUpdates(prev => ({ ...prev, [m.id]: { ...prev[m.id], status: e.target.value as MeetingStatus } }))}>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Re-scheduled">Re-scheduled</option>
                          </select>
                          <button type="button" className="btn btn-primary py-1 px-3 text-xs" onClick={() => handleUpdateMeeting(m.id)} disabled={row.saving}>
                            {row.saving ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                        {row.status === 'Re-scheduled' && (
                          <input type="datetime-local" className="form-input text-xs py-1" value={row.scheduledAt}
                            onChange={e => setRowUpdates(prev => ({ ...prev, [m.id]: { ...prev[m.id], scheduledAt: e.target.value } }))} />
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom pagination bar */}
      <PaginationBar page={pg.page} pageSize={pg.pageSize} total={filtered.length}
        totalPages={pages} onPage={pg.setPage} onPageSize={pg.handlePageSize} />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Meeting">
        <MeetingManager supervisorId={supervisorId} semesterId={semesterId}
          sectionSemesterMap={sectionSemesterMap} students={students}
          onSuccess={() => { setShowCreate(false); fetchData(); }} />
      </Modal>
    </div>
  );
}
