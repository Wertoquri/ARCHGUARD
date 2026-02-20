import React from 'react';
import { clsx } from 'clsx';
import { 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  XCircle, 
  Layers,
  Palette,
  Type,
  Layout,
  MousePointer2
} from 'lucide-react';

interface DesignSystemProps {
  theme: any;
  themeMode: string;
  setThemeMode: (mode: 'security-ops' | 'calm-enterprise') => void;
  onAction?: (action: string, payload?: any) => void;
  language?: 'en' | 'uk';
}

export function DesignSystem({ theme, themeMode, setThemeMode, onAction, language = 'en' }: DesignSystemProps) {
  const i18n = {
    title: { en: 'Design System', uk: 'Дизайн-система' },
    subtitle: { en: 'Tokens, components, and visual directions for ArchGuard.', uk: 'Токени, компоненти та візуальні принципи для ArchGuard.' },
    securityOps: { en: 'Security Ops', uk: 'Security Ops' },
    calmEnterprise: { en: 'Calm Enterprise', uk: 'Calm Enterprise' },
    colorTokens: { en: 'Color Tokens', uk: 'Кольорові токени' },
    typography: { en: 'Typography', uk: 'Типографіка' },
    heading1: { en: 'Heading 1', uk: 'Заголовок 1' },
    enterpriseIntelligence: { en: 'Enterprise Intelligence', uk: 'Аналітика для Enterprise' },
    bodyLarge: { en: 'Body Large', uk: 'Великий текст' },
    bodyLargeText: {
      en: 'ArchGuard provides automated architectural governance and dependency risk intelligence for high-velocity engineering teams.',
      uk: 'ArchGuard забезпечує автоматизований архітектурний governance та аналітику ризиків залежностей для швидких інженерних команд.'
    },
    tabularNumerals: { en: 'Tabular Numerals', uk: 'Табличні числа' },
    interactionStates: { en: 'Interaction States', uk: 'Стани взаємодії' },
    buttons: { en: 'Buttons', uk: 'Кнопки' },
    primary: { en: 'Primary', uk: 'Основна' },
    secondary: { en: 'Secondary', uk: 'Другорядна' },
    ghost: { en: 'Ghost', uk: 'Прозора' },
    badges: { en: 'Badges', uk: 'Бейджі' },
    critical: { en: 'Critical', uk: 'Критичний' },
    high: { en: 'High', uk: 'Високий' },
    resolved: { en: 'Resolved', uk: 'Виправлено' },
    archived: { en: 'Archived', uk: 'Архівний' },
    icons: { en: 'Icons', uk: 'Іконки' },
    layoutSpacing: { en: 'Layout Spacing', uk: 'Відступи layout' },
    annotationNotes: { en: 'Annotation Notes', uk: 'Нотатки до анотацій' },
    note1: { en: 'Use Inter as the primary font with tabular numbers enabled for metrics.', uk: 'Використовуйте Inter як основний шрифт із табличними числами для метрик.' },
    note2: { en: 'Corner radius is strictly 12px for cards and 8px for buttons/inputs.', uk: 'Радіус кутів: 12px для карток і 8px для кнопок/полів вводу.' },
    note3: { en: 'Borders should be 1px using the variable border token with zinc-800 as fallback.', uk: 'Бордюри мають бути 1px із border token та запасним значенням zinc-800.' },
    note4: { en: 'Gradients are used sparingly: primarily for primary buttons and large branding elements.', uk: 'Градієнти використовуйте обмежено: головно для primary-кнопок і великих бренд-елементів.' },
    note5: { en: 'Interactive elements should have a 150ms ease-in-out transition.', uk: 'Інтерактивні елементи повинні мати перехід 150ms ease-in-out.' },
    background: { en: 'Background', uk: 'Тло' },
    surface: { en: 'Surface', uk: 'Поверхня' },
    border: { en: 'Border', uk: 'Бордер' },
    primaryColor: { en: 'Primary', uk: 'Основний' },
    criticalColor: { en: 'Critical', uk: 'Критичний' },
    highColor: { en: 'High', uk: 'Високий' },
  } as const;
  const t = (key: keyof typeof i18n) => i18n[key][language];

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{t('title')}</h1>
          <p className={theme.textMuted}>{t('subtitle')}</p>
        </div>
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          <button 
            onClick={() => setThemeMode('security-ops')}
            className={clsx(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              themeMode === 'security-ops' ? "bg-cyan-600 text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {t('securityOps')}
          </button>
          <button 
            onClick={() => setThemeMode('calm-enterprise')}
            className={clsx(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              themeMode === 'calm-enterprise' ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {t('calmEnterprise')}
          </button>
        </div>
      </div>

      <section className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2 border-b border-zinc-800 pb-4">
          <Palette className="w-5 h-5 text-zinc-500" /> {t('colorTokens')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <ColorToken name={t('background')} hex={themeMode === 'security-ops' ? '#0A0A0B' : '#121214'} />
          <ColorToken name={t('surface')} hex={themeMode === 'security-ops' ? '#141417' : '#1C1C1F'} />
          <ColorToken name={t('border')} hex={themeMode === 'security-ops' ? '#27272A' : '#2D2D33'} />
          <ColorToken name={t('primaryColor')} hex={themeMode === 'security-ops' ? '#22D3EE' : '#818CF8'} />
          <ColorToken name={t('criticalColor')} hex="#F43F5E" />
          <ColorToken name={t('highColor')} hex="#F97316" />
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2 border-b border-zinc-800 pb-4">
          <Type className="w-5 h-5 text-zinc-500" /> {t('typography')}
        </h2>
        <div className="space-y-8">
          <div className="space-y-2">
            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{t('heading1')}</div>
            <div className="text-4xl font-bold tracking-tight">{t('enterpriseIntelligence')}</div>
          </div>
          <div className="space-y-2">
            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{t('bodyLarge')}</div>
            <div className="text-lg text-zinc-300 max-w-2xl leading-relaxed">
              {t('bodyLargeText')}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{t('tabularNumerals')}</div>
            <div className="text-3xl font-bold font-mono">1,284,592.00</div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2 border-b border-zinc-800 pb-4">
          <MousePointer2 className="w-5 h-5 text-zinc-500" /> {t('interactionStates')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-500 uppercase">{t('buttons')}</h3>
            <div className="flex flex-wrap gap-4">
              <button type="button" onClick={() => onAction?.('run-analysis')} className="bg-cyan-600 px-4 py-2 rounded-lg text-sm font-bold text-white shadow-lg shadow-cyan-500/20">{t('primary')}</button>
              <button type="button" onClick={() => onAction?.('open-ci')} className="border border-zinc-700 px-4 py-2 rounded-lg text-sm font-bold text-zinc-300 hover:bg-zinc-800 transition-all">{t('secondary')}</button>
              <button type="button" onClick={() => onAction?.('open-view', { view: 'settings' })} className="text-cyan-400 text-sm font-bold hover:underline">{t('ghost')}</button>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-500 uppercase">{t('badges')}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge color="rose" label={t('critical')} />
              <Badge color="amber" label={t('high')} />
              <Badge color="emerald" label={t('resolved')} />
              <Badge color="zinc" label={t('archived')} />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-500 uppercase">{t('icons')}</h3>
            <div className="flex gap-4">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
              <AlertCircle className="w-6 h-6 text-rose-500" />
              <Info className="w-6 h-6 text-cyan-500" />
              <Layers className="w-6 h-6 text-indigo-500" />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2 border-b border-zinc-800 pb-4">
          <Layout className="w-5 h-5 text-zinc-500" /> {t('layoutSpacing')}
        </h2>
        <div className="flex items-end gap-4 h-32 p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
          <SpacingBox size="h-4 w-4" label="4px" />
          <SpacingBox size="h-8 w-8" label="8px" />
          <SpacingBox size="h-12 w-12" label="12px" />
          <SpacingBox size="h-16 w-16" label="16px" />
          <SpacingBox size="h-20 w-20" label="24px" />
        </div>
      </section>

      <div className={clsx(theme.card, "p-8 rounded-3xl border-2 border-dashed border-zinc-800 text-center")}>
        <h3 className="text-2xl font-bold mb-4">{t('annotationNotes')}</h3>
        <ul className="max-w-2xl mx-auto text-left space-y-3 text-zinc-400 text-sm">
          <li>• {t('note1')}</li>
          <li>• {t('note2')}</li>
          <li>• {t('note3')}</li>
          <li>• {t('note4')}</li>
          <li>• {t('note5')}</li>
        </ul>
      </div>
    </div>
  );
}

function ColorToken({ name, hex }: any) {
  return (
    <div className="space-y-2 group cursor-pointer">
      <div 
        className="h-20 w-full rounded-2xl border border-zinc-800 shadow-xl group-hover:scale-[1.02] transition-transform" 
        style={{ backgroundColor: hex }} 
      />
      <div>
        <div className="text-[10px] font-bold text-zinc-500 uppercase">{name}</div>
        <div className="text-xs font-mono font-bold">{hex}</div>
      </div>
    </div>
  );
}

function Badge({ color, label }: any) {
  const colors: any = {
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    zinc: 'text-zinc-500 bg-zinc-800 border-zinc-700',
  };
  return (
    <span className={clsx("px-2.5 py-1 rounded-full text-[10px] font-bold border", colors[color])}>
      {label}
    </span>
  );
}

function SpacingBox({ size, label }: any) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={clsx("bg-cyan-500/40 border border-cyan-500/60 rounded-sm", size)} />
      <span className="text-[10px] text-zinc-500 font-mono">{label}</span>
    </div>
  );
}
