import { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { changePassword } from '../../services/auth.service';

interface Props {
  open: boolean;
  onClose: () => void;
  /** true = first-login forced change, cannot be dismissed */
  required?: boolean;
  onSuccess?: () => void;
}

const RULES = [
  { test: (v: string) => v.length >= 8,   label: 'At least 8 characters' },
  { test: (v: string) => /[A-Z]/.test(v), label: 'One uppercase letter'  },
  { test: (v: string) => /[0-9]/.test(v), label: 'One number'            },
];

export function PasswordChangeModal({ open, onClose, required = false, onSuccess }: Props) {
  const [form, setForm]     = useState({ newPass: '', confirm: '' });
  const [show, setShow]     = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  function validate() {
    for (const rule of RULES) {
      if (!rule.test(form.newPass)) return rule.label + ' required.';
    }
    if (form.newPass !== form.confirm) return 'Passwords do not match.';
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    setError('');
    try {
      if (required) {
        await changePassword(form.newPass);
      } else {
        const { error: authErr } = await supabase.auth.updateUser({ password: form.newPass });
        if (authErr) throw authErr;
      }
      setForm({ newPass: '', confirm: '' });
      onSuccess?.();
      if (!required) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="modal-inner bg-white rounded-xl2 shadow-lift w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h2 className="font-display text-lg text-ink">
            {required ? 'Set Your New Password' : 'Change Password'}
          </h2>
          {!required && (
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg hover:bg-surface flex items-center justify-center text-ink-muted hover:text-ink transition-colors"
              aria-label="Close">
              ✕
            </button>
          )}
        </div>

        <div className="px-6 py-5">
          {required && (
            <div className="mb-4 p-3 rounded-xl bg-accent/10 border border-accent/20 text-sm text-accent-dark flex items-start gap-2">
              <ShieldCheck size={16} className="flex-shrink-0 mt-0.5" />
              You must set a new password before accessing the system.
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div>
              <label className="form-label">New Password <span className="text-danger">*</span></label>
              <div className="relative">
                <input
                  className="form-input pr-10"
                  type={show ? 'text' : 'password'}
                  value={form.newPass}
                  onChange={e => setForm(f => ({ ...f, newPass: e.target.value }))}
                  placeholder="Enter new password"
                  autoFocus
                  required
                />
                <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.newPass && (
                <ul className="mt-2 space-y-1">
                  {RULES.map(r => (
                    <li key={r.label}
                      className={`text-xs flex items-center gap-1.5 ${r.test(form.newPass) ? 'text-success' : 'text-ink-faint'}`}>
                      <span>{r.test(form.newPass) ? '✓' : '○'}</span> {r.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="form-label">Confirm Password <span className="text-danger">*</span></label>
              <input
                className="form-input"
                type={show ? 'text' : 'password'}
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Repeat new password"
                required
              />
            </div>

            {error && <p className="form-error text-sm">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              {!required && (
                <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              )}
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                  : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
