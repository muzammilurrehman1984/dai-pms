import { useCallback, useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageSpinner } from '../../components/ui/Spinner';
import { PaginationBar } from '../../components/shared/PaginationBar';
import SessionForm from '../../components/admin/SessionForm';
import { listSessions, deleteSession } from '../../services/sessions.service';
import { compareSessionNames } from '../../utils/formatters';
import { toast } from '../../components/ui/Toast';
import { usePagination } from '../../hooks/usePagination';
import { Plus, Trash2, Calendar, Search } from 'lucide-react';
import type { Session } from '../../types';

export default function SessionsPage() {
  const [sessions, setSessions]   = useState<Session[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch]       = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [confirm, setConfirm]     = useState<{ id: string; name: string } | null>(null);

  const pg = usePagination(50);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listSessions();
      setSessions([...data].sort((a, b) => compareSessionNames(a.session_name, b.session_name)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleDelete = async (id: string) => {
    try {
      await deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      toast('Session deleted', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete session.', 'error');
    }
  };

  const springCount = sessions.filter(s => s.session_name.includes('Spring')).length;
  const fallCount   = sessions.filter(s => s.session_name.includes('Fall')).length;

  const filtered = sessions.filter(s => {
    if (search.trim() && !s.session_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (termFilter && !s.session_name.includes(termFilter)) return false;
    return true;
  });

  const pages    = pg.totalPages(filtered.length);
  const paginated = pg.paginate(filtered);

  function handleSearch(v: string) { setSearch(v); pg.reset(); }
  function handleTerm(v: string)   { setTermFilter(v); pg.reset(); }

  if (loading && !sessions.length) return <PageSpinner />;

  const searchSlot = (
    <div className="relative flex-1 min-w-[180px] max-w-xs">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input className="form-input pl-9" placeholder="Search sessions…"
        value={search} onChange={e => handleSearch(e.target.value)} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Sessions</h1>
          <p className="text-ink-muted text-sm mt-1">{sessions.length} total</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Create Session
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid-responsive">
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Total Sessions</span>
          {loading
            ? <div className="h-8 w-12 bg-surface-border rounded animate-pulse mt-1" />
            : <span className="text-3xl font-bold text-primary">{sessions.length}</span>}
          <span className="text-xs text-ink-faint">all time</span>
        </div>
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Spring</span>
          <span className="text-3xl font-bold text-secondary">{springCount}</span>
          <span className="text-xs text-ink-faint">sessions</span>
        </div>
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Fall</span>
          <span className="text-3xl font-bold text-success">{fallCount}</span>
          <span className="text-xs text-ink-faint">sessions</span>
        </div>
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">On This Page</span>
          <span className="text-3xl font-bold text-accent">{paginated.length}</span>
          <span className="text-xs text-ink-faint">
            {filtered.length !== sessions.length ? `of ${filtered.length} filtered` : `of ${filtered.length} total`}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input className="form-input pl-9" placeholder="Search sessions…"
            value={search} onChange={e => handleSearch(e.target.value)} />
        </div>
        <select className="form-input w-auto" value={termFilter} onChange={e => handleTerm(e.target.value)}>
          <option value="">All Terms</option>
          <option value="Spring">Spring</option>
          <option value="Fall">Fall</option>
        </select>
        <span className="text-xs text-ink-muted self-center">{filtered.length} of {sessions.length}</span>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Top pagination bar */}
      <PaginationBar page={pg.page} pageSize={pg.pageSize} total={filtered.length}
        totalPages={pages} onPage={pg.setPage} onPageSize={pg.handlePageSize}
        searchSlot={searchSlot} />

      {/* Table */}
      <div className="table-wrap">
        <table className="table-base">
          <thead><tr>
            <th>Session Name</th>
            <th>Term</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 3 }).map((_, j) => <td key={j}><div className="h-4 bg-surface-border rounded animate-pulse" /></td>)}</tr>
              ))
            ) : paginated.length === 0 ? (
              <tr><td colSpan={3}>
                <div className="flex flex-col items-center justify-center py-12 text-ink-muted gap-2">
                  <Calendar size={32} className="opacity-30" />
                  <p className="text-sm">No sessions found</p>
                </div>
              </td></tr>
            ) : paginated.map(s => {
              const term = s.session_name.split(' ')[1];
              return (
                <tr key={s.id}>
                  <td className="font-medium text-ink">{s.session_name}</td>
                  <td>
                    <span className={`badge ${term === 'Spring' ? 'badge-success' : 'badge-accent'}`}>{term}</span>
                  </td>
                  <td>
                    <button type="button" className="btn btn-ghost p-1.5 text-danger"
                      onClick={() => setConfirm({ id: s.id, name: s.session_name })}>
                      <Trash2 size={14} />
                    </button>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Session" size="sm">
        <SessionForm onSuccess={() => { setModalOpen(false); fetchSessions(); }} />
      </Modal>

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => confirm && handleDelete(confirm.id)}
        title="Delete Session" message={`Delete "${confirm?.name}"? This cannot be undone.`}
        danger confirmLabel="Delete"
      />
    </div>
  );
}
