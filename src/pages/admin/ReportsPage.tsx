import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { listSessions } from '../../services/sessions.service';
import { listSections } from '../../services/sections.service';
import MarksReport from '../../components/admin/MarksReport';
import { compareSessionNames, compareSectionNames } from '../../utils/formatters';
import type { Session, Semester, Section } from '../../types';

export default function ReportsPage() {
  const [sessions, setSessions]   = useState<Session[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [sections, setSections]   = useState<Section[]>([]);
  const [selectedSessionId, setSelectedSessionId]   = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [selectedSectionId, setSelectedSectionId]   = useState('');
  const [error, setError]         = useState('');

  useEffect(() => {
    listSessions()
      .then(data => setSessions([...data].sort((a, b) => compareSessionNames(a.session_name, b.session_name))))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load sessions.'));
  }, []);

  useEffect(() => {
    setSemesters([]); setSelectedSemesterId(''); setSections([]); setSelectedSectionId('');
    if (!selectedSessionId) return;
    supabase.from('semesters').select('*').eq('session_id', selectedSessionId)
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); return; }
        setSemesters([...((data ?? []) as Semester[])].sort((a, b) => a.semester_number - b.semester_number));
      });
  }, [selectedSessionId]);

  useEffect(() => {
    setSections([]); setSelectedSectionId('');
    if (!selectedSessionId || !selectedSemesterId) return;
    listSections(selectedSessionId)
      .then(data => setSections([...data].sort((a, b) => compareSectionNames(a.section_name, b.section_name))))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load sections.'));
  }, [selectedSessionId, selectedSemesterId]);

  const selectedSection = sections.find(s => s.id === selectedSectionId);
  const semesterLabel = (sem: Semester) => sem.semester_number === 7 ? 'Semester 7 (FYP-I)' : 'Semester 8 (FYP-II)';

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <h1 className="page-title">Reports</h1>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Cascade dropdowns */}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label className="form-label">Session</label>
          <select className="form-input w-auto min-w-[180px]" value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)}>
            <option value="">Select session…</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.session_name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="form-label">Semester</label>
          <select className="form-input w-auto min-w-[200px]" value={selectedSemesterId}
            onChange={e => setSelectedSemesterId(e.target.value)} disabled={!selectedSessionId || semesters.length === 0}>
            <option value="">Select semester…</option>
            {semesters.map(sem => <option key={sem.id} value={sem.id}>{semesterLabel(sem)}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="form-label">Section</label>
          <select className="form-input w-auto min-w-[160px]" value={selectedSectionId}
            onChange={e => setSelectedSectionId(e.target.value)} disabled={!selectedSemesterId || sections.length === 0}>
            <option value="">Select section…</option>
            {sections.map(sec => <option key={sec.id} value={sec.id}>{sec.section_name}</option>)}
          </select>
        </div>
      </div>

      {selectedSectionId && selectedSemesterId && selectedSection ? (
        <MarksReport sectionId={selectedSectionId} semesterId={selectedSemesterId} sectionName={selectedSection.section_name} />
      ) : (
        <p className="text-sm text-ink-muted">Select a session, semester, and section to view the marks report.</p>
      )}
    </div>
  );
}
