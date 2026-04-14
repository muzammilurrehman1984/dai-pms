import { AlertTriangle, Info } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  danger?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDialog({
  open, onClose, onConfirm,
  title = 'Are you sure?',
  message,
  danger = false,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: ConfirmDialogProps) {
  function handleConfirm() { onConfirm(); onClose(); }

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col gap-5">
        <div className="flex gap-3 items-start">
          {danger
            ? <AlertTriangle size={20} className="text-danger flex-shrink-0 mt-0.5" />
            : <Info          size={20} className="text-primary flex-shrink-0 mt-0.5" />}
          <p className="text-sm text-ink-muted leading-relaxed">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-outline" onClick={onClose}>{cancelLabel}</button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={handleConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
