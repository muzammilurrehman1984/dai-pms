import { useCallback, useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PaginationBar } from '../../components/shared/PaginationBar';
import SectionForm from '../../components/admin/SectionForm';
import { listSections, deleteSection, updateSection } from '../../services/sections.service';
import { listSessions } from '../../services/sessions.service';
import { compareSectionNames, compareSessionNames } from '../../utils/formatters';
import { toast } from '../../components/ui/Toast';
import { usePagination } from '../../hooks/usePagination';
import { Plus, Trash2, School, Search, Edit2 } from 'lucide-react';
import type { Section, Session } from '../../types';

export default function SectionsPage() {
  const [sessions, setSessions]           = useState<Session[]>([]);
  const [sections, setSections]           = useState<Section[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [search, setSearch]               = useState('');
  const [modalOpen, setModalOpen]         = useState(false);
  const [confirm, setConfirm]             = useState<{ id: string; name: string } | null>(null);
  const [editSection, setEditSection]     = useState<Section | null>(null);
  const [editName, setEditName]           = useState('');
  const [editSemesterNumber, setEditSemesterNumber] = useState<7 | 8>(7);
  const [editLoading, setEditLoading]     = useState(false);
  const [editError, setEditError]         = useState('');

  const pg = usePagination(50);

  // Load sessions + global section count on mount
  useEffect(() => {
    listSessions()
      .then(data => setSessions([...data].sort((a, b) => compareSessionNames(a.session_name, b.session_name))))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load sessions.'));
  }, []);

  const fetchSections = useCallback(async (sessionId: string) => {
    if (!sessionId) { setSections([]); return; }
    setLoading(true);
    setError('');
    try {
      const data = await listSections(sessionId);
      const sorted = [...data].sort((a, b) => compareSectionNames(a.section_name, b.section_name));
      setSections(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sections.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedSessionId(id);
    setSearch('');
    pg.reset();
    fetchSections(id);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSection(id);
      setSections(prev => prev.filter(s => s.id !== id));
      toast('Section deleted', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete section.', 'error');
    }
  };

  const openEdit = (s: Section) => {
    setEditSection(s);
    setEditName(s.section_name);
    setEditSemesterNumber((s.semester_number ?? 7) as 7 | 8);
    setEditError('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSection || !editName.trim()) return;
    setEditLoading(true);
    setEditError('');
    try {
      const updated = await updateSection(editSection.id, editName.trim(), editSemesterNumber);
      setSections(prev =>
        [...prev.map(s => s.id === updated.id ? updated : s)]
          .sort((a, b) => compareSectionNames(a.section_name, b.section_name))
      );
      setEditSection(null);
      toast('Section updated', 'success');
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update section.');
    } finally {
      setEditLoading(false);
    }
  };

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const filtered = sections.filter(s =>
    !search.trim() || s.section_name.toLowerCase().includes(search.toLowerCase())
  );

  const pages     = pg.totalPages(filtered.length);
  const paginated = pg.paginate(filtered);

  function handleSearch(v: string) { setSearch(v); pg.reset(); }

  const searchSlot = (
    <div className="relative flex-1 min-w-[180px] max-w-xs">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input className="form-input pl-9" placeholder="Search sections…"
        value={search} onChange={e => handleSearch(e.target.value)} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Sections</h1>
          <p className="text-ink-muted text-sm mt-1">
            {selectedSessionId ? `${sections.length} in this session` : 'Select a session to view sections'}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)} disabled={!selectedSessionId}>
          <Plus size={16} /> Create Section
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid-responsive">
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Total Sessions</span>
          <span className="text-3xl font-bold text-primary">{sessions.length}</span>
          <span className="text-xs text-ink-faint">available</span>
        </div>
        <div className={`card stat-card transition-opacity duration-200 ${selectedSessionId ? 'opacity-100' : 'opacity-40'}`}>
          <span className="text-xs text-ink-muted uppercase tracking-wide">
            {selectedSession ? selectedSession.session_name : 'Session'}
          </span>
          {selectedSessionId && !loading
            ? <span className="text-3xl font-bold text-secondary">{sections.length}</span>
            : selectedSessionId
              ? <div className="h-8 w-12 bg-surface-border rounded animate-pulse mt-1" />
              : <span className="text-3xl font-bold text-ink-faint">—</span>}
          <span className="text-xs text-ink-faint">sections</span>
        </div>
        <div className={`card stat-card transition-opacity duration-200 ${selectedSessionId ? 'opacity-100' : 'opacity-40'}`}>
          <span className="text-xs text-ink-muted uppercase tracking-wide">Filtered</span>
          {selectedSessionId
            ? <span className="text-3xl font-bold text-success">{filtered.length}</span>
            : <span className="text-3xl font-bold text-ink-faint">—</span>}
          <span className="text-xs text-ink-faint">matching search</span>
        </div>
        <div className={`card stat-card transition-opacity duration-200 ${selectedSessionId ? 'opacity-100' : 'opacity-40'}`}>
          <span className="text-xs text-ink-muted uppercase tracking-wide">On This Page</span>
          {selectedSessionId && !loading
            ? <span className="text-3xl font-bold text-accent">{paginated.length}</span>
            : selectedSessionId
              ? <div className="h-8 w-12 bg-surface-border rounded animate-pulse mt-1" />
              : <span className="text-3xl font-bold text-ink-faint">—</span>}
          <span className="text-xs text-ink-faint">
            {selectedSessionId && !loading
              ? filtered.length !== sections.length ? `of ${filtered.length} filtered` : `of ${filtered.length} total`
              : 'select a session'}
          </span>
        </div>
      </div>

      {/* Session selector */}
      <div className="flex flex-wrap gap-3">
        <select className="form-input w-auto" value={selectedSessionId} onChange={handleSessionChange}>
          <option value="">Select a session…</option>
          {sessions.map(s => <option key={s.id} value={s.id}>{s.session_name}</option>)}
        </select>
        {selectedSessionId && (
          <span className="text-xs text-ink-muted self-center">{filtered.length} of {sections.length}</span>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Top pagination bar */}
      {selectedSessionId && (
        <PaginationBar page={pg.page} pageSize={pg.pageSize} total={filtered.length}
          totalPages={pages} onPage={pg.setPage} onPageSize={pg.handlePageSize}
          searchSlot={searchSlot} />
      )}

      {/* Table */}
      <div className="table-wrap">
        <table className="table-base">
          <thead><tr>
            <th>#</th>
            <th>Section Name</th>
            <th>Semester</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 4 }).map((_, j) => <td key={j}><div className="h-4 bg-surface-border rounded animate-pulse" /></td>)}</tr>
              ))
            ) : !selectedSessionId ? (
              <tr><td colSpan={4}>
                <div className="flex flex-col items-center justify-center py-12 text-ink-muted gap-2">
                  <School size={32} className="opacity-30" />
                  <p className="text-sm">Select a session to view sections</p>
                </div>
              </td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={4}>
                <div className="flex flex-col items-center justify-center py-12 text-ink-muted gap-2">
                  <School size={32} className="opacity-30" />
                  <p className="text-sm">No sections found</p>
                </div>
              </td></tr>
            ) : paginated.map((s, idx) => (
              <tr key={s.id}>
                <td className="text-xs text-ink-faint w-10">{pg.page * (pg.pageSize || filtered.length) + idx + 1}</td>
                <td className="font-medium text-ink">{s.section_name}</td>
                <td>
                  {s.semester_number
                    ? <span className={`badge ${s.semester_number === 7 ? 'badge-primary' : 'badge-secondary'}`}>
                        Sem {s.semester_number}
                      </span>
                    : <span className="text-xs text-ink-faint">—</span>}
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button type="button" className="btn btn-ghost p-1.5" onClick={() => openEdit(s)} title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button type="button" className="btn btn-ghost p-1.5 text-danger"
                      onClick={() => setConfirm({ id: s.id, name: s.section_name })}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom pagination bar */}
      {selectedSessionId && (
        <PaginationBar page={pg.page} pageSize={pg.pageSize} total={filtered.length}
          totalPages={pages} onPage={pg.setPage} onPageSize={pg.handlePageSize} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Section" size="sm">
        <SectionForm sessionId={selectedSessionId}
          onSuccess={() => { setModalOpen(false); fetchSections(selectedSessionId); }} />
      </Modal>

      <Modal open={!!editSection} onClose={() => setEditSection(null)} title="Edit Section" size="sm">
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <div>
            <label className="form-label">Section Name <span className="text-danger">*</span></label>
            <input className="form-input" value={editName} autoFocus
              onChange={e => setEditName(e.target.value)} disabled={editLoading} />
          </div>
          <div>
            <label className="form-label">Semester <span className="text-danger">*</span></label>
            <select className="form-input" value={editSemesterNumber}
              onChange={e => setEditSemesterNumber(Number(e.target.value) as 7 | 8)} disabled={editLoading}>
              <option value={7}>7th Semester (FYP-I)</option>
              <option value={8}>8th Semester (FYP-II)</option>
            </select>
          </div>
          {editError && <p className="form-error text-sm">{editError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn btn-outline" onClick={() => setEditSection(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={editLoading || !editName.trim()}>
              {editLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => confirm && handleDelete(confirm.id)}
        title="Delete Section" message={`Delete "${confirm?.name}"? This cannot be undone.`}
        danger confirmLabel="Delete"
      />
    </div>
  );
}
