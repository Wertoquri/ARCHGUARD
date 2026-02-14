import React from 'react';

export interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmModal({ open, title = 'Saved', message = '', onClose, onConfirm, confirmLabel = 'Confirm', cancelLabel = 'Cancel' }: ConfirmModalProps) {
  if (!open) return null;

  const handleConfirm = () => {
    try {
      if (onConfirm) onConfirm();
    } finally {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md p-6 rounded-xl bg-[#111] border border-zinc-800">
        <h3 className="text-lg font-semibold mb-2 text-white">{title}</h3>
        <div className="text-sm text-zinc-300 mb-4">{message}</div>
        <div className="flex justify-end gap-2">
          {onConfirm ? (
            <>
              <button className="px-3 py-1 rounded bg-zinc-800 text-white" onClick={onClose}>{cancelLabel}</button>
              <button className="px-3 py-1 rounded bg-rose-600 text-white" onClick={handleConfirm}>{confirmLabel}</button>
            </>
          ) : (
            <button className="px-3 py-1 rounded bg-cyan-600 text-white" onClick={onClose}>OK</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
