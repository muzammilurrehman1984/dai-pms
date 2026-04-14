import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  required?: boolean;
}

const SIZES = {
  sm:   'max-w-sm',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-6xl',
};

export function Modal({ open, onClose, title, children, size = 'md', required = false }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open || required) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, required]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center sm:p-4"
      onClick={e => { if (e.target === e.currentTarget && !required) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
      <div className={`relative z-50 w-full ${SIZES[size]} bg-white shadow-lift fade-up rounded-t-xl2 sm:rounded-xl2 max-h-[95dvh] sm:max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border flex-shrink-0">
          <h2 className="text-lg font-display text-ink leading-tight">{title}</h2>
          {!required && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
