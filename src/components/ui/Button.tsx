import { Spinner } from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'accent' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const VARIANTS = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  ghost:     'btn-ghost',
  danger:    'btn-danger',
  success:   'btn-success',
  accent:    'btn-accent',
  outline:   'btn-outline',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled, icon, iconRight, className = '', ...props
}: ButtonProps) {
  return (
    <button
      className={`btn ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon ? <span className="flex-shrink-0">{icon}</span> : null}
      {children}
      {iconRight && !loading && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  );
}

export default Button;
