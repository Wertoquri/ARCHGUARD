import React, { useState } from 'react';

export interface IgnoreModalProps {
  open: boolean;
  finding?: any;
  language?: 'en' | 'uk';
  onClose: () => void;
  onSubmit: (payload: { reason: string; owner: string; expiresAt?: string }) => void;
}

export function IgnoreModal({ open, finding, language = 'en', onClose, onSubmit }: IgnoreModalProps) {
  const t = {
    title: { en: 'Ignore Finding', uk: 'Ігнорувати finding' },
    reason: { en: 'Reason', uk: 'Причина' },
    owner: { en: 'Owner', uk: 'Owner' },
    expiresAt: { en: 'Expires at (ISO, optional)', uk: 'Термін дії (ISO, опціонально)' },
    cancel: { en: 'Cancel', uk: 'Скасувати' },
    addIgnore: { en: 'Add Ignore', uk: 'Додати ігнор' },
  } as const;
  const [reason, setReason] = useState<string>('temporary-exemption-ui');
  const [owner, setOwner] = useState<string>(finding?.owner || 'team-architecture');
  const [expiresAt, setExpiresAt] = useState<string>('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md p-6 rounded-xl bg-[#111] border border-zinc-800">
        <h3 className="text-lg font-semibold mb-3 text-white">{t.title[language]}</h3>
        <div className="text-sm text-zinc-300 mb-4">{finding?.title || finding?.id}</div>

        <label className="text-xs text-zinc-500">{t.reason[language]}</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full mt-2 p-2 rounded border bg-transparent border-zinc-700 mb-3" />

        <label className="text-xs text-zinc-500">{t.owner[language]}</label>
        <input value={owner} onChange={(e) => setOwner(e.target.value)} className="w-full mt-2 p-2 rounded border bg-transparent border-zinc-700 mb-3" />

        <label className="text-xs text-zinc-500">{t.expiresAt[language]}</label>
        <input value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} placeholder="2026-03-01T00:00:00Z" className="w-full mt-2 p-2 rounded border bg-transparent border-zinc-700 mb-4" />

        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 rounded text-sm text-zinc-300" onClick={onClose}>{t.cancel[language]}</button>
          <button className="px-3 py-1 rounded bg-cyan-600 text-white text-sm" onClick={() => onSubmit({ reason, owner, expiresAt: expiresAt || undefined })}>{t.addIgnore[language]}</button>
        </div>
      </div>
    </div>
  );
}

export default IgnoreModal;
