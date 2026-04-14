import { AppShell } from './AppShell';

interface RoleAppShellProps {
  children: React.ReactNode;
}

export function RoleAppShell({ children }: RoleAppShellProps) {
  return <AppShell>{children}</AppShell>;
}
