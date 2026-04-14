import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

const CONFIG: Record<ToastType, { icon: React.ElementType; classes: string; iconClass: string }> = {
  success: { icon: CheckCircle,   classes: 'border-success/20 bg-success/5',  iconClass: 'text-success'  },
  error:   { icon: XCircle,       classes: 'border-danger/20 bg-danger/5',    iconClass: 'text-danger'   },
  warning: { icon: AlertTriangle, classes: 'border-accent/20 bg-accent/5',    iconClass: 'text-accent'   },
  info:    { icon: Info,          classes: 'border-primary/20 bg-primary/5',  iconClass: 'text-primary'  },
};

function ToastItem({ message, type, onDismiss }: { message: string; type: ToastType; onDismiss: () => void }) {
  const cfg = CONFIG[type];
  const Icon = cfg.icon;

  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className={`fade-up flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lift text-sm text-ink min-w-[260px] max-w-sm ${cfg.classes}`}>
      <Icon size={16} className={`${cfg.iconClass} flex-shrink-0 mt-0.5`} />
      <span className="flex-1 leading-snug">{message}</span>
      <button onClick={onDismiss} className="text-ink-faint hover:text-ink transition-colors mt-0.5 flex-shrink-0" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}

// Simple global toast state
let _setToasts: React.Dispatch<React.SetStateAction<ToastItem[]>> | null = null;

export function toast(message: string, type: ToastType = 'info') {
  const id = Math.random().toString(36).slice(2);
  _setToasts?.(prev => [...prev, { id, message, type }]);
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  _setToasts = setToasts;

  function dismiss(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="region" aria-live="polite">
      {toasts.map(t => (
        <ToastItem key={t.id} message={t.message} type={t.type} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

export default ToastProvider;
