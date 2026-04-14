import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { logout } from '../../services/auth.service';
import {
  LayoutDashboard, Users, GraduationCap, School, BookOpen,
  ClipboardList, BarChart2, MessageSquare, Settings,
  LogOut, Menu, X, ChevronRight, FileText, Calendar, KeyRound,
} from 'lucide-react';
import type { Role } from '../../types';
import { PasswordChangeModal } from '../shared/PasswordChangeModal';

const NAV: Record<Role, { to: string; label: string; icon: React.ElementType; end?: boolean }[]> = {
  Department_Admin: [
    { to: '/admin',             label: 'Dashboard',   icon: LayoutDashboard, end: true },
    { to: '/admin/sessions',    label: 'Sessions',    icon: Calendar },
    { to: '/admin/sections',    label: 'Sections',    icon: School },
    { to: '/admin/students',    label: 'Students',    icon: GraduationCap },
    { to: '/admin/supervisors', label: 'Supervisors', icon: Users },
    { to: '/admin/allocations', label: 'Allocations', icon: BookOpen },
    { to: '/admin/deadlines',   label: 'Deadlines',   icon: ClipboardList },
    { to: '/admin/reports',     label: 'Reports',     icon: BarChart2 },
    { to: '/admin/seed',        label: 'Seed Import', icon: Settings },
  ],
  Supervisor: [
    { to: '/supervisor',             label: 'Dashboard',   icon: LayoutDashboard, end: true },
    { to: '/supervisor/submissions', label: 'Submissions', icon: FileText },
    { to: '/supervisor/meetings',    label: 'Meetings',    icon: Calendar },
    { to: '/supervisor/chat',        label: 'Chat',        icon: MessageSquare },
  ],
  Student: [
    { to: '/student',             label: 'Dashboard',   icon: LayoutDashboard, end: true },
    { to: '/student/submissions', label: 'Submissions', icon: FileText },
    { to: '/student/meetings',    label: 'Meetings',    icon: Calendar },
    { to: '/student/chat',        label: 'Chat',        icon: MessageSquare },
  ],
};

const ROLE_GRADIENT: Record<Role, string> = {
  Department_Admin: 'from-[#1e3a8a] to-[#4c1d95]',
  Supervisor:       'from-[#4c1d95] to-[#1e3a8a]',
  Student:          'from-[#065f46] to-[#1e3a8a]',
};

const ROLE_LABEL: Record<Role, string> = {
  Department_Admin: 'Admin',
  Supervisor: 'Supervisor',
  Student: 'Student',
};

function NavItem({ to, label, icon: Icon, end, onClick }: {
  to: string; label: string; icon: React.ElementType; end?: boolean; onClick?: () => void;
}) {
  return (
    <NavLink to={to} end={end} onClick={onClick}
      className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
      <Icon size={16} className="flex-shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      <ChevronRight size={11} className="opacity-30 flex-shrink-0" />
    </NavLink>
  );
}

export function Sidebar() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const links = role ? NAV[role] : [];
  const gradient = role ? ROLE_GRADIENT[role] : ROLE_GRADIENT.Student;
  const initial = (user?.email?.[0] ?? '?').toUpperCase();
  const roleLabel = role ? ROLE_LABEL[role] : '';
  const [changePwOpen, setChangePwOpen] = useState(false);

  async function handleLogout() { await logout(); navigate('/login'); }

  return (
    <aside className={`hidden lg:flex h-screen w-60 flex-shrink-0 flex-col bg-gradient-to-b ${gradient} text-white`}>
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5 mb-0.5">
          <img src="/dai-logo.png" alt="DAI" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
          <span className="font-display text-lg font-bold text-white tracking-tight">DAI-PMS</span>
        </div>
        <p className="text-[11px] text-white/40 pl-10 leading-tight">Dept. of AI — Project Management System</p>
      </div>

      {/* User */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-semibold text-sm flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.email}</p>
            <span className="text-xs text-white/50">{roleLabel}</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto scrollbar-none">
        {links.map(l => <NavItem key={l.to} {...l} />)}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-5 flex flex-col gap-0.5">
        <button onClick={() => setChangePwOpen(true)}
          className="w-full sidebar-link text-white/60 hover:text-white">
          <KeyRound size={16} />
          <span>Change Password</span>
        </button>
        <button onClick={handleLogout}
          className="w-full sidebar-link text-white/60 hover:text-white hover:bg-red-500/20">
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>

      <PasswordChangeModal open={changePwOpen} onClose={() => setChangePwOpen(false)} />
    </aside>
  );
}

export function MobileNav() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const links = role ? NAV[role] : [];
  const gradient = role ? ROLE_GRADIENT[role] : ROLE_GRADIENT.Student;
  const initial = (user?.email?.[0] ?? '?').toUpperCase();
  const roleLabel = role ? ROLE_LABEL[role] : '';

  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  async function handleLogout() { setOpen(false); await logout(); navigate('/login'); }

  return (
    <>
      <header className={`lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-gradient-to-r ${gradient} text-white shadow-sm`}>
        <div className="flex items-center gap-2.5">
          <img src="/dai-logo.png" alt="DAI" className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
          <span className="font-display text-base font-bold text-white tracking-tight">DAI-PMS</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/70 hidden sm:block">{user?.email}</span>
          <button onClick={() => setOpen(true)}
            className="w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            aria-label="Open menu">
            <Menu size={20} />
          </button>
        </div>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)} />
      )}

      <div className={`lg:hidden fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] flex flex-col bg-gradient-to-b ${gradient} text-white shadow-lift transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <img src="/dai-logo.png" alt="DAI" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
            <span className="font-display text-lg font-bold text-white">DAI-PMS</span>
          </div>
          <button onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-semibold">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.email}</p>
              <span className="text-xs text-white/50">{roleLabel}</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto scrollbar-none">
          {links.map(l => <NavItem key={l.to} {...l} onClick={() => setOpen(false)} />)}
        </nav>

        <div className="px-3 pb-6 flex flex-col gap-0.5">
          <button onClick={() => { setOpen(false); setChangePwOpen(true); }}
            className="w-full sidebar-link text-white/60 hover:text-white">
            <KeyRound size={16} />
            <span>Change Password</span>
          </button>
          <button onClick={handleLogout}
            className="w-full sidebar-link text-white/60 hover:text-white hover:bg-red-500/20">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <PasswordChangeModal open={changePwOpen} onClose={() => setChangePwOpen(false)} />
    </>
  );
}
