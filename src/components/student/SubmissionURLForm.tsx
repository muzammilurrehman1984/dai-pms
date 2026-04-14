import React, { useState } from 'react';
import { Button, Input } from '../ui';
import { submitDocumentURL, formatDeadline } from '../../services/submissions.service';
import type { Submission, SubmissionDeadline, SubmissionType } from '../../types';

interface SubmissionURLFormProps {
  studentId: string;
  semesterId: string;
  submissionType: SubmissionType;
  deadline: SubmissionDeadline | undefined;
  currentSubmission: Submission | undefined;
  onSuccess: () => void;
}

function isInputEnabled(
  deadline: SubmissionDeadline | undefined,
  currentSubmission: Submission | undefined
): boolean {
  if (!deadline) return false;
  if (deadline.is_locked) return false;
  if (deadline.deadline && new Date(deadline.deadline) < new Date()) return false;
  if (currentSubmission && currentSubmission.status !== 'Revision') return false;
  return true;
}

const MAX_DESC = 1000;

const SubmissionURLForm: React.FC<SubmissionURLFormProps> = ({
  studentId, semesterId, submissionType, deadline, currentSubmission, onSuccess,
}) => {
  const [url, setUrl]               = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const enabled = isInputEnabled(deadline, currentSubmission);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!enabled || !url.trim()) return;
    if (description.length > MAX_DESC) return;
    setSubmitting(true);
    setError('');
    try {
      await submitDocumentURL(studentId, semesterId, submissionType, url.trim(), description.trim() || undefined);
      setUrl('');
      setDescription('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  let disabledReason = '';
  if (!deadline) {
    disabledReason = 'No deadline configured for this submission type.';
  } else if (deadline.is_locked) {
    disabledReason = 'Submissions are currently locked by the administrator.';
  } else if (deadline.deadline && new Date(deadline.deadline) < new Date()) {
    disabledReason = `The submission deadline has passed (${formatDeadline(deadline.deadline)}).`;
  } else if (currentSubmission && currentSubmission.status === 'Pending') {
    disabledReason = 'Your submission is under review.';
  } else if (currentSubmission && currentSubmission.status === 'Approved') {
    disabledReason = 'This submission has been approved.';
  }

  // Pre-fill from existing submission when in Revision state
  const existingDesc = currentSubmission?.description ?? '';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        id={`url-${submissionType.replace(/\s+/g, '-').toLowerCase()}`}
        label="Document URL"
        type="url"
        placeholder="https://drive.google.com/…"
        value={url}
        onChange={e => setUrl(e.target.value)}
        disabled={!enabled || submitting}
      />

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="form-label mb-0">Description</label>
          <span className={`text-xs ${description.length > MAX_DESC ? 'text-danger' : 'text-ink-muted'}`}>
            {description.length} / {MAX_DESC}
          </span>
        </div>
        <textarea
          className={`form-input resize-y min-h-[80px] ${description.length > MAX_DESC ? 'border-danger focus:border-danger' : ''}`}
          placeholder="Briefly describe your submission (optional)…"
          value={description}
          onChange={e => setDescription(e.target.value)}
          disabled={!enabled || submitting}
          maxLength={MAX_DESC + 1} // allow typing past limit so counter shows red
          rows={3}
        />
        {existingDesc && !description && (
          <p className="text-xs text-ink-muted">
            Previous: <span className="italic">{existingDesc}</span>
          </p>
        )}
        {description.length > MAX_DESC && (
          <p className="form-error">Description must be {MAX_DESC} characters or fewer.</p>
        )}
      </div>

      {error && <p className="form-error text-sm">{error}</p>}

      {!enabled && disabledReason ? (
        <p className="text-xs text-ink-muted">{disabledReason}</p>
      ) : (
        <div className="flex justify-end">
          <Button
            type="submit"
            loading={submitting}
            disabled={!enabled || !url.trim() || description.length > MAX_DESC}
          >
            Submit
          </Button>
        </div>
      )}
    </form>
  );
};

export default SubmissionURLForm;
