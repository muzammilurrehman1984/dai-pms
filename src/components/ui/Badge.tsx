interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'accent' | 'warning' | 'primary' | 'secondary' | 'muted' | 'info';
  className?: string;
  dot?: boolean;
}

const VARIANTS: Record<string, string> = {
  success:   'badge-success',
  danger:    'badge-danger',
  accent:    'badge-accent',
  warning:   'bg-amber-100 text-amber-800',
  primary:   'badge-primary',
  secondary: 'bg-secondary/10 text-secondary-dark',
  muted:     'badge-muted',
  info:      'badge-info',
};

const DOT_COLORS: Record<string, string> = {
  success: 'bg-success',
  danger:  'bg-danger',
  accent:  'bg-accent',
  warning: 'bg-amber-500',
};

export function Badge({ children, variant = 'muted', className = '', dot = false }: BadgeProps) {
  return (
    <span className={`badge ${VARIANTS[variant] || VARIANTS.muted} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${DOT_COLORS[variant] || 'bg-current opacity-60'}`} />
      )}
      {children}
    </span>
  );
}

export default Badge;
