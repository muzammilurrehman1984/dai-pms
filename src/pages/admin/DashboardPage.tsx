import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { PageSpinner } from '../../components/ui/Spinner';
import {
  Calendar, School, GraduationCap, Users, BookOpen,
  ClipboardList, BarChart2, Settings,
} from 'lucide-react';

interface SummaryCount {
  sessions: number;
  students: number;
  supervisors: number;
  allocations: number;
}

const quickLinks = [
  { label: 'Sessions',    to: '/admin/sessions',    icon: Calendar },
  { label: 'Sections',    to: '/admin/sections',    icon: School },
  { label: 'Students',    to: '/admin/students',    icon: GraduationCap },
  { label: 'Supervisors', to: '/admin/supervisors', icon: Users },
  { label: 'Allocations', to: '/admin/allocations', icon: BookOpen },
  { label: 'Deadlines',   to: '/admin/deadlines',   icon: ClipboardList },
  { label: 'Reports',     to: '/admin/reports',     icon: BarChart2 },
  { label: 'Seed Import', to: '/admin/seed',        icon: Settings },
];

export default function DashboardPage() {
  const [counts, setCounts] = useState<SummaryCount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [sessionsRes, studentsRes, supervisorsRes, allocationsRes] = await Promise.all([
          supabase.from('sessions').select('id', { count: 'exact', head: true }),
          supabase.from('students').select('id', { count: 'exact', head: true }),
          supabase.from('supervisors').select('id', { count: 'exact', head: true }),
          supabase.from('allocations').select('id', { count: 'exact', head: true }),
        ]);
        setCounts({
          sessions:    sessionsRes.count    ?? 0,
          students:    studentsRes.count    ?? 0,
          supervisors: supervisorsRes.count ?? 0,
          allocations: allocationsRes.count ?? 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <PageSpinner />;

  const statCards = [
    { label: 'Total Sessions',    value: counts?.sessions,    color: 'text-primary' },
    { label: 'Total Students',    value: counts?.students,    color: 'text-secondary' },
    { label: 'Total Supervisors', value: counts?.supervisors, color: 'text-success' },
    { label: 'Total Allocations', value: counts?.allocations, color: 'text-accent' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Dashboard</h1>
        {error && <p className="text-sm text-danger mt-1">{error}</p>}
      </div>

      {/* Stat cards */}
      <div className="stat-grid-responsive">
        {statCards.map(c => (
          <div key={c.label} className="card stat-card">
            <span className="text-xs text-ink-muted uppercase tracking-wide">{c.label}</span>
            <span className={`text-3xl font-bold ${c.color}`}>{c.value ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="card">
        <h2 className="font-display text-lg text-ink mb-4">Quick Links</h2>
        <div className="flex flex-wrap gap-2">
          {quickLinks.map(({ label, to, icon: Icon }) => (
            <Link key={to} to={to}
              className="btn btn-outline gap-2 text-sm">
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
