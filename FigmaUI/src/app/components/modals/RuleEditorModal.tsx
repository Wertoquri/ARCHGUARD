import React, { useState, useEffect } from 'react';

export interface RuleEditorModalProps {
  open: boolean;
  rule?: any;
  language?: 'en' | 'uk';
  onClose: () => void;
  onSubmit: (rule: any) => void;
}

export function RuleEditorModal({ open, rule, language = 'en', onClose, onSubmit }: RuleEditorModalProps) {
  const t = {
    title: { en: 'Edit Rule', uk: 'Редагувати правило' },
    cancel: { en: 'Cancel', uk: 'Скасувати' },
    save: { en: 'Save', uk: 'Зберегти' },
  } as const;
  const [text, setText] = useState<string>('');

  useEffect(() => {
    if (rule) {
      try {
        setText(JSON.stringify(rule, null, 2));
      } catch (e) {
        setText(String(rule));
      }
    } else {
      setText('');
    }
  }, [rule]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl p-6 rounded-xl bg-[#111] border border-zinc-800">
        <h3 className="text-lg font-semibold mb-3 text-white">{t.title[language]}</h3>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} className="w-full p-3 rounded border bg-transparent border-zinc-700 text-sm font-mono text-zinc-200" />

        <div className="flex justify-end gap-2 mt-3">
          <button className="px-3 py-1 rounded text-sm text-zinc-300" onClick={onClose}>{t.cancel[language]}</button>
          <button
            className="px-3 py-1 rounded bg-cyan-600 text-white text-sm"
            onClick={() => {
              try {
                const parsed = JSON.parse(text);
                onSubmit(parsed);
              } catch (err) {
                // fallback: submit raw string as rule id
                onSubmit({ raw: text });
              }
            }}
          >{t.save[language]}</button>
        </div>
      </div>
    </div>
  );
}

export default RuleEditorModal;
