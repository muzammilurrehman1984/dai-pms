interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
  xl: 'w-16 h-16 border-4',
};

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-ink-faint border-t-primary ${SIZES[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageSpinner({ message = '' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Spinner size="lg" />
      {message && <p className="text-sm text-ink-muted">{message}</p>}
    </div>
  );
}

export default Spinner;
