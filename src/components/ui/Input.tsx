import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, icon, iconRight, className = '', wrapperClassName = '', required, ...props },
  ref
) {
  return (
    <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
      {label && (
        <label className="form-label">
          {label}{required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={`form-input ${icon ? 'pl-9' : ''} ${iconRight ? 'pr-9' : ''} ${error ? 'border-danger focus:border-danger' : ''} ${className}`}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint">
            {iconRight}
          </span>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
});

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, className = '', wrapperClassName = '', required, children, ...props },
  ref
) {
  return (
    <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
      {label && (
        <label className="form-label">
          {label}{required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={`form-input ${error ? 'border-danger focus:border-danger' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="form-error">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className = '', wrapperClassName = '', required, rows = 3, ...props },
  ref
) {
  return (
    <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
      {label && (
        <label className="form-label">
          {label}{required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={`form-input resize-y ${error ? 'border-danger focus:border-danger' : ''} ${className}`}
        {...props}
      />
      {error && <p className="form-error">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
});

export default Input;
