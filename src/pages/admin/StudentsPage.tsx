import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import StudentForm from '../../components/admin/StudentForm';
import { listStudents, updateStudent, deleteStudent, resetStudentPassword, createStudent } from '../../services/students.service';
import { listSections } from '../../services/sections.service';
import { listSessions } from '../../services/sessions.service';
import { compareRegNumbers, compareSessionNames, compareSectionNames } from '../../utils/formatters';
import { toast } from '../../components/ui/Toast';
import { ResetPasswordModal } from '../../components/shared/ResetPasswordModal';
import { Plus, Edit2, Trash2, Search, GraduationCap, Upload, KeyRound, X, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

import type { Student, Session, Section } from '../../types';

const CSV_COLUMNS = ['reg_number', 'student_name', 'father_name', 'mobile_number', 'email', 'password'];
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

// ── CSV parser ────────────────────────────────────────────────────────────────
function BulkUploadModal({ open, onClose, onDone, sectionId, sessionName, sectionName }: {
  open: boolean; onClose: () => void; onDone: () => void;
  sectionId: string; sessionName: string; sectionName: string;
}) {
  const [rows, setRows]         = useState<Record<string, string>[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [running, setRunning]   = useState(false);
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
    const missing = CSV_COLUMNS.filter(c => !headers.includes(c));
    if (missing.length) { setParseErrors([`Missing columns: ${missing.join(', ')}`]); setRows([]); return; }
    const errs: string[] = [];
    parsed.forEach((r, i) => {
      const n = i + 2;
      if (!r.reg_number?.trim())    errs.push(`Row ${n}: reg_number required`);
      if (!r.student_name?.trim())  errs.push(`Row ${n}: student_name required`);
      if (!r.email?.trim())         errs.push(`Row ${n}: email required`);
      if (!r.password?.trim())      errs.push(`Row ${n}: password required`);
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
        await createStudent({
          reg_number:   r.reg_number.trim(),
          student_name: r.student_name.trim(),
          father_name:  r.father_name?.trim() || undefined,
          mobile_number: r.mobile_number?.trim() || undefined,
          email:        r.email.trim().toLowerCase(),
          password:     r.password.trim(),
          section_id:   sectionId,
        });
        results.push({ name: r.student_name, ok: true });
      } catch (err) {
        results.push({ name: r.student_name, ok: false, error: err instanceof Error ? err.message : 'Unknown error' });
      }
      setProgress({ done: i + 1, total: rows.length, results: [...results] });
    }
    setRunning(false);
    onDone();
  }

  const canImport = rows.length > 0 && parseErrors.length === 0 && !progress;
  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Modal open={open} onClose={running ? () => {} : onClose} title="Bulk Upload Students" size="lg">
      <div className="flex flex-col gap-5">

        {/* Format guide */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm">
          <p className="font-semibold text-ink mb-2">CSV Format</p>
          <code className="block text-xs font-mono text-ink-muted bg-white/60 rounded-lg p-3 border border-primary/10 whitespace-pre">{`reg_number,student_name,father_name,mobile_number,email,password\n"BSAI-01","Ali Hassan","Hassan Ali","03001234567","ali@example.com","Pass@1234"\n"BSAI-02","Sara Khan","Khan Sahib","03007654321","sara@example.com","Pass@5678"`}</code>
          <p className="text-xs text-ink-muted mt-2">
            Required: <span className="font-medium text-ink">reg_number, student_name, email, password</span> · Optional: father_name, mobile_number
          </p>
        </div>

        {/* Target context */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-surface-border text-sm">
          <div className="flex-1 min-w-0">
            <span className="text-xs text-ink-muted uppercase tracking-wide">Uploading to</span>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="badge badge-primary">{sessionName || '—'}</span>
              <span className="text-ink-faint">›</span>
              <span className="badge badge-primary">{sectionName || '—'}</span>
            </div>
          </div>
        </div>

        {/* File input */}
        {!progress && (
          <div>
            <label className="form-label">Upload CSV File</label>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile}
              className="block w-full text-sm text-ink-muted
                file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0
                file:text-sm file:font-medium file:bg-primary/10 file:text-primary
                hover:file:bg-primary/20 cursor-pointer" />
          </div>
        )}

        {/* Parse errors */}
        {parseErrors.length > 0 && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger-dark space-y-1 max-h-40 overflow-y-auto">
            {parseErrors.map((e, i) => (
              <p key={i} className="flex items-start gap-1.5">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />{e}
              </p>
            ))}
          </div>
        )}

        {/* Preview */}
        {rows.length > 0 && !progress && (
          <div className="border border-surface-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-surface border-b border-surface-border flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">
                {rows.length} student{rows.length !== 1 ? 's' : ''} ready to import
              </span>
              <button type="button" className="btn btn-ghost p-1"
                onClick={() => { setRows([]); setParseErrors([]); if (fileRef.current) fileRef.current.value = ''; }}>
                <X size={14} />
              </button>
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-surface-border">
              {rows.map((r, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                    {r.student_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink truncate">{r.student_name}</div>
                    <div className="text-xs text-ink-muted truncate">{r.reg_number} · {r.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress */}
        {progress && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">{running ? 'Importing…' : 'Done'}</span>
              <span className="font-semibold text-ink">{progress.done} / {progress.total} &nbsp;·&nbsp; {pct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-surface-border overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-300 progress-anim"
                style={{ width: `${pct}%` }} />
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1.5">
              {progress.results.map((r, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg
                  ${r.ok ? 'bg-success/10 text-success-dark' : 'bg-danger/10 text-danger-dark'}`}>
                  {r.ok
                    ? <CheckCircle size={13} className="flex-shrink-0" />
                    : <AlertTriangle size={13} className="flex-shrink-0" />}
                  <span className="font-medium truncate">{r.name}</span>
                  {!r.ok && <span className="truncate opacity-80">— {r.error}</span>}
                </div>
              ))}
            </div>
            {!running && (
              <p className="text-sm text-ink-muted pt-1">
                <span className="text-success font-medium">{progress.results.filter(r => r.ok).length} created</span>
                {progress.results.filter(r => !r.ok).length > 0 && (
                  <span className="text-danger font-medium ml-3">{progress.results.filter(r => !r.ok).length} failed</span>
                )}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          {!running && (
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {progress ? 'Close' : 'Cancel'}
            </button>
          )}
          {canImport && (
            <button type="button" className="btn btn-primary" onClick={handleImport}>
              <Upload size={15} /> Import {rows.length} Students
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100, 200, 300, 400, 500, 1000, 0] as const; // 0 = All
type PageSizeOption = typeof PAGE_SIZE_OPTIONS[number];

export default function StudentsPage() {
  const [sessions, setSessions]   = useState<Session[]>([]);
  const [sections, setSections]   = useState<Section[]>([]);
  const [students, setStudents]   = useState<Student[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // Stats — loaded independently at each drill-down level
  const [totalAll, setTotalAll]         = useState<number | null>(null);
  const [totalSession, setTotalSession] = useState<number | null>(null);
  const [totalSection, setTotalSection] = useState<number | null>(null);

  // Pagination
  const [page, setPage]           = useState(0);
  const [pageSize, setPageSize]   = useState<PageSizeOption>(50);

  const [addModalOpen, setAddModalOpen]   = useState(false);
  const [bulkOpen, setBulkOpen]           = useState(false);
  const [editStudent, setEditStudent]     = useState<Student | null>(null);
  const [editForm, setEditForm]           = useState({ student_name: '', father_name: '', mobile_number: '' });
  const [editLoading, setEditLoading]     = useState(false);
  const [editError, setEditError]         = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Student | null>(null);
  const [resetStudent, setResetStudent]   = useState<Student | null>(null);

  useEffect(() => {
    listSessions()
      .then(data => setSessions([...data].sort((a, b) => compareSessionNames(a.session_name, b.session_name))))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load sessions.'));
    // Global total on mount
    listStudents()
      .then(data => setTotalAll(data.length))
      .catch(() => setTotalAll(null));
  }, []);

  useEffect(() => {
    setTotalSession(null);
    setTotalSection(null);
    setSections([]);
    setSelectedSectionId('');
    setStudents([]);
    setPage(0);
    if (!selectedSessionId) return;
    listSections(selectedSessionId)
      .then(data => setSections([...data].sort((a, b) => compareSectionNames(a.section_name, b.section_name))))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load sections.'));
    // Session-level count
    listStudents({ sessionId: selectedSessionId })
      .then(data => setTotalSession(data.length))
      .catch(() => setTotalSession(null));
  }, [selectedSessionId]);

  const fetchStudents = useCallback(async (sectionId: string) => {
    if (!sectionId) { setStudents([]); setTotalSection(null); return; }
    setLoading(true);
    setError('');
    try {
      const data = await listStudents({ sectionId });
      const sorted = [...data].sort((a, b) => compareRegNumbers(a.reg_number, b.reg_number));
      setStudents(sorted);
      setTotalSection(sorted.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedSectionId(id);
    setPage(0);
    fetchStudents(id);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteStudent(id);
      setStudents(prev => prev.filter(s => s.id !== id));
      setTotalSection(prev => prev !== null ? prev - 1 : null);
      setTotalAll(prev => prev !== null ? prev - 1 : null);
      toast('Student deleted', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete student.', 'error');
    }
  };

  const handlePasswordReset = async (newPassword: string) => {
    if (!resetStudent) return;
    await resetStudentPassword(resetStudent.id, newPassword);
    toast(`Password reset for ${resetStudent.student_name}`, 'success');
  };

  const openEdit = (student: Student) => {
    setEditStudent(student);
    setEditForm({ student_name: student.student_name, father_name: student.father_name ?? '', mobile_number: student.mobile_number ?? '' });
    setEditError('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;
    setEditLoading(true);
    setEditError('');
    try {
      const updated = await updateStudent(editStudent.id, {
        student_name: editForm.student_name.trim(),
        father_name: editForm.father_name.trim() || undefined,
        mobile_number: editForm.mobile_number.trim() || undefined,
      });
      setStudents(prev => [...prev.map(s => s.id === updated.id ? updated : s)].sort((a, b) => compareRegNumbers(a.reg_number, b.reg_number)));
      setEditStudent(null);
      toast('Student updated', 'success');
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update student.');
    } finally {
      setEditLoading(false);
    }
  };

  const filtered = students.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.student_name.toLowerCase().includes(q) || s.reg_number.toLowerCase().includes(q);
  });

  // Derived labels for bulk upload context
  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const selectedSection = sections.find(s => s.id === selectedSectionId);

  // Pagination
  const totalPages  = pageSize === 0 ? 1 : Math.ceil(filtered.length / pageSize);
  const paginated   = pageSize === 0 ? filtered : filtered.slice(page * pageSize, (page + 1) * pageSize);

  function handleSearch(val: string) { setSearch(val); setPage(0); }
  function handlePageSize(val: PageSizeOption) { setPageSize(val); setPage(0); }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="text-ink-muted text-sm mt-1">
            {totalAll !== null ? `${totalAll} total across all sessions` : 'Loading…'}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-outline" onClick={() => setBulkOpen(true)} disabled={!selectedSectionId}>
            <Upload size={15} /> Bulk Upload
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setAddModalOpen(true)} disabled={!selectedSectionId}>
            <Plus size={16} /> Add Student
          </button>
        </div>
      </div>

      {/* Stats — always visible, progressively populated */}
      <div className="stat-grid-responsive">
        <div className="card stat-card">
          <span className="text-xs text-ink-muted uppercase tracking-wide">All Students</span>
          {totalAll !== null
            ? <span className="text-3xl font-bold text-primary">{totalAll}</span>
            : <div className="h-8 w-16 bg-surface-border rounded animate-pulse mt-1" />}
          <span className="text-xs text-ink-faint">across all sessions</span>
        </div>

        <div className={`card stat-card transition-opacity duration-200 ${selectedSessionId ? 'opacity-100' : 'opacity-40'}`}>
          <span className="text-xs text-ink-muted uppercase tracking-wide">
            {selectedSession ? selectedSession.session_name : 'Session'}
          </span>
          {selectedSessionId && totalSession !== null
            ? <span className="text-3xl font-bold text-secondary">{totalSession}</span>
            : selectedSessionId
              ? <div className="h-8 w-16 bg-surface-border rounded animate-pulse mt-1" />
              : <span className="text-3xl font-bold text-ink-faint">—</span>}
          <span className="text-xs text-ink-faint">in this session</span>
        </div>

        <div className={`card stat-card transition-opacity duration-200 ${selectedSectionId ? 'opacity-100' : 'opacity-40'}`}>
          <span className="text-xs text-ink-muted uppercase tracking-wide">
            {selectedSection ? selectedSection.section_name : 'Section'}
          </span>
          {selectedSectionId && totalSection !== null && !loading
            ? <span className="text-3xl font-bold text-success">{totalSection}</span>
            : selectedSectionId
              ? <div className="h-8 w-16 bg-surface-border rounded animate-pulse mt-1" />
              : <span className="text-3xl font-bold text-ink-faint">—</span>}
          <span className="text-xs text-ink-faint">in this section</span>
        </div>

        <div className={`card stat-card transition-opacity duration-200 ${selectedSectionId ? 'opacity-100' : 'opacity-40'}`}>
          <span className="text-xs text-ink-muted uppercase tracking-wide">On This Page</span>
          {selectedSectionId && !loading
            ? <span className="text-3xl font-bold text-accent">{paginated.length}</span>
            : selectedSectionId
              ? <div className="h-8 w-16 bg-surface-border rounded animate-pulse mt-1" />
              : <span className="text-3xl font-bold text-ink-faint">—</span>}
          <span className="text-xs text-ink-faint">
            {selectedSectionId && !loading
              ? filtered.length !== students.length
                ? `of ${filtered.length} filtered`
                : pageSize === 0 ? 'all shown' : `of ${filtered.length} total`
              : 'select a section'}
          </span>
        </div>
      </div>

      {/* Session → Section cascade */}
      <div className="flex flex-wrap gap-3">
        <select className="form-input w-auto" value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)}>
          <option value="">Select a session…</option>
          {sessions.map(s => <option key={s.id} value={s.id}>{s.session_name}</option>)}
        </select>
        <select className="form-input w-auto" value={selectedSectionId} onChange={handleSectionChange} disabled={!selectedSessionId}>
          <option value="">Select a section…</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.section_name}</option>)}
        </select>
      </div>

      {/* Top bar: search + pagination + page size */}
      {selectedSectionId && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input className="form-input pl-9" placeholder="Search name or reg #…"
              value={search} onChange={e => handleSearch(e.target.value)} />
          </div>
          {!loading && pageSize !== 0 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-ink-muted mr-1">
                {filtered.length === 0 ? '0' : page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
              </span>
              <button type="button" className="btn btn-outline py-1 px-3 text-xs"
                disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="px-2 font-medium text-ink text-xs">{page + 1} / {totalPages}</span>
              <button type="button" className="btn btn-outline py-1 px-3 text-xs"
                disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-ink-muted">Show</span>
            <select className="form-input w-auto text-sm" value={pageSize}
              onChange={e => handlePageSize(Number(e.target.value) as PageSizeOption)}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={40}>40</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={300}>300</option>
              <option value={400}>400</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
              <option value={0}>All</option>
            </select>
            <span className="text-xs text-ink-muted">per page</span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Table */}
      <div className="table-wrap">
        <table className="table-base">
          <thead><tr>
            <th>Reg #</th>
            <th>Student</th>
            <th>Father Name</th>
            <th>Mobile</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j}><div className="h-4 bg-surface-border rounded animate-pulse" /></td>)}</tr>
              ))
            ) : !selectedSectionId ? (
              <tr><td colSpan={5}>
                <div className="flex flex-col items-center justify-center py-12 text-ink-muted gap-2">
                  <GraduationCap size={32} className="opacity-30" />
                  <p className="text-sm">Select a session and section to view students</p>
                </div>
              </td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={5}>
                <div className="flex flex-col items-center justify-center py-12 text-ink-muted gap-2">
                  <GraduationCap size={32} className="opacity-30" />
                  <p className="text-sm">No students found</p>
                </div>
              </td></tr>
            ) : paginated.map(s => (
              <tr key={s.id}>
                <td className="font-mono text-xs text-ink-muted">{s.reg_number}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                      {s.student_name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-ink">{s.student_name}</div>
                      <div className="text-xs text-ink-muted">{s.email}</div>
                    </div>
                  </div>
                </td>
                <td className="text-ink-muted">{s.father_name ?? '—'}</td>
                <td className="text-ink-muted">{s.mobile_number ?? '—'}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <button type="button" className="btn btn-ghost p-1.5" onClick={() => openEdit(s)} title="Edit"><Edit2 size={14} /></button>
                    <button type="button" className="btn btn-ghost p-1.5 text-accent" onClick={() => setResetStudent(s)} title="Reset password"><KeyRound size={14} /></button>
                    <button type="button" className="btn btn-ghost p-1.5 text-danger" onClick={() => setConfirmDelete(s)} title="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom bar: pagination + page size (identical to top) */}
      {selectedSectionId && !loading && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs invisible pointer-events-none">
            {/* spacer to mirror search input width */}
          </div>
          {pageSize !== 0 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-ink-muted mr-1">
                {filtered.length === 0 ? '0' : page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
              </span>
              <button type="button" className="btn btn-outline py-1 px-3 text-xs"
                disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="px-2 font-medium text-ink text-xs">{page + 1} / {totalPages}</span>
              <button type="button" className="btn btn-outline py-1 px-3 text-xs"
                disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-ink-muted">Show</span>
            <select className="form-input w-auto text-sm" value={pageSize}
              onChange={e => handlePageSize(Number(e.target.value) as PageSizeOption)}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={40}>40</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={300}>300</option>
              <option value={400}>400</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
              <option value={0}>All</option>
            </select>
            <span className="text-xs text-ink-muted">per page</span>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Student">
        <StudentForm sessionId={selectedSessionId} sectionId={selectedSectionId}
          onSuccess={() => { setAddModalOpen(false); fetchStudents(selectedSectionId); }} />
      </Modal>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onDone={() => { fetchStudents(selectedSectionId); toast('Bulk import complete', 'success'); }}
        sectionId={selectedSectionId}
        sessionName={selectedSession?.session_name ?? ''}
        sectionName={selectedSection?.section_name ?? ''}
      />

      {/* Edit Modal */}
      <Modal open={!!editStudent} onClose={() => setEditStudent(null)} title="Edit Student">
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <div>
            <label className="form-label">Student Name <span className="text-danger">*</span></label>
            <input className="form-input" value={editForm.student_name}
              onChange={e => setEditForm(p => ({ ...p, student_name: e.target.value }))} disabled={editLoading} />
          </div>
          <div>
            <label className="form-label">Father Name</label>
            <input className="form-input" value={editForm.father_name}
              onChange={e => setEditForm(p => ({ ...p, father_name: e.target.value }))} disabled={editLoading} />
          </div>
          <div>
            <label className="form-label">Mobile Number</label>
            <input className="form-input" value={editForm.mobile_number}
              onChange={e => setEditForm(p => ({ ...p, mobile_number: e.target.value }))} disabled={editLoading} />
          </div>
          {editError && <p className="form-error text-sm">{editError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn btn-outline" onClick={() => setEditStudent(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={editLoading}>
              {editLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete.id)}
        title="Delete Student"
        message={`Delete "${confirmDelete?.student_name}"? This cannot be undone.`}
        danger confirmLabel="Delete"
      />

      <ResetPasswordModal
        open={!!resetStudent}
        onClose={() => setResetStudent(null)}
        onConfirm={handlePasswordReset}
        targetName={resetStudent?.student_name ?? ''}
      />
    </div>
  );
}
