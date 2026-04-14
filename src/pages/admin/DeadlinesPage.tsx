import { useEffect, useState } from 'react';
import { PageSpinner } from '../../components/ui/Spinner';
import DeadlineManager from '../../components/admin/DeadlineManager';
import { listSessions } from '../../services/sessions.service';
import { supabase } from '../../services/supabase';
import type { Session, Semester } from '../../types';

export default function DeadlinesPage() {
  const [sessions, setSessions]               = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [semesters, setSemesters]             = useState<Semester[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingSemesters, setLoadingSemesters] = useState(false);
  const [error, setError]                     = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await listSessions();
        setSessions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sessions.');
      } finally {
        setLoadingSessions(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedSessionId) { setSemesters([]); return; }
    setLoadingSemesters(true);
    setError('');
    (async () => {
      try {
        const { data, error: sbError } = await supabase.from('semesters').select('*').eq('session_id', selectedSessionId);
        if (sbError) throw new Error(sbError.message);
        setSemesters((data ?? []) as Semester[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load semesters.');
      } finally {
        setLoadingSemesters(false);
      }
    })();
  }, [selectedSessionId]);

  const sem7 = semesters.find(s => s.semester_number === 7);
  const sem8 = semesters.find(s => s.semester_number === 8);

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <h1 className="page-title">Submission Deadlines</h1>

      <div className="flex items-center gap-3">
        <label className="form-label mb-0">Session</label>
        {loadingSessions ? (
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : (
          <select className="form-input w-auto" value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)}>
            <option value="">— Select a session —</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.session_name}</option>)}
          </select>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {selectedSessionId && (
        loadingSemesters ? <PageSpinner /> : (
          <div className="flex flex-col gap-6">
            {sem7 && <DeadlineManager semesterId={sem7.id} semesterNumber={7} />}
            {sem8 && <DeadlineManager semesterId={sem8.id} semesterNumber={8} />}
            {!sem7 && !sem8 && <p className="text-sm text-ink-muted">No semesters found for this session.</p>}
          </div>
        )
      )}
    </div>
  );
}
