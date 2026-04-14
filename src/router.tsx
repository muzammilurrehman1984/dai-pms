import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleAppShell } from './components/layout/RoleAppShell';
import { LoginPage } from './pages/LoginPage';
import { FirstLoginPage } from './pages/FirstLoginPage';

// ── Lazy page imports ─────────────────────────────────────────────────────────
const AdminDashboardPage      = lazy(() => import('./pages/admin/DashboardPage'));
const SessionsPage            = lazy(() => import('./pages/admin/SessionsPage'));
const SectionsPage            = lazy(() => import('./pages/admin/SectionsPage'));
const StudentsPage            = lazy(() => import('./pages/admin/StudentsPage'));
const SupervisorsPage         = lazy(() => import('./pages/admin/SupervisorsPage'));
const AllocationsPage         = lazy(() => import('./pages/admin/AllocationsPage'));
const DeadlinesPage           = lazy(() => import('./pages/admin/DeadlinesPage'));
const ReportsPage             = lazy(() => import('./pages/admin/ReportsPage'));
const SeedImportPage          = lazy(() => import('./pages/admin/SeedImportPage'));
const SupervisorDashboardPage = lazy(() => import('./pages/supervisor/DashboardPage'));
const SupervisorSubmissionsPage = lazy(() => import('./pages/supervisor/SubmissionsPage'));
const MeetingsPage            = lazy(() => import('./pages/supervisor/MeetingsPage'));
const SupervisorChatPage      = lazy(() => import('./pages/supervisor/ChatPage'));
const StudentDashboardPage    = lazy(() => import('./pages/student/DashboardPage'));
const StudentSubmissionsPage  = lazy(() => import('./pages/student/SubmissionsPage'));
const StudentMeetingsPage     = lazy(() => import('./pages/student/MeetingsPage'));
const StudentChatPage         = lazy(() => import('./pages/student/ChatPage'));

// ── Loading fallback ──────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ── Role shells ───────────────────────────────────────────────────────────────
function AdminShell() {
  return (
    <ProtectedRoute allowedRole="Department_Admin">
      <RoleAppShell><Outlet /></RoleAppShell>
    </ProtectedRoute>
  );
}

function SupervisorShell() {
  return (
    <ProtectedRoute allowedRole="Supervisor">
      <RoleAppShell><Outlet /></RoleAppShell>
    </ProtectedRoute>
  );
}

function StudentShell() {
  return (
    <ProtectedRoute allowedRole="Student">
      <RoleAppShell><Outlet /></RoleAppShell>
    </ProtectedRoute>
  );
}

const router = createBrowserRouter([
  { path: '/login',       element: <LoginPage /> },
  { path: '/first-login', element: <FirstLoginPage /> },

  {
    path: '/admin',
    element: <AdminShell />,
    children: [
      { index: true,           element: <Lazy><AdminDashboardPage /></Lazy> },
      { path: 'sessions',      element: <Lazy><SessionsPage /></Lazy> },
      { path: 'sections',      element: <Lazy><SectionsPage /></Lazy> },
      { path: 'students',      element: <Lazy><StudentsPage /></Lazy> },
      { path: 'supervisors',   element: <Lazy><SupervisorsPage /></Lazy> },
      { path: 'allocations',   element: <Lazy><AllocationsPage /></Lazy> },
      { path: 'deadlines',     element: <Lazy><DeadlinesPage /></Lazy> },
      { path: 'reports',       element: <Lazy><ReportsPage /></Lazy> },
      { path: 'seed',          element: <Lazy><SeedImportPage /></Lazy> },
    ],
  },
  {
    path: '/supervisor',
    element: <SupervisorShell />,
    children: [
      { index: true,           element: <Lazy><SupervisorDashboardPage /></Lazy> },
      { path: 'submissions',   element: <Lazy><SupervisorSubmissionsPage /></Lazy> },
      { path: 'meetings',      element: <Lazy><MeetingsPage /></Lazy> },
      { path: 'chat',          element: <Lazy><SupervisorChatPage /></Lazy> },
    ],
  },
  {
    path: '/student',
    element: <StudentShell />,
    children: [
      { index: true,           element: <Lazy><StudentDashboardPage /></Lazy> },
      { path: 'submissions',   element: <Lazy><StudentSubmissionsPage /></Lazy> },
      { path: 'meetings',      element: <Lazy><StudentMeetingsPage /></Lazy> },
      { path: 'chat',          element: <Lazy><StudentChatPage /></Lazy> },
    ],
  },

  { path: '*', element: <Navigate to="/login" replace /> },
]);

export default router;
