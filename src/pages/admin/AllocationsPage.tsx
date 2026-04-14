import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageSpinner } from '../../components/ui/Spinner';
import { PaginationBar } from '../../components/shared/PaginationBar';
import AllocationForm from '../../components/admin/AllocationForm';
import { listAllocations, randomAllocate, bulkAllocateCSV, updateAllocation, deleteAllocation, bulkDeleteAllocations } from '../../services/allocations.service';
import { listSessions } from '../../services/sessions.service';
import { listSections } from '../../services/sections.service';
import { listStudents } from '../../services/students.service';
import { listSupervisors } from '../../services/supervisors.service';
import { compareSessionNames, compareSectionNames } from '../../utils/formatters';
import { toast } from '../../components/ui/Toast';
import { usePagination } from '../../hooks/usePagination';
import { Plus, Shuffle, BookOpen, Upload, X, CheckCircle, AlertTriangle, Search, ShieldAlert, Trash2 } from 'lucide-react';
import type { Allocation, Session, Section, Student, Supervisor } from '../../types';

const CSV_COLUMNS = ['reg_number', 'supervisor_email', 'section_name'];

function parseCSV(text: string) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [] as string[], rows: [] as Record<string, string>[] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const rows = lines.slice(1).map(line => {
    const fields: string[] = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { fields.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    fields.push(cur.trim());
    return Object.fromEntries(headers.map((h, i) => [h, fields[i] ?? '']));
  }).filter(r => Object.values(r).some(v => v));
  return { headers, rows };
}

interface BulkResult { reg_number: string; ok: boolean; error?: string; }

function BulkUploadModal({ open, onClose, onDone, sessionId, sessionName }: {
  open: boolean; onClose: () => void; onDone: () => void; sessionId: string; sessionName: string;
}) {
  const [rows, setRows]               = useState<Record<string, string>[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [results, setResults]         = useState<BulkResult[] | null>(null);
  const [running, setRunning]         = useState(false);
  const [forceOverwrite, setForceOverwrite] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setRows([]); setParseErrors([]); setResults(null); setRunning(false); setForceOverwrite(false); }
  }, [open]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => parseFile(ev.target?.result as string);
    reader.readAsText(file);
  }

  function parseFile(text: string) {
    const { headers, rows: parsed } = parseCSV(text);
    const missing = CSV_COLUMNS.filter(c => !headers.includes(c));
    if (missing.length) { setParseErrors([`Missing columns: ${missing.join(', ')}`]); setRows([]); return; }
    const errs: string[] = [];
    parsed.forEach((r, i) => {
      const n = i + 2;
      if (!r.reg_number?.trim())       errs.push(`Row ${n}: reg_number required`);
      if (!r.supervisor_email?.trim()) errs.push(`Row ${n}: supervisor_email required`);
      if (!r.section_name?.trim())     errs.push(`Row ${n}: section_name required`);
    });
    setParseErrors(errs);
    setRows(parsed);
  }

  async function handleImport() {
    if (!rows.length || parseErrors.length || !sessionId) return;
    setRunning(true);
    try {
      const typed = rows.map(r => ({ reg_number: r.reg_number, supervisor_email: r.supervisor_email, section_name: r.section_name }));
      const { failures } = await bulkAllocateCSV(sessionId, typed, forceOverwrite);
      const failSet = new Map(failures.map(f => [f.row, f.reason]));
      setResults(rows.map((r, i) => ({ reg_number: r.reg_number, ok: !failSet.get(i + 2), error: failSet.get(i + 2) })));
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'CSV import failed.', 'error');
    } finally {
      setRunning(false);
    }
  }

  const canImport = rows.length > 0 && parseErrors.length === 0 && !results;
  const succeeded = results?.filter(r => r.ok).length ?? 0;
  const failed    = results?.filter(r => !r.ok).length ?? 0;

  return (
    <Modal open={open} onClose={running ? () => {} : onClose} title="Bulk Upload Allocations" size="lg">
      <div className="flex flex-col gap-5">
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm">
          <p className="font-semibold text-ink mb-2">CSV Format</p>
          <code className="block text-xs font-mono text-ink-muted bg-white/60 rounded-lg p-3 border border-primary/10 whitespace-pre">{`reg_number,supervisor_email,section_name\n"BSAI-01","john@example.com","BSARIN-7TH-1M"\n"BSAI-02","jane@example.com","BSARIN-7TH-2M"`}</code>
          <p className="text-xs text-ink-muted mt-2">All three columns required. <span className="font-medium text-ink">section_name</span> must match an existing section.</p>
        </div>

        {/* Target context */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-surface-border text-sm">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Uploading to</span>
          <span className="badge badge-primary">{sessionName || '—'}</span>
        </div>

        {/* Force overwrite toggle */}
        <label className="flex items-center gap-3 p-3 rounded-xl border border-surface-border cursor-pointer hover:bg-surface transition-colors">
          <input type="checkbox" checked={forceOverwrite} onChange={e => setForceOverwrite(e.target.checked)}
            className="w-4 h-4 accent-danger" disabled={running} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <ShieldAlert size={14} className="text-danger flex-shrink-0" />
              Force Overwrite Supervisors
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Replace existing supervisor allocations for students in the CSV.
            </p>
          </div>
        </label>
        {forceOverwrite && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-xs text-danger-dark flex items-start gap-2">
            <ShieldAlert size={13} className="flex-shrink-0 mt-0.5" />
            Existing allocations for matched students will be replaced.
          </div>
        )}

        {!results && (
          <div>
            <label className="form-label">Upload CSV File</label>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile}
              className="block w-full text-sm text-ink-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />
          </div>
        )}

        {parseErrors.length > 0 && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger-dark space-y-1 max-h-40 overflow-y-auto">
            {parseErrors.map((e, i) => <p key={i} className="flex items-start gap-1.5"><AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />{e}</p>)}
          </div>
        )}

        {rows.length > 0 && !results && (
          <div className="border border-surface-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-surface border-b border-surface-border flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">{rows.length} allocation{rows.length !== 1 ? 's' : ''} ready to import</span>
              <button type="button" className="btn btn-ghost p-1" onClick={() => { setRows([]); setParseErrors([]); if (fileRef.current) fileRef.current.value = ''; }}><X size={14} /></button>
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-surface-border">
              {rows.map((r, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">{r.reg_number?.[0]?.toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink truncate">{r.reg_number}</div>
                    <div className="text-xs text-ink-muted truncate">{r.supervisor_email} · {r.section_name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {results && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">Import complete</span>
              <span className="font-semibold text-ink">{results.length} processed · 100%</span>
            </div>
            <div className="h-2.5 rounded-full bg-surface-border overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: '100%' }} />
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1.5">
              {results.map((r, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${r.ok ? 'bg-success/10 text-success-dark' : 'bg-danger/10 text-danger-dark'}`}>
                  {r.ok ? <CheckCircle size={13} className="flex-shrink-0" /> : <AlertTriangle size={13} className="flex-shrink-0" />}
                  <span className="font-medium truncate">{r.reg_number}</span>
                  {!r.ok && <span className="truncate opacity-80">— {r.error}</span>}
                </div>
              ))}
            </div>
            <p className="text-sm text-ink-muted pt-1">
              <span className="text-success font-medium">{succeeded} assigned</span>
              {failed > 0 && <span className="text-danger font-medium ml-3">{failed} failed</span>}
            </p>
          </div>
        )}

        {running && (
          <div className="flex items-center gap-3 text-sm text-ink-muted">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
            Processing {rows.length} allocations…
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          {!running && <button type="button" className="btn btn-outline" onClick={onClose}>{results ? 'Close' : 'Cancel'}</button>}
          {canImport && <button type="button" className={`btn ${forceOverwrite ? 'btn-danger' : 'btn-primary'}`} onClick={handleImport}><Upload size={15} /> {forceOverwrite ? 'Overwrite' : 'Import'} {rows.length} Allocations</button>}
        </div>
      </div>
    </Modal>
  );
}

// ── Random Allocate Modal ─────────────────────────────────────────────────────
function RandomAllocateModal({ open, onClose, onConfirm, sections, allocating }: {
  open: boolean;
  onClose: () => void;
  onConfirm: (opts: { sectionId?: string; forceOverwrite: boolean }) => void;
  sections: Section[];
  allocating: boolean;
}) {
  const [sectionId, setSectionId]           = useState('');
  const [forceOverwrite, setForceOverwrite] = useState(false);

  useEffect(() => {
    if (open) { setSectionId(''); setForceOverwrite(false); }
  }, [open]);

  function handleConfirm() {
    onConfirm({ sectionId: sectionId || undefined, forceOverwrite });
    onClose();
  }

  const scopeLabel = sectionId
    ? sections.find(s => s.id === sectionId)?.section_name ?? 'selected section'
    : 'entire session';

  return (
    <Modal open={open} onClose={onClose} title="Random Allocate" size="sm">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          Randomly distribute students to supervisors using round-robin. Scope the operation using the filters below.
        </p>

        {/* Scope: section */}
        <div>
          <label className="form-label">Section (optional)</label>
          <select className="form-input" value={sectionId} onChange={e => setSectionId(e.target.value)}>
            <option value="">All sections in session</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.section_name}</option>)}
          </select>
          <p className="text-xs text-ink-muted mt-1">Leave blank to allocate across the whole session.</p>
        </div>

        {/* Force overwrite */}
        <label className="flex items-center gap-3 p-3 rounded-xl border border-surface-border cursor-pointer hover:bg-surface transition-colors">
          <input type="checkbox" checked={forceOverwrite} onChange={e => setForceOverwrite(e.target.checked)}
            className="w-4 h-4 accent-danger" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <ShieldAlert size={14} className="text-danger flex-shrink-0" />
              Force Overwrite Supervisors
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Re-allocate all students in scope, replacing existing allocations.
            </p>
          </div>
        </label>

        {forceOverwrite ? (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-xs text-danger-dark flex items-start gap-2">
            <ShieldAlert size={13} className="flex-shrink-0 mt-0.5" />
            All existing allocations for the <span className="font-medium mx-0.5">{scopeLabel}</span> will be replaced.
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-ink-muted">
            Only unallocated students in the <span className="font-medium text-ink mx-0.5">{scopeLabel}</span> will be allocated.
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="button"
            className={`btn ${forceOverwrite ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
            disabled={allocating}>
            {allocating ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Allocating…</>
            ) : (
              <><Shuffle size={14} /> {forceOverwrite ? 'Overwrite & Allocate' : 'Allocate'}</>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface AllocationRow {
  id: string; student_reg: string; student_name: string;
  supervisor_name: string; section_name: string; supervisor_id: string; allocation: Allocation;
}

export default function AllocationsPage() {
  const [sessions, setSessions]       = useState<Session[]>([]);
  const [sections, setSections]       = useState<Section[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [rows, setRows]               = useState<AllocationRow[]>([]);
  const [selectedSessionId, setSelectedSessionId]   = useState('');
  const [filterSectionId, setFilterSectionId]       = useState('');
  const [filterSupervisorId, setFilterSupervisorId] = useState('');
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(false);
  const [allocating, setAllocating]   = useState(false);
  const [error, setError]             = useState('');
  const [addModalOpen, setAddModalOpen]     = useState(false);
  const [bulkOpen, setBulkOpen]             = useState(false);
  const [randomOpen, setRandomOpen]         = useState(false);
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [editSupervisorId, setEditSupervisorId] = useState('');
  const [editLoading, setEditLoading]       = useState(false);

  // Selection for bulk delete
  const [selected, setSelected]             = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete]   = useState<string | null>(null); // single id
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const pg = usePagination(50);

  useEffect(() => {
    listSessions()
      .then(data => setSessions([...data].sort((a, b) => compareSessionNames(a.session_name, b.session_name))))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load sessions.'));
  }, []);

  const fetchData = useCallback(async (sessionId: string) => {
    if (!sessionId) { setRows([]); setSections([]); return; }
    setLoading(true); setError('');
    try {
      const [allocations, allSections, allSupervisors] = await Promise.all([listAllocations({ sessionId }), listSections(sessionId), listSupervisors()]);
      const sectionIds = allSections.map(s => s.id);
      const allStudents: Student[] = sectionIds.length > 0 ? (await Promise.all(sectionIds.map(sid => listStudents({ sectionId: sid })))).flat() : [];
      const studentMap    = new Map<string, Student>(allStudents.map(s => [s.id, s]));
      const supervisorMap = new Map<string, Supervisor>(allSupervisors.map(sv => [sv.id, sv]));
      const sectionMap    = new Map<string, Section>(allSections.map(sec => [sec.id, sec]));
      setRows(allocations.map(a => ({ id: a.id, student_reg: studentMap.get(a.student_id)?.reg_number ?? a.student_id, student_name: studentMap.get(a.student_id)?.student_name ?? '—', supervisor_name: supervisorMap.get(a.supervisor_id)?.teacher_name ?? '—', section_name: sectionMap.get(a.section_id)?.section_name ?? '—', supervisor_id: a.supervisor_id, allocation: a })));
      setSections([...allSections].sort((a, b) => compareSectionNames(a.section_name, b.section_name)));
      setSupervisors(allSupervisors);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load allocations.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(selectedSessionId); setFilterSectionId(''); setFilterSupervisorId(''); setSelected(new Set()); pg.reset(); }, [selectedSessionId, fetchData]);

  const handleRandomAllocate = async (opts: { sectionId?: string; forceOverwrite: boolean }) => {
    setAllocating(true);
    try {
      await randomAllocate(selectedSessionId, { sectionId: opts.sectionId || undefined, forceOverwrite: opts.forceOverwrite });
      await fetchData(selectedSessionId);
      toast('Random allocation complete', 'success');
    }
    catch (err) { toast(err instanceof Error ? err.message : 'Random allocation failed.', 'error'); }
    finally { setAllocating(false); }
  };

  const startEdit = (row: AllocationRow) => { setEditingId(row.id); setEditSupervisorId(row.supervisor_id); };

  const handleSaveEdit = async (row: AllocationRow) => {
    setEditLoading(true);
    try { await updateAllocation(row.id, { supervisor_id: editSupervisorId }); setEditingId(null); await fetchData(selectedSessionId); toast('Allocation updated', 'success'); }
    catch (err) { toast(err instanceof Error ? err.message : 'Failed to update allocation.', 'error'); }
    finally { setEditLoading(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAllocation(id);
      setRows(prev => prev.filter(r => r.id !== id));
      setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
      toast('Allocation deleted', 'success');
    } catch (err) { toast(err instanceof Error ? err.message : 'Failed to delete allocation.', 'error'); }
  };

  const handleBulkDelete = async () => {
    const ids = [...selected];
    try {
      await bulkDeleteAllocations(ids);
      setRows(prev => prev.filter(r => !selected.has(r.id)));
      setSelected(new Set());
      toast(`${ids.length} allocation${ids.length !== 1 ? 's' : ''} deleted`, 'success');
    } catch (err) { toast(err instanceof Error ? err.message : 'Failed to delete allocations.', 'error'); }
  };

  function toggleSelect(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function toggleSelectAll() {
    if (selected.size === paginated.length && paginated.every(r => selected.has(r.id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map(r => r.id)));
    }
  }

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const filtered = rows.filter(r => {
    if (filterSectionId    && r.allocation.section_id    !== filterSectionId)    return false;
    if (filterSupervisorId && r.allocation.supervisor_id !== filterSupervisorId) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!r.student_name.toLowerCase().includes(q) && !r.student_reg.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const pages     = pg.totalPages(filtered.length);
  const paginated = pg.paginate(filtered);

  // Unique supervisor counts per section
  const sectionCounts = new Map<string, number>();
  rows.forEach(r => sectionCounts.set(r.section_name, (sectionCounts.get(r.section_name) ?? 0) + 1));

  function handleSearch(v: string) { setSearch(v); pg.reset(); }

  if (loading && !rows.length) return <PageSpinner />;

  const searchSlot = (
    <div className="relative flex-1 min-w-[180px] max-w-xs">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input className="form-input pl-9" placeholder="Search student name or reg #…"
        value={search} onChange={e => handleSearch(e.target.value)} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Allocations</h1>
          <p className="text-ink-muted text-sm mt-1">
            {selectedSessionId ? `${rows.length} allocations in this session` : 'Select a session to view allocations'}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-outline" onClick={() => setBulkOpen(true)} disabled={!selectedSessionId}><Upload size={15} /> Bulk Upload</button>
          <button type="button" className="btn btn-outline" onClick={() => setRandomOpen(true)} disabled={!selectedSessionId || allocating}><Shuffle size={15} /> {allocating ? 'Allocating…' : 'Random Allocate'}</button>
          {selected.size > 0 && (
            <button type="button" className="btn btn-danger" onClick={() => setConfirmBulkDelete(true)}>
              <Trash2 size={15} /> Delete {selected.size} Selected
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={() => setAddModalOpen(true)} disabled={!selectedSessionId}><Plus size={16} /> Add Allocation</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid-responsive">
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">
            {selectedSession ? selectedSession.session_name : 'Session'}
          </span>
          {selectedSessionId && !loading
            ? <span className="text-3xl font-bold text-primary">{rows.length}</span>
            : selectedSessionId ? <div className="h-8 w-12 bg-surface-border rounded animate-pulse mt-1" />
            : <span className="text-3xl font-bold text-ink-faint">—</span>}
          <span className="text-xs text-ink-faint">total allocations</span>
        </div>
        <div className={`card stat-card transition-opacity duration-200 ${selectedSessionId ? 'opacity-100' : 'opacity-40'}`}>
          <span className="text-xs text-ink-muted uppercase tracking-wide">Sections</span>
          {selectedSessionId ? <span className="text-3xl font-bold text-secondary">{sections.length}</span>
            : <span className="text-3xl font-bold text-ink-faint">—</span>}
          <span className="text-xs text-ink-faint">in this session</span>
        </div>
        <div className={`card stat-card transition-opacity duration-200 ${selectedSessionId ? 'opacity-100' : 'opacity-40'}`}>
          <span className="text-xs text-ink-muted uppercase tracking-wide">Filtered</span>
          {selectedSessionId ? <span className="text-3xl font-bold text-success">{filtered.length}</span>
            : <span className="text-3xl font-bold text-ink-faint">—</span>}
          <span className="text-xs text-ink-faint">matching filters</span>
        </div>
        <div className={`card stat-card transition-opacity duration-200 ${selectedSessionId ? 'opacity-100' : 'opacity-40'}`}>
          <span className="text-xs text-ink-muted uppercase tracking-wide">On This Page</span>
          {selectedSessionId && !loading
            ? <span className="text-3xl font-bold text-accent">{paginated.length}</span>
            : selectedSessionId ? <div className="h-8 w-12 bg-surface-border rounded animate-pulse mt-1" />
            : <span className="text-3xl font-bold text-ink-faint">—</span>}
          <span className="text-xs text-ink-faint">
            {selectedSessionId && !loading
              ? filtered.length !== rows.length ? `of ${filtered.length} filtered` : `of ${filtered.length} total`
              : 'select a session'}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="form-input w-auto" value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)}>
          <option value="">Select a session…</option>
          {sessions.map(s => <option key={s.id} value={s.id}>{s.session_name}</option>)}
        </select>
        {selectedSessionId && <>
          <select className="form-input w-auto" value={filterSectionId} onChange={e => { setFilterSectionId(e.target.value); pg.reset(); }}>
            <option value="">All sections</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.section_name}</option>)}
          </select>
          <select className="form-input w-auto" value={filterSupervisorId} onChange={e => { setFilterSupervisorId(e.target.value); pg.reset(); }}>
            <option value="">All supervisors</option>
            {supervisors.map(sv => <option key={sv.id} value={sv.id}>{sv.teacher_name}</option>)}
          </select>
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input className="form-input pl-9" placeholder="Search student…" value={search} onChange={e => handleSearch(e.target.value)} />
          </div>
          <span className="text-xs text-ink-muted self-center">{filtered.length} of {rows.length}</span>
        </>}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Top pagination bar */}
      {selectedSessionId && (
        <PaginationBar page={pg.page} pageSize={pg.pageSize} total={filtered.length}
          totalPages={pages} onPage={pg.setPage} onPageSize={pg.handlePageSize} searchSlot={searchSlot} />
      )}

      {/* Table */}
      <div className="table-wrap">
        <table className="table-base">
          <thead><tr>
            <th className="w-8">
              <input type="checkbox" className="w-4 h-4"
                checked={paginated.length > 0 && paginated.every(r => selected.has(r.id))}
                onChange={toggleSelectAll} />
            </th>
            <th>Reg #</th><th>Student</th><th>Supervisor</th><th>Section</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j}><div className="h-4 bg-surface-border rounded animate-pulse" /></td>)}</tr>
              ))
            ) : !selectedSessionId ? (
              <tr><td colSpan={6}><div className="flex flex-col items-center justify-center py-12 text-ink-muted gap-2"><BookOpen size={32} className="opacity-30" /><p className="text-sm">Select a session to view allocations</p></div></td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={6}><div className="flex flex-col items-center justify-center py-12 text-ink-muted gap-2"><BookOpen size={32} className="opacity-30" /><p className="text-sm">No allocations found</p></div></td></tr>
            ) : paginated.map(row => (
              <tr key={row.id} className={selected.has(row.id) ? 'bg-danger/5' : ''}>
                <td>
                  <input type="checkbox" className="w-4 h-4"
                    checked={selected.has(row.id)}
                    onChange={() => toggleSelect(row.id)} />
                </td>
                <td className="font-mono text-xs text-ink-muted">{row.student_reg}</td>
                <td className="font-medium text-ink">{row.student_name}</td>
                <td>
                  {editingId === row.id ? (
                    <select className="form-input w-auto" value={editSupervisorId} onChange={e => setEditSupervisorId(e.target.value)} disabled={editLoading}>
                      {supervisors.map(sv => <option key={sv.id} value={sv.id}>{sv.teacher_name}</option>)}
                    </select>
                  ) : <span className="text-ink-muted">{row.supervisor_name}</span>}
                </td>
                <td><span className="badge badge-primary">{row.section_name}</span></td>
                <td>
                  {editingId === row.id ? (
                    <div className="flex gap-1">
                      <button type="button" className="btn btn-primary py-1 px-3 text-xs" onClick={() => handleSaveEdit(row)} disabled={editLoading}>{editLoading ? 'Saving…' : 'Save'}</button>
                      <button type="button" className="btn btn-outline py-1 px-3 text-xs" onClick={() => setEditingId(null)} disabled={editLoading}>Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button type="button" className="btn btn-ghost p-1.5 text-xs" onClick={() => startEdit(row)}>Edit</button>
                      <button type="button" className="btn btn-ghost p-1.5 text-danger" onClick={() => setConfirmDelete(row.id)} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  )}
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

      <BulkUploadModal open={bulkOpen} onClose={() => setBulkOpen(false)}
        onDone={() => fetchData(selectedSessionId)} sessionId={selectedSessionId}
        sessionName={selectedSession?.session_name ?? ''} />

      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Allocation">
        <AllocationForm sessionId={selectedSessionId} onSuccess={() => { setAddModalOpen(false); fetchData(selectedSessionId); }} />
      </Modal>

      <RandomAllocateModal
        open={randomOpen}
        onClose={() => setRandomOpen(false)}
        onConfirm={handleRandomAllocate}
        sections={sections}
        allocating={allocating}
      />

      <ConfirmDialog
        open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Delete Allocation"
        message="Remove this student's supervisor allocation? This cannot be undone."
        danger confirmLabel="Delete"
      />

      <ConfirmDialog
        open={confirmBulkDelete} onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selected.size} Allocation${selected.size !== 1 ? 's' : ''}`}
        message={`Remove ${selected.size} selected allocation${selected.size !== 1 ? 's' : ''}? This cannot be undone.`}
        danger confirmLabel="Delete All"
      />
    </div>
  );
}
