import React, { useState } from 'react';

export interface AssignModalProps {
  open: boolean;
  finding?: any;
  defaultOwner?: string;
  language?: 'en' | 'uk';
  onClose: () => void;
  onSubmit: (owner: string) => void;
}

export function AssignModal({ open, finding, defaultOwner, language = 'en', onClose, onSubmit }: AssignModalProps) {
  const t = {
    title: { en: 'Assign Finding', uk: 'Призначити finding' },
    selectedFinding: { en: 'Selected finding', uk: 'Вибраний finding' },
    ownerTeam: { en: 'Owner / Team', uk: 'Owner / Команда' },
    cancel: { en: 'Cancel', uk: 'Скасувати' },
    assign: { en: 'Assign', uk: 'Призначити' },
  } as const;
  const [owner, setOwner] = useState<string>(defaultOwner || '');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md p-6 rounded-xl bg-[#111] border border-zinc-800">
        <h3 className="text-lg font-semibold mb-3 text-white">{t.title[language]}</h3>
        <div className="text-sm text-zinc-300 mb-4">{finding?.title || finding?.id || t.selectedFinding[language]}</div>
        <label className="text-xs text-zinc-500">{t.ownerTeam[language]}</label>
        <input
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className="w-full mt-2 mb-4 p-2 rounded border bg-transparent border-zinc-700"
        />

        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 rounded text-sm text-zinc-300" onClick={onClose}>{t.cancel[language]}</button>
          <button
            className="px-3 py-1 rounded bg-cyan-600 text-white text-sm"
            onClick={() => onSubmit(owner)}
          >{t.assign[language]}</button>
        </div>
      </div>
    </div>
  );
}

export default AssignModal;
