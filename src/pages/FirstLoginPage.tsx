import { useNavigate } from 'react-router-dom';
import { PasswordChangeModal } from '../components/shared/PasswordChangeModal';
import { useAuthContext } from '../contexts/AuthContext';
import type { Role } from '../types';

function getRoleRedirect(role: Role): string {
  switch (role) {
    case 'Department_Admin': return '/admin';
    case 'Supervisor': return '/supervisor';
    case 'Student': return '/student';
  }
}

export function FirstLoginPage() {
  const navigate = useNavigate();
  const { refetchProfile } = useAuthContext();

  async function handleSuccess() {
    // Reload the profile from DB so password_changed is now true in context.
    // Without this, ProtectedRoute still sees the old value and bounces back.
    await refetchProfile();

    // After refetch the context has password_changed: true — navigate to role home.
    // We read the fresh profile via a second getSession call since refetchProfile
    // updates context state asynchronously.
    const { supabase } = await import('../services/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) { navigate('/login', { replace: true }); return; }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (!profile) { navigate('/login', { replace: true }); return; }
    navigate(getRoleRedirect(profile.role as Role), { replace: true });
  }

  return (
    <div className="h-screen bg-surface">
      <PasswordChangeModal open={true} required={true} onClose={() => {}} onSuccess={handleSuccess} />
    </div>
  );
}
