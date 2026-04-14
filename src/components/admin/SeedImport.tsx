import React, { useEffect, useState } from 'react';
import { listSessions } from '../../services/sessions.service';
import { listSections } from '../../services/sections.service';
import { importSupervisorsCSV, importStudentsCSV } from '../../services/seed.service';
import { Button, Spinner } from '../ui';
import type { Session, Section, RowError } from '../../types';

type Step = 1 | 2;

interface ImportResult {
  successes: number;
  failures: RowError[];
}

const SeedImport: React.FC = () => {
  const [step, setStep] = useState<Step>(1);

  // Step 1 state
  const [teacherFile, setTeacherFile] = useState<File | null>(null);
  const [teacherResult, setTeacherResult] = useState<ImportResult | null>(null);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState<string | null>(null);

  // Step 2 state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [studentResult, setStudentResult] = useState<ImportResult | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  // Load sessions when entering step 2
  useEffect(() => {
    if (step !== 2) return;
    setSessionsLoading(true);
    listSessions()
      .then(setSessions)
      .catch((err) => setStudentError(err instanceof Error ? err.message : 'Failed to load sessions.'))
      .finally(() => setSessionsLoading(false));
  }, [step]);

  // Load sections when session changes
  useEffect(() => {
    if (!selectedSession) {
      setSections([]);
      setSelectedSection('');
      return;
    }
    setSectionsLoading(true);
    listSections(selectedSession)
      .then((data) => {
        setSections(data);
        setSelectedSection('');
      })
      .catch((err) => setStudentError(err instanceof Error ? err.message : 'Failed to load sections.'))
      .finally(() => setSectionsLoading(false));
  }, [selectedSession]);

  async function handleTeacherImport() {
    if (!teacherFile) return;
    setTeacherLoading(true);
    setTeacherError(null);
    setTeacherResult(null);
    try {
      const text = await teacherFile.text();
      const result = await importSupervisorsCSV(text);
      setTeacherResult(result);
    } catch (err) {
      setTeacherError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setTeacherLoading(false);
    }
  }

  async function handleStudentImport() {
    if (!studentFile || !selectedSection) return;
    setStudentLoading(true);
    setStudentError(null);
    setStudentResult(null);
    try {
      const text = await studentFile.text();
      const result = await importStudentsCSV(text, selectedSection);
      setStudentResult(result);
    } catch (err) {
      setStudentError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setStudentLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Seed Import</h1>

      {/* Step tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {([1, 2] as Step[]).map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              step === s
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s === 1 ? 'Step 1: Teachers' : 'Step 2: Students'}
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload a <code className="bg-gray-100 px-1 rounded">teachers.csv</code> file to import supervisors.
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setTeacherFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <Button
            onClick={handleTeacherImport}
            disabled={!teacherFile || teacherLoading}
          >
            {teacherLoading ? <Spinner size="sm" className="mr-2" /> : null}
            Import Teachers
          </Button>

          {teacherError && <p className="text-sm text-red-600">{teacherError}</p>}

          {teacherResult && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-2">
              <p className="text-sm font-medium text-green-700">
                {teacherResult.successes} teacher{teacherResult.successes !== 1 ? 's' : ''} imported successfully.
              </p>
              {teacherResult.failures.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-600 mb-1">
                    {teacherResult.failures.length} row{teacherResult.failures.length !== 1 ? 's' : ''} failed:
                  </p>
                  <ul className="text-xs text-red-500 space-y-1 max-h-40 overflow-y-auto">
                    {teacherResult.failures.map((f) => (
                      <li key={f.row}>Row {f.row}: {f.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Next: Import Students →
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select a session and section, then upload a student CSV file.
          </p>

          {sessionsLoading ? (
            <Spinner size="sm" className="text-indigo-600" />
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Select session —</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>{s.session_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                {sectionsLoading ? (
                  <Spinner size="sm" className="text-indigo-600" />
                ) : (
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    disabled={!selectedSession}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                  >
                    <option value="">— Select section —</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>{s.section_name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          <input
            type="file"
            accept=".csv"
            onChange={(e) => setStudentFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />

          <Button
            onClick={handleStudentImport}
            disabled={!studentFile || !selectedSection || studentLoading}
          >
            {studentLoading ? <Spinner size="sm" className="mr-2" /> : null}
            Import Students
          </Button>

          {studentError && <p className="text-sm text-red-600">{studentError}</p>}

          {studentResult && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-2">
              <p className="text-sm font-medium text-green-700">
                {studentResult.successes} student{studentResult.successes !== 1 ? 's' : ''} imported successfully.
              </p>
              {studentResult.failures.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-600 mb-1">
                    {studentResult.failures.length} row{studentResult.failures.length !== 1 ? 's' : ''} failed:
                  </p>
                  <ul className="text-xs text-red-500 space-y-1 max-h-40 overflow-y-auto">
                    {studentResult.failures.map((f) => (
                      <li key={f.row}>Row {f.row}: {f.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SeedImport;
