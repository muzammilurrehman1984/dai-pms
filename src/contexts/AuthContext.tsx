import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import type { Role } from '../types';

interface Profile {
  role: Role;
  password_changed: boolean;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initialised           = useRef(false);

  const loadProfile = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('role, password_changed')
      .eq('id', authUser.id)
      .single();

    setUser(authUser);
    setProfile(data ? { role: data.role as Role, password_changed: data.password_changed } : null);
    setLoading(false);
  }, []);

  const refetchProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await loadProfile(session.user);
  }, [loadProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      initialised.current = true;
      loadProfile(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!initialised.current) return;

      // USER_UPDATED fires after updateUser() (password change).
      // Skip it — we handle profile state manually after changePassword().
      if (event === 'USER_UPDATED') return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      loadProfile(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}
