// Thin wrapper so all existing call sites (Sidebar, ProtectedRoute, etc.)
// continue to work unchanged — they all share the single AuthContext instance.
import { useAuthContext } from '../contexts/AuthContext';
import type { Role } from '../types';

interface AuthState {
  user: import('@supabase/supabase-js').User | null;
  role: Role | null;
  passwordChanged: boolean | null;
  loading: boolean;
  refetchProfile: () => Promise<void>;
}

export function useAuth(): AuthState {
  const { user, profile, loading, refetchProfile } = useAuthContext();
  return {
    user,
    role: profile?.role ?? null,
    passwordChanged: profile?.password_changed ?? null,
    loading,
    refetchProfile,
  };
}
