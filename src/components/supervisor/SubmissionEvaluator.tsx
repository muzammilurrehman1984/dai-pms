import React, { useEffect, useState } from 'react';
import { Button } from '../ui';
import { evaluateSubmission, listSubmissionVersions, listDeadlines, formatDeadline } from '../../services/submissions.service';
import { ExternalLink, Eye, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import type { Submission, SubmissionDeadline, SubmissionType, SubmissionVersion } from '../../types';

const MAX_MARKS: Record<SubmissionType, number> = {
  'Project Approval': 20,
  'SRS': 30,
  'SDD': 30,
  'Final Documentation': 40,
  'Final Project Code': 40,
};

interface Props {
  submission: Submission;
  supervisorId: string;
  onSuccess: () => void;
}

type EvalStatus = 'Approved' | 'Rejected' | 'Revision' | '';

const SubmissionEvaluator: React.FC<Props> = ({ submission, supervisorId, onSuccess }) => {
  const maxMarks = MAX_MARKS[submission.submission_type];

  const [versions, setVersions]             = useState<SubmissionVersion[]>([]);
  const [latestVersion, setLatestVersion]   = useState<SubmissionVersion | null>(null);
  const [previewVersion, setPreviewVersion] = useState<SubmissionVersion | null>(null);
  const [deadline, setDeadline]             = useState<SubmissionDeadline | null>(null);
  const [status, setStatus] = useState<EvalStatus>(
    (submission.status === 'Pending' ? '' : submission.status) as EvalStatus
  );
  const [marks, setMarks]   = useState<number>(submission.marks ?? 0);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');

  useEffect(() => {
    listSubmissionVersions(submission.id)
      .then(v => { setVersions(v); setLatestVersion(v[0] ?? null); })
      .catch(() => { setVersions([]); setLatestVersion(null); });

    listDeadlines(submission.semester_id)
      .then(dls => {
        const dl = dls.find(d => d.submission_type === submission.submission_type) ?? null;
        setDeadline(dl);
      })
      .catch(() => setDeadline(null));
  }, [submission.id, submission.semester_id, submission.submission_type]);

  // Reset marks only when evaluator explicitly changes the decision (not on mount)
  const isFirstRender = React.useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (status === 'Approved') setMarks(0);
    else if (status === 'Rejected') setMarks(0);
  }, [status]);

  const deadlinePassed  = !!deadline?.deadline && new Date(deadline.deadline) < new Date();
  const revisionBlocked = status === 'Revision' && deadlinePassed;
  const marksInvalid    = status === 'Approved' && (marks < 0 || marks > maxMarks);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (marksInvalid) return;
    setLoading(true);
    setError('');
    try {
      await evaluateSubmission(
        submission.id,
        status as 'Approved' | 'Rejected' | 'Revision',
        supervisorId,
        status === 'Approved' ? marks : undefined
      );
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate submission.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {/* Document URL */}
      <div>
        <p className="form-label">Document URL</p>
        {latestVersion?.document_url ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-surface border border-surface-border">
            <a href={latestVersion.document_url} target="_blank" rel="noopener noreferrer"
              className="text-primary text-sm hover:underline truncate flex-1 min-w-0">
              {latestVersion.document_url}
            </a>
            <a href={latestVersion.document_url} target="_blank" rel="noopener noreferrer"
              className="btn btn-ghost p-1.5 flex-shrink-0" title="Open in new tab">
              <ExternalLink size={14} />
            </a>
          </div>
        ) : (
          <p className="text-sm text-ink-muted italic">No document submitted</p>
        )}
      </div>

      {/* Description */}
      {(latestVersion?.description || submission.description) && (
        <div>
          <p className="form-label">Description</p>
          <div className="p-3 rounded-xl bg-surface border border-surface-border text-sm text-ink whitespace-pre-wrap">
            {latestVersion?.description ?? submission.description}
          </div>
        </div>
      )}

      {/* Submitted at */}
      {latestVersion?.submitted_at && (
        <div>
          <p className="form-label">Submitted At</p>
          <p className="text-sm text-ink-muted">{formatDeadline(latestVersion.submitted_at)}</p>
        </div>
      )}

      {/* Decision */}
      <div>
        <label className="form-label" htmlFor="eval-status">Decision</label>
        <select id="eval-status" className="form-input" value={status}
          onChange={e => setStatus(e.target.value as EvalStatus)}>
          <option value="" disabled>— Select decision —</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Revision">Revision</option>
        </select>
      </div>

      {/* Marks — only shown when Approved */}
      {status === 'Approved' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="form-label mb-0" htmlFor="eval-marks">Marks Awarded</label>
            <span className="text-xs text-ink-muted">
              Maximum for <span className="font-medium text-ink">{submission.submission_type}</span>: {maxMarks}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              id="eval-marks"
              type="number"
              min={0}
              max={maxMarks}
              value={marks}
              onChange={e => {
                const v = parseInt(e.target.value, 10);
                setMarks(isNaN(v) ? 0 : Math.min(maxMarks, Math.max(0, v)));
              }}
              className={`form-input w-28 text-center text-lg font-semibold ${marksInvalid ? 'border-danger' : ''}`}
            />
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={maxMarks}
                value={marks}
                onChange={e => setMarks(parseInt(e.target.value, 10))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-ink-faint mt-0.5">
                <span>0</span>
                <span>{maxMarks}</span>
              </div>
            </div>
          </div>
          {marksInvalid && (
            <p className="form-error mt-1">Marks must be between 0 and {maxMarks}.</p>
          )}
        </div>
      )}

      {/* Marks info for Rejected / Revision */}
      {status === 'Rejected' && (
        <div className="p-3 rounded-xl bg-surface border border-surface-border text-sm text-ink-muted">
          Marks will be set to <span className="font-semibold text-danger">0</span>.
        </div>
      )}
      {status === 'Revision' && !revisionBlocked && (
        <div className="p-3 rounded-xl bg-surface border border-surface-border text-sm text-ink-muted">
          Marks remain unchanged until the student resubmits.
        </div>
      )}

      {error && <p className="form-error text-sm">{error}</p>}

      {/* Revision warning when deadline has passed */}
      {revisionBlocked && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-accent/10 border border-accent/20 text-sm text-accent-dark">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold">Revision cannot be applied.</span> The submission deadline
            ({formatDeadline(deadline!.deadline)}) has already passed — the student would have no way
            to resubmit. Consider <span className="font-medium">Approved</span> or <span className="font-medium">Rejected</span> instead.
          </span>
        </div>
      )}

      <Button
        type="submit"
        loading={loading}
        disabled={!latestVersion?.document_url || !status || revisionBlocked || marksInvalid}
      >
        Submit Evaluation
      </Button>

      {/* Version History */}
      {versions.length > 0 && (
        <div className="border-t border-surface-border pt-4 mt-1">
          <p className="text-xs font-medium text-ink-muted mb-2">Version History</p>
          <ul className="flex flex-col gap-1">
            {versions.map((v, i) => (
              <li key={v.id} className="flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 hover:bg-surface transition-colors">
                <span className="w-5 text-right text-ink-faint flex-shrink-0">{versions.length - i}.</span>
                <span className="text-ink-faint flex-shrink-0 whitespace-nowrap">{formatDeadline(v.submitted_at)}</span>
                <a href={v.document_url} target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline truncate flex-1 min-w-0">{v.document_url}</a>
                <button type="button"
                  className="btn btn-ghost p-1 flex-shrink-0 text-ink-muted hover:text-primary"
                  onClick={() => setPreviewVersion(v)} title="Preview">
                  <Eye size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Version Preview Modal */}
      <Modal open={!!previewVersion} onClose={() => setPreviewVersion(null)} title="Submission Preview" size="md">
        {previewVersion && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="form-label">Document URL</p>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-surface border border-surface-border">
                <a href={previewVersion.document_url} target="_blank" rel="noopener noreferrer"
                  className="text-primary text-sm hover:underline truncate flex-1 min-w-0">
                  {previewVersion.document_url}
                </a>
                <a href={previewVersion.document_url} target="_blank" rel="noopener noreferrer"
                  className="btn btn-ghost p-1.5 flex-shrink-0" title="Open in new tab">
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
            {previewVersion.description && (
              <div>
                <p className="form-label">Description</p>
                <div className="p-3 rounded-xl bg-surface border border-surface-border text-sm text-ink whitespace-pre-wrap">
                  {previewVersion.description}
                </div>
              </div>
            )}
            <div>
              <p className="form-label">Submitted At</p>
              <p className="text-sm text-ink">{formatDeadline(previewVersion.submitted_at)}</p>
            </div>
          </div>
        )}
      </Modal>
    </form>
  );
};

export default SubmissionEvaluator;
