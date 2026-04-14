import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { Role } from '../../types';

interface ProtectedRouteProps {
  allowedRole: Role;
  children: React.ReactNode;
}

function LoadingScreen() {
  return (
    <div className="h-screen flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <img src="/dai-logo.png" alt="DAI" className="w-12 h-12 rounded-xl object-cover" />
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

export function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const { user, role, passwordChanged, loading } = useAuth();

  // Still resolving session / profile — never redirect during this window
  if (loading) return <LoadingScreen />;

  // No session at all
  if (!user) return <Navigate to="/login" replace />;

  // Profile loaded but password_changed is explicitly false → force change
  if (passwordChanged === false) return <Navigate to="/first-login" replace />;

  // Profile not yet available (null) but user exists — keep showing loader
  // This prevents a flash-redirect to /login on token refresh
  if (role === null) return <LoadingScreen />;

  // Wrong role
  if (role !== allowedRole) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
