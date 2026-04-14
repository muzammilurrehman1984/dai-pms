import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Eye, EyeOff, KeyRound } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (newPassword: string) => Promise<void>;
  targetName: string;
}

const RULES = [
  { test: (v: string) => v.length >= 8,   label: 'At least 8 characters' },
  { test: (v: string) => /[A-Z]/.test(v), label: 'One uppercase letter'  },
  { test: (v: string) => /[0-9]/.test(v), label: 'One number'            },
];

export function ResetPasswordModal({ open, onClose, onConfirm, targetName }: Props) {
  const [newPass, setNewPass]     = useState('');
  const [confirm, setConfirm]     = useState('');
  const [show, setShow]           = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);

  function reset() {
    setNewPass(''); setConfirm(''); setShow(false);
    setLoading(false); setError(''); setSuccess(false);
  }

  function handleClose() { reset(); onClose(); }

  function validate() {
    for (const rule of RULES) {
      if (!rule.test(newPass)) return rule.label + ' required.';
    }
    if (newPass !== confirm) return 'Passwords do not match.';
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    try {
      await onConfirm(newPass);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Reset Password" size="sm">
      <div className="flex flex-col gap-4">
        {/* Target */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-surface border border-surface-border text-sm">
          <KeyRound size={14} className="text-ink-muted flex-shrink-0" />
          <span className="text-ink-muted">Resetting password for</span>
          <span className="font-semibold text-ink truncate">{targetName}</span>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
              <KeyRound size={22} className="text-success" />
            </div>
            <p className="text-sm font-medium text-ink">Password reset successfully.</p>
            <p className="text-xs text-ink-muted text-center">
              The user will be prompted to change their password on next login.
            </p>
            <button type="button" className="btn btn-primary mt-1" onClick={handleClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div>
              <label className="form-label">New Password <span className="text-danger">*</span></label>
              <div className="relative">
                <input
                  className="form-input pr-10"
                  type={show ? 'text' : 'password'}
                  value={newPass}
                  onChange={e => { setNewPass(e.target.value); setError(''); }}
                  placeholder="Enter new password"
                  autoFocus
                  disabled={loading}
                />
                <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Live constraint checklist */}
              {newPass && (
                <ul className="mt-2 space-y-1">
                  {RULES.map(r => (
                    <li key={r.label}
                      className={`text-xs flex items-center gap-1.5 ${r.test(newPass) ? 'text-success' : 'text-ink-faint'}`}>
                      <span>{r.test(newPass) ? '✓' : '○'}</span> {r.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="form-label">Confirm Password <span className="text-danger">*</span></label>
              <input
                className={`form-input ${confirm && confirm !== newPass ? 'border-danger' : ''}`}
                type={show ? 'text' : 'password'}
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(''); }}
                placeholder="Repeat new password"
                disabled={loading}
              />
              {confirm && confirm !== newPass && (
                <p className="form-error mt-1">Passwords do not match.</p>
              )}
            </div>

            {error && <p className="form-error text-sm">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn btn-outline" onClick={handleClose} disabled={loading}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading || !newPass || !confirm}>
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Resetting…</>
                  : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
