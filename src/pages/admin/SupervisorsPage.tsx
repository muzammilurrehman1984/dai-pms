import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageSpinner } from '../../components/ui/Spinner';
import { PaginationBar } from '../../components/shared/PaginationBar';
import SupervisorForm from '../../components/admin/SupervisorForm';
import { listSupervisors, createSupervisor, updateSupervisor, deleteSupervisor } from '../../services/supervisors.service';
import { resetSupervisorPassword } from '../../services/auth.service';
import { toast } from '../../components/ui/Toast';
import { usePagination } from '../../hooks/usePagination';
import { Plus, Edit2, Trash2, Search, Users, Upload, X, CheckCircle, AlertTriangle, KeyRound } from 'lucide-react';
import { ResetPasswordModal } from '../../components/shared/ResetPasswordModal';
import type { Supervisor } from '../../types';

const REQUIRED_COLUMNS = ['teacher_name', 'email', 'password'];

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

interface ProgressResult { name: string; ok: boolean; error?: string; }
interface Progress { done: number; total: number; results: ProgressResult[]; }

function BulkUploadModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void; }) {
  const [rows, setRows]               = useState<Record<string, string>[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [progress, setProgress]       = useState<Progress | null>(null);
  const [running, setRunning]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setRows([]); setParseErrors([]); setProgress(null); setRunning(false); }
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
    const missing = REQUIRED_COLUMNS.filter(c => !headers.includes(c));
    if (missing.length) { setParseErrors([`Missing columns: ${missing.join(', ')}`]); setRows([]); return; }
    const errs: string[] = [];
    parsed.forEach((r, i) => {
      const n = i + 2;
      if (!r.teacher_name?.trim()) errs.push(`Row ${n}: teacher_name required`);
      if (!r.email?.trim())        errs.push(`Row ${n}: email required`);
      if (!r.password?.trim())     errs.push(`Row ${n}: password required`);
      else if (r.password.length < 6) errs.push(`Row ${n}: password min 6 characters`);
    });
    setParseErrors(errs);
    setRows(parsed);
  }

  async function handleImport() {
    if (!rows.length || parseErrors.length) return;
    setRunning(true);
    const results: ProgressResult[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        await createSupervisor({ teacher_name: r.teacher_name.trim(), designation: r.designation?.trim() || '', expertise: r.expertise?.trim() || undefined, mobile_number: r.mobile_number?.trim() || undefined, email: r.email.trim().toLowerCase(), password: r.password.trim() });
        results.push({ name: r.teacher_name, ok: true });
      } catch (err) {
        results.push({ name: r.teacher_name, ok: false, error: err instanceof Error ? err.message : 'Unknown error' });
      }
      setProgress({ done: i + 1, total: rows.length, results: [...results] });
    }
    setRunning(false);
    onDone();
  }

  const canImport = rows.length > 0 && parseErrors.length === 0 && !progress;
  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Modal open={open} onClose={running ? () => {} : onClose} title="Bulk Upload Supervisors" size="lg">
      <div className="flex flex-col gap-5">
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm">
          <p className="font-semibold text-ink mb-2">CSV Format</p>
          <code className="block text-xs font-mono text-ink-muted bg-white/60 rounded-lg p-3 border border-primary/10 whitespace-pre">{`teacher_name,designation,expertise,mobile_number,email,password\n"John Smith","Lecturer","AI","03001234567","john@example.com","Pass@1234"`}</code>
          <p className="text-xs text-ink-muted mt-2">Required: <span className="font-medium text-ink">teacher_name, email, password</span> · Optional: designation, expertise, mobile_number</p>
        </div>
        {!progress && (
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
        {rows.length > 0 && !progress && (
          <div className="border border-surface-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-surface border-b border-surface-border flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">{rows.length} supervisor{rows.length !== 1 ? 's' : ''} ready to import</span>
              <button type="button" className="btn btn-ghost p-1" onClick={() => { setRows([]); setParseErrors([]); if (fileRef.current) fileRef.current.value = ''; }}><X size={14} /></button>
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-surface-border">
              {rows.map((r, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                  <div className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-semibold text-xs flex-shrink-0">{r.teacher_name?.[0]?.toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink truncate">{r.teacher_name}</div>
                    <div className="text-xs text-ink-muted truncate">{r.email}{r.designation ? ` · ${r.designation}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {progress && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">{running ? 'Importing…' : 'Done'}</span>
              <span className="font-semibold text-ink">{progress.done} / {progress.total} · {pct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-surface-border overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1.5">
              {progress.results.map((r, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${r.ok ? 'bg-success/10 text-success-dark' : 'bg-danger/10 text-danger-dark'}`}>
                  {r.ok ? <CheckCircle size={13} className="flex-shrink-0" /> : <AlertTriangle size={13} className="flex-shrink-0" />}
                  <span className="font-medium truncate">{r.name}</span>
                  {!r.ok && <span className="truncate opacity-80">— {r.error}</span>}
                </div>
              ))}
            </div>
            {!running && (
              <p className="text-sm text-ink-muted pt-1">
                <span className="text-success font-medium">{progress.results.filter(r => r.ok).length} created</span>
                {progress.results.filter(r => !r.ok).length > 0 && <span className="text-danger font-medium ml-3">{progress.results.filter(r => !r.ok).length} failed</span>}
              </p>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          {!running && <button type="button" className="btn btn-outline" onClick={onClose}>{progress ? 'Close' : 'Cancel'}</button>}
          {canImport && <button type="button" className="btn btn-primary" onClick={handleImport}><Upload size={15} /> Import {rows.length} Supervisors</button>}
        </div>
      </div>
    </Modal>
  );
}

export default function SupervisorsPage() {
  const [supervisors, setSupervisors]   = useState<Supervisor[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [addModalOpen, setAddModalOpen]     = useState(false);
  const [bulkOpen, setBulkOpen]             = useState(false);
  const [editSupervisor, setEditSupervisor] = useState<Supervisor | null>(null);
  const [editForm, setEditForm]             = useState({ teacher_name: '', designation: '', expertise: '', mobile_number: '' });
  const [editLoading, setEditLoading]       = useState(false);
  const [editError, setEditError]           = useState('');
  const [confirmDelete, setConfirmDelete]   = useState<Supervisor | null>(null);
  const [resetSupervisor, setResetSupervisor] = useState<Supervisor | null>(null);

  const pg = usePagination(50);

  const fetchSupervisors = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setSupervisors(await listSupervisors()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load supervisors.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSupervisors(); }, [fetchSupervisors]);

  const handleDelete = async (id: string) => {
    try {
      await deleteSupervisor(id);
      setSupervisors(prev => prev.filter(s => s.id !== id));
      toast('Supervisor deleted', 'success');
    } catch (err) { toast(err instanceof Error ? err.message : 'Failed to delete supervisor.', 'error'); }
  };

  const openEdit = (s: Supervisor) => {
    setEditSupervisor(s);
    setEditForm({ teacher_name: s.teacher_name, designation: s.designation, expertise: s.expertise ?? '', mobile_number: s.mobile_number ?? '' });
    setEditError('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSupervisor) return;
    setEditLoading(true);
    setEditError('');
    try {
      const updated = await updateSupervisor(editSupervisor.id, { teacher_name: editForm.teacher_name.trim(), designation: editForm.designation.trim(), expertise: editForm.expertise.trim() || undefined, mobile_number: editForm.mobile_number.trim() || undefined });
      setSupervisors(prev => prev.map(s => s.id === updated.id ? updated : s));
      setEditSupervisor(null);
      toast('Supervisor updated', 'success');
    } catch (err) { setEditError(err instanceof Error ? err.message : 'Failed to update supervisor.'); }
    finally { setEditLoading(false); }
  };

  // Unique designations for filter dropdown
  const designations = [...new Set(supervisors.map(s => s.designation).filter(Boolean))].sort();

  const filtered = supervisors.filter(s => {
    if (designationFilter && s.designation !== designationFilter) return false;
    if (search.trim() && !s.teacher_name.toLowerCase().includes(search.toLowerCase()) && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pages     = pg.totalPages(filtered.length);
  const paginated = pg.paginate(filtered);

  function handleSearch(v: string) { setSearch(v); pg.reset(); }
  function handleDesig(v: string)  { setDesignationFilter(v); pg.reset(); }

  if (loading && !supervisors.length) return <PageSpinner />;

  const searchSlot = (
    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input className="form-input pl-9" placeholder="Search by name or email…"
          value={search} onChange={e => handleSearch(e.target.value)} />
      </div>
      <select className="form-input w-auto" value={designationFilter} onChange={e => handleDesig(e.target.value)}>
        <option value="">All Designations</option>
        {designations.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <span className="text-xs text-ink-muted">{filtered.length} of {supervisors.length}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Supervisors</h1>
          <p className="text-ink-muted text-sm mt-1">{supervisors.length} total</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-outline" onClick={() => setBulkOpen(true)}><Upload size={15} /> Bulk Upload</button>
          <button type="button" className="btn btn-primary" onClick={() => setAddModalOpen(true)}><Plus size={16} /> Add Supervisor</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid-responsive">
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Total Supervisors</span>
          {loading ? <div className="h-8 w-12 bg-surface-border rounded animate-pulse mt-1" />
            : <span className="text-3xl font-bold text-primary">{supervisors.length}</span>}
          <span className="text-xs text-ink-faint">registered</span>
        </div>
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Filtered</span>
          <span className="text-3xl font-bold text-secondary">{filtered.length}</span>
          <span className="text-xs text-ink-faint">matching filters</span>
        </div>
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">Designations</span>
          <span className="text-3xl font-bold text-success">{designations.length}</span>
          <span className="text-xs text-ink-faint">unique</span>
        </div>
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">On This Page</span>
          <span className="text-3xl font-bold text-accent">{paginated.length}</span>
          <span className="text-xs text-ink-faint">
            {filtered.length !== supervisors.length ? `of ${filtered.length} filtered` : `of ${filtered.length} total`}
          </span>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Top pagination bar */}
      <PaginationBar page={pg.page} pageSize={pg.pageSize} total={filtered.length}
        totalPages={pages} onPage={pg.setPage} onPageSize={pg.handlePageSize} searchSlot={searchSlot} />

      {/* Table */}
      <div className="table-wrap">
        <table className="table-base">
          <thead><tr>
            <th>Name</th><th>Designation</th><th>Expertise</th><th>Mobile</th><th>Email</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j}><div className="h-4 bg-surface-border rounded animate-pulse" /></td>)}</tr>
              ))
            ) : paginated.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="flex flex-col items-center justify-center py-12 text-ink-muted gap-2">
                  <Users size={32} className="opacity-30" /><p className="text-sm">No supervisors found</p>
                </div>
              </td></tr>
            ) : paginated.map(s => (
              <tr key={s.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-semibold text-sm flex-shrink-0">{s.teacher_name[0].toUpperCase()}</div>
                    <span className="font-medium text-ink">{s.teacher_name}</span>
                  </div>
                </td>
                <td className="text-ink-muted">{s.designation || '—'}</td>
                <td className="text-ink-muted">{s.expertise ?? '—'}</td>
                <td className="text-ink-muted">{s.mobile_number ?? '—'}</td>
                <td className="font-mono text-xs text-ink-muted">{s.email}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <button type="button" className="btn btn-ghost p-1.5" onClick={() => openEdit(s)}><Edit2 size={14} /></button>
                    <button type="button" className="btn btn-ghost p-1.5 text-accent" onClick={() => setResetSupervisor(s)} title="Reset password"><KeyRound size={14} /></button>
                    <button type="button" className="btn btn-ghost p-1.5 text-danger" onClick={() => setConfirmDelete(s)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom pagination bar */}
      <PaginationBar page={pg.page} pageSize={pg.pageSize} total={filtered.length}
        totalPages={pages} onPage={pg.setPage} onPageSize={pg.handlePageSize} />

      <BulkUploadModal open={bulkOpen} onClose={() => setBulkOpen(false)}
        onDone={() => { fetchSupervisors(); toast('Bulk import complete', 'success'); }} />

      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Supervisor">
        <SupervisorForm onSuccess={() => { setAddModalOpen(false); fetchSupervisors(); }} />
      </Modal>

      <Modal open={!!editSupervisor} onClose={() => setEditSupervisor(null)} title="Edit Supervisor">
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <div>
            <label className="form-label">Teacher Name <span className="text-danger">*</span></label>
            <input className="form-input" value={editForm.teacher_name} autoFocus onChange={e => setEditForm(p => ({ ...p, teacher_name: e.target.value }))} disabled={editLoading} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Designation</label>
              <input className="form-input" value={editForm.designation} placeholder="e.g. Lecturer" onChange={e => setEditForm(p => ({ ...p, designation: e.target.value }))} disabled={editLoading} />
            </div>
            <div>
              <label className="form-label">Expertise</label>
              <input className="form-input" value={editForm.expertise} placeholder="e.g. Machine Learning" onChange={e => setEditForm(p => ({ ...p, expertise: e.target.value }))} disabled={editLoading} />
            </div>
          </div>
          <div>
            <label className="form-label">Mobile Number</label>
            <input className="form-input" value={editForm.mobile_number} placeholder="e.g. 03001234567" onChange={e => setEditForm(p => ({ ...p, mobile_number: e.target.value }))} disabled={editLoading} />
          </div>
          {editError && <p className="form-error text-sm">{editError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn btn-outline" onClick={() => setEditSupervisor(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={editLoading}>{editLoading ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete.id)}
        title="Delete Supervisor" message={`Delete "${confirmDelete?.teacher_name}"? This cannot be undone.`}
        danger confirmLabel="Delete" />

      <ResetPasswordModal
        open={!!resetSupervisor}
        onClose={() => setResetSupervisor(null)}
        onConfirm={async (newPassword) => {
          if (!resetSupervisor) return;
          await resetSupervisorPassword(resetSupervisor.id, newPassword);
          toast(`Password reset for ${resetSupervisor.teacher_name}`, 'success');
        }}
        targetName={resetSupervisor?.teacher_name ?? ''}
      />
    </div>
  );
}
