import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { login } from '../../services/auth.service';
import { supabase } from '../../services/supabase';
import type { Role } from '../../types';

function getRoleRedirect(role: Role): string {
  switch (role) {
    case 'Department_Admin': return '/admin';
    case 'Supervisor': return '/supervisor';
    case 'Student': return '/student';
  }
}

export function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('Session not found after login.');
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, password_changed')
        .eq('id', userId)
        .single();
      if (!profile) throw new Error('Profile not found.');
      if (profile.password_changed === false) {
        navigate('/first-login', { replace: true });
      } else {
        navigate(getRoleRedirect(profile.role as Role), { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div>
        <label className="form-label text-white/80">Email Address</label>
        <input
          className="form-input bg-white/10 border-white/20 text-white placeholder-white/30 focus:border-white/60"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoFocus
          disabled={submitting}
        />
      </div>

      <div>
        <label className="form-label text-white/80">Password</label>
        <div className="relative">
          <input
            className="form-input bg-white/10 border-white/20 text-white placeholder-white/30 focus:border-white/60 pr-10"
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your password"
            required
            disabled={submitting}
          />
          <button type="button" onClick={() => setShowPass(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
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
        {submitting ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  );
}
