import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { changePassword } from '../../services/auth.service';
import { supabase } from '../../services/supabase';
import type { Role } from '../../types';

function getRoleRedirect(role: Role): string {
  switch (role) {
    case 'Department_Admin': return '/admin';
    case 'Supervisor': return '/supervisor';
    case 'Student': return '/student';
  }
}

export function FirstLoginForm() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setSubmitting(true);
    try {
      await changePassword(newPassword);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('Session not found.');
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
      if (!profile) throw new Error('Profile not found.');
      navigate(getRoleRedirect(profile.role as Role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div>
        <label className="form-label text-white/80">New Password</label>
        <div className="relative">
          <input
            className="form-input bg-white/10 border-white/20 text-white placeholder-white/30 focus:border-white/60 pr-10"
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Min. 6 characters"
            required
            autoFocus
            disabled={submitting}
          />
          <button type="button" onClick={() => setShowNew(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div>
        <label className="form-label text-white/80">Confirm Password</label>
        <div className="relative">
          <input
            className="form-input bg-white/10 border-white/20 text-white placeholder-white/30 focus:border-white/60 pr-10"
            type={showConfirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Repeat your password"
            required
            disabled={submitting}
          />
          <button type="button" onClick={() => setShowConfirm(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-danger/20 border border-danger/30 text-sm text-white">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn bg-white text-primary font-semibold hover:bg-white/90 w-full justify-center mt-2">
        {submitting ? 'Saving…' : 'Set Password & Continue'}
      </button>
    </form>
  );
}
