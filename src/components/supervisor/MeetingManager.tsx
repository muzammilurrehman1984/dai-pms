import React, { useState } from 'react';
import { Button } from '../ui';
import { createMeeting } from '../../services/meetings.service';
import { AlertTriangle } from 'lucide-react';
import type { MeetingScope, Student } from '../../types';

interface Props {
  supervisorId: string;
  /** Fallback semesterId when sectionSemesterMap is empty */
  semesterId: string;
  /** Maps section_id → semester_id so we can derive the correct semester per student */
  sectionSemesterMap: Map<string, string>;
  students: Student[];
  onSuccess: () => void;
}

const MeetingManager: React.FC<Props> = ({
  supervisorId, semesterId, sectionSemesterMap, students, onSuccess,
}) => {
  const [scope, setScope]                           = useState<MeetingScope>('Individual');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt]               = useState('');
  const [loading, setLoading]                       = useState(false);
  const [error, setError]                           = useState('');

  function toggleStudent(id: string) {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  /** Derive semester_id from the selected students' sections, or fall back to prop */
  function resolveSemesterId(studentIds: string[]): string {
    for (const sid of studentIds) {
      const student = students.find(s => s.id === sid);
      if (student?.section_id) {
        const mapped = sectionSemesterMap.get(student.section_id);
        if (mapped) return mapped;
      }
    }
    return semesterId; // fallback
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const studentIds = scope === 'All' ? students.map(s => s.id) : selectedStudentIds;

    if (scope !== 'All' && studentIds.length === 0) {
      setError('Please select at least one student.');
      return;
    }
    if (!scheduledAt) {
      setError('Please select a date and time.');
      return;
    }

    const resolvedSemesterId = resolveSemesterId(studentIds);
    if (!resolvedSemesterId) {
      setError('Could not determine the semester for the selected student(s). Please contact the administrator.');
      return;
    }

    setLoading(true);
    try {
      await createMeeting({
        supervisor_id: supervisorId,
        semester_id: resolvedSemesterId,
        scope,
        scheduled_at: new Date(scheduledAt).toISOString(),
        student_ids: studentIds,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create meeting.');
    } finally {
      setLoading(false);
    }
  }

  const noSemester = !semesterId && sectionSemesterMap.size === 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {noSemester && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger-dark">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          No semester is linked to your current session. Meetings cannot be created until the administrator configures a semester.
        </div>
      )}

      {/* Scope */}
      <div>
        <label className="form-label" htmlFor="meeting-scope">Scope</label>
        <select id="meeting-scope" className="form-input" value={scope}
          onChange={e => { setScope(e.target.value as MeetingScope); setSelectedStudentIds([]); }}>
          <option value="Individual">Individual</option>
          <option value="Group">Group</option>
          <option value="All">All</option>
        </select>
      </div>

      {/* Student selector (hidden for All) */}
      {scope !== 'All' && (
        <div>
          <label className="form-label">
            {scope === 'Individual' ? 'Student' : 'Students'}
          </label>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-surface-border divide-y divide-surface-border">
            {students.length === 0 ? (
              <p className="px-3 py-2 text-sm text-ink-muted italic">No students assigned</p>
            ) : (
              students.map(s => (
                <label key={s.id}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface transition-colors">
                  <input type="checkbox"
                    checked={selectedStudentIds.includes(s.id)}
                    onChange={() => toggleStudent(s.id)}
                    className="w-4 h-4 accent-primary" />
                  <span className="text-sm text-ink">
                    {s.student_name}{' '}
                    <span className="text-ink-muted text-xs">({s.reg_number})</span>
                  </span>
                </label>
              ))
            )}
          </div>
          <p className="text-xs text-ink-muted mt-1">{selectedStudentIds.length} selected</p>
        </div>
      )}

      {/* Date-time picker */}
      <div>
        <label className="form-label" htmlFor="meeting-datetime">Scheduled At</label>
        <input id="meeting-datetime" type="datetime-local" className="form-input"
          value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
      </div>

      {error && <p className="form-error text-sm">{error}</p>}

      <Button type="submit" loading={loading} disabled={noSemester}>
        Create Meeting
      </Button>
    </form>
  );
};

export default MeetingManager;
