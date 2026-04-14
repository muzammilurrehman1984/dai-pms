import React, { useCallback, useEffect, useState } from 'react';
import { Spinner } from '../ui';
import { listDeadlines, updateDeadline, utcToLocalInput, localInputToUtc, formatDeadline } from '../../services/submissions.service';
import { Lock, Unlock } from 'lucide-react';
import type { SubmissionDeadline, SubmissionType } from '../../types';

interface DeadlineManagerProps {
  semesterId: string;
  semesterNumber: 7 | 8;
}

const FYP1_TYPES: SubmissionType[] = ['Project Approval', 'SRS', 'SDD'];
const FYP2_TYPES: SubmissionType[] = ['Final Documentation', 'Final Project Code'];

const DeadlineManager: React.FC<DeadlineManagerProps> = ({ semesterId, semesterNumber }) => {
  const [deadlines, setDeadlines] = useState<SubmissionDeadline[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [updating, setUpdating]   = useState<string | null>(null);

  const submissionTypes = semesterNumber === 7 ? FYP1_TYPES : FYP2_TYPES;
  const label = semesterNumber === 7 ? 'FYP-I — Semester 7' : 'FYP-II — Semester 8';

  const fetchDeadlines = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDeadlines(await listDeadlines(semesterId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deadlines.');
    } finally {
      setLoading(false);
    }
  }, [semesterId]);

  useEffect(() => { fetchDeadlines(); }, [fetchDeadlines]);

  const getDeadline = (type: SubmissionType) => deadlines.find(d => d.submission_type === type);

  const patch = (type: SubmissionType, updated: SubmissionDeadline) => {
    setDeadlines(prev => {
      const idx = prev.findIndex(d => d.submission_type === type);
      if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
      return [...prev, updated];
    });
  };

  const handleToggleLock = async (type: SubmissionType) => {
    const existing = getDeadline(type);
    setUpdating(type);
    try {
      const updated = await updateDeadline(semesterId, type, {
        is_locked: !(existing?.is_locked ?? false),
        deadline: existing?.deadline ?? null,
      });
      patch(type, updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update.');
    } finally {
      setUpdating(null);
    }
  };

  const handleDeadlineChange = async (type: SubmissionType, localValue: string) => {
    const existing = getDeadline(type);
    setUpdating(type + '_date');
    try {
      // Convert local datetime-local string → UTC ISO before saving
      const utcValue = localInputToUtc(localValue);
      const updated = await updateDeadline(semesterId, type, {
        is_locked: existing?.is_locked ?? false,
        deadline: utcValue,
      });
      patch(type, updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update deadline.');
    } finally {
      setUpdating(null);
    }
  };


  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-border">
        <h2 className="font-display text-lg text-ink">{label}</h2>
        <p className="text-xs text-ink-muted mt-0.5">
          Deadlines are entered and shown in your local timezone (UTC{Intl.DateTimeFormat().resolvedOptions().timeZone}).
        </p>
      </div>

      {error && <p className="px-5 py-3 text-sm text-danger">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="table-wrap">
          <table className="table-base">
            <thead><tr>
              <th>Submission Type</th>
              <th>Status</th>
              <th>Deadline</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>
              {submissionTypes.map(type => {
                const dl = getDeadline(type);
                const isLocked = dl?.is_locked ?? false;
                // Convert stored UTC → local datetime-local string for the input
                const inputValue = utcToLocalInput(dl?.deadline);
                const isUpdatingLock = updating === type;
                const isUpdatingDate = updating === type + '_date';

                return (
                  <tr key={type}>
                    <td className="font-medium text-ink">{type}</td>
                    <td>
                      <span className={`badge ${isLocked ? 'badge-danger' : 'badge-success'}`}>
                        {isLocked ? 'Locked' : 'Open'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={inputValue}
                          onChange={e => handleDeadlineChange(type, e.target.value)}
                          disabled={isUpdatingDate || isUpdatingLock}
                          className="form-input w-auto"
                        />
                        {isUpdatingDate
                          ? <span className="text-xs text-ink-muted">Saving…</span>
                          : dl?.deadline
                            ? <span className="text-sm text-ink-muted">{formatDeadline(dl.deadline)}</span>
                            : null}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleLock(type)}
                        disabled={isUpdatingLock || isUpdatingDate}
                        className={`btn ${isLocked ? 'btn-success' : 'btn-danger'}`}
                      >
                        {isUpdatingLock
                          ? 'Updating…'
                          : isLocked
                            ? <><Unlock size={14} /> Unlock</>
                            : <><Lock size={14} /> Lock</>}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DeadlineManager;
