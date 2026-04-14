import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { usePagination } from '../../hooks/usePagination';
import { PaginationBar } from '../../components/shared/PaginationBar';
import { listMeetings } from '../../services/meetings.service';
import { listAllocations } from '../../services/allocations.service';
import { formatDateTime } from '../../utils/formatters';
import { Calendar, Search } from 'lucide-react';
import type { Meeting, MeetingStatus } from '../../types';

type MeetingWithParticipants = Meeting & { participants: string[] };

function statusVariant(status: MeetingStatus): 'success' | 'danger' | 'warning' | 'muted' {
  switch (status) {
    case 'Approved':     return 'success';
    case 'Rejected':     return 'danger';
    case 'Re-scheduled': return 'warning';
    default:             return 'muted';
  }
}

export default function StudentMeetingsPage() {
  const { user, loading: authLoading } = useAuth();
  const studentId = user?.id ?? '';

  const [meetings, setMeetings] = useState<MeetingWithParticipants[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [filterStatus, setFilterStatus] = useState<MeetingStatus | 'Pending' | ''>('');
  const [search, setSearch]     = useState('');

  const pg = usePagination(50);

  const fetchData = useCallback(async () => {
    if (!studentId) return;
    setLoading(true); setError('');
    try {
      const allocations = await listAllocations({ studentId });
      if (allocations.length === 0) { setMeetings([]); return; }

      const data = await listMeetings({ studentId });
      setMeetings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meetings.');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { if (!authLoading) fetchData(); }, [authLoading, fetchData]);

  const filtered = useMemo(() => {
    let result = meetings;
    if (filterStatus) result = result.filter(m => m.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.scope.toLowerCase().includes(q) ||
        m.status.toLowerCase().includes(q) ||
        formatDateTime(m.scheduled_at).toLowerCase().includes(q)
      );
    }
    // Sort ascending by scheduled_at
    return [...result].sort((a, b) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );
  }, [meetings, filterStatus, search]);

  const pages     = pg.totalPages(filtered.length);
  const paginated = pg.paginate(filtered);

  // Stats
  const pending      = meetings.filter(m => m.status === 'Pending').length;
  const approved     = meetings.filter(m => m.status === 'Approved').length;
  const rejected     = meetings.filter(m => m.status === 'Rejected').length;

  function handleSearch(v: string) { setSearch(v); pg.reset(); }
  function handleFilter(v: string) { setFilterStatus(v as MeetingStatus | ''); pg.reset(); }

  if (authLoading || loading) return <PageSpinner />;

  const searchSlot = (
    <div className="relative flex-1 min-w-[160px] max-w-xs">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input className="form-input pl-9" placeholder="Search meetings…"
        value={search} onChange={e => handleSearch(e.target.value)} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">My Meetings</h1>
        <p className="text-ink-muted text-sm mt-1">{meetings.length} total</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Stats */}
      <div className="stat-grid-responsive">
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Total</span>
          <span className="text-3xl font-bold text-primary">{meetings.length}</span>
          <span className="text-xs text-ink-faint">all meetings</span>
        </div>
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Scheduled</span>
          <span className="text-3xl font-bold text-accent">{pending}</span>
          <span className="text-xs text-ink-faint">pending</span>
        </div>
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Approved</span>
          <span className="text-3xl font-bold text-success">{approved}</span>
          <span className="text-xs text-ink-faint">confirmed</span>
        </div>
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Rejected</span>
          <span className="text-3xl font-bold text-danger">{rejected}</span>
          <span className="text-xs text-ink-faint">not approved</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input className="form-input pl-9" placeholder="Search meetings…"
            value={search} onChange={e => handleSearch(e.target.value)} />
        </div>
        <select className="form-input w-auto" value={filterStatus} onChange={e => handleFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Re-scheduled">Re-scheduled</option>
        </select>
        <span className="text-xs text-ink-muted self-center">{filtered.length} of {meetings.length}</span>
      </div>

      {/* Top pagination */}
      <PaginationBar page={pg.page} pageSize={pg.pageSize} total={filtered.length}
        totalPages={pages} onPage={pg.setPage} onPageSize={pg.handlePageSize}
        searchSlot={searchSlot} />

      {/* Table */}
      <div className="table-wrap">
        <table className="table-base">
          <thead><tr>
            <th>Scheduled At</th>
            <th>Scope</th>
            <th>Status</th>
          </tr></thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={3}>
                <div className="flex flex-col items-center justify-center py-12 text-ink-muted gap-2">
                  <Calendar size={32} className="opacity-30" />
                  <p className="text-sm">No meetings found</p>
                </div>
              </td></tr>
            ) : paginated.map(m => (
              <tr key={m.id}>
                <td className="text-ink font-medium">{formatDateTime(m.scheduled_at)}</td>
                <td className="text-ink-muted">{m.scope}</td>
                <td><Badge variant={statusVariant(m.status)}>{m.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom pagination */}
      <PaginationBar page={pg.page} pageSize={pg.pageSize} total={filtered.length}
        totalPages={pages} onPage={pg.setPage} onPageSize={pg.handlePageSize} />
    </div>
  );
}
