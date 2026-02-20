import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileCode,
  ArrowRight,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import type { UiBootstrapData } from '../App';

interface PRReviewProps {
  theme: any;
  data?: UiBootstrapData;
  onAction?: (action: string, payload?: any) => void;
  language?: 'en' | 'uk';
}

export function PRReview({ theme, data, onAction, language = 'en' }: PRReviewProps) {
  const i18n = {
    prEvaluation: { en: 'PR Evaluation', uk: 'Оцінка PR' },
    openedAgo: { en: 'Open 4 hours ago by @jdoe', uk: 'Відкрито 4 години тому від @jdoe' },
    subtitle: { en: 'Latest PR analysis result from ARCHGUARD workflow artifacts.', uk: 'Останній результат аналізу PR з артефактів workflow ARCHGUARD.' },
    gateFailed: { en: 'Quality Gate Failed', uk: 'Quality Gate не пройдено' },
    gatePassed: { en: 'Quality Gate Passed', uk: 'Quality Gate пройдено' },
    analysisTime: { en: 'Analysis complete in 42s', uk: 'Аналіз завершено за 42с' },
    newViolations: { en: 'New Violations', uk: 'Нові порушення' },
    critical: { en: 'Critical', uk: 'Критичні' },
    high: { en: 'High', uk: 'Високі' },
    atRiskPackages: { en: 'At-Risk Packages', uk: 'Ризикові пакети' },
    topViolations: { en: 'Top Violations', uk: 'Топ порушень' },
    noViolations: { en: 'No violations found', uk: 'Порушень не знайдено' },
    impactedFiles: { en: 'Impacted Files', uk: 'Задіяні файли' },
    sbomImpact: { en: 'SBOM Impact', uk: 'Вплив SBOM' },
    addedDependencies: { en: 'Added Dependencies', uk: 'Додані залежності' },
    runMetadata: { en: 'Run Metadata', uk: 'Метадані запуску' },
    viewCiPipeline: { en: 'View CI Pipeline', uk: 'Переглянути CI pipeline' },
    upgradeTo: { en: 'Upgrade to v2.3.4', uk: 'Оновити до v2.3.4' },
    violation: { en: 'Violation', uk: 'Порушення' },
    violationPolicyText: {
      en: "Architectural policy 'Layered-Core-01' forbids domain-level gateways from accessing authentication context directly.",
      uk: "Архітектурна політика 'Layered-Core-01' забороняє gateway-рівню domain напряму звертатися до authentication context.",
    },
    knownCriticalVuln: {
      en: 'Known critical vulnerability in signature verification logic.',
      uk: 'Відома критична вразливість у логіці перевірки підпису.',
    },
    highRisk: { en: 'High Risk', uk: 'Високий ризик' },
    mediumRisk: { en: 'Medium Risk', uk: 'Середній ризик' },
    lowRisk: { en: 'Low Risk', uk: 'Низький ризик' },
    branch: { en: 'Branch', uk: 'Гілка' },
    commit: { en: 'Commit', uk: 'Коміт' },
    jobId: { en: 'Job ID', uk: 'ID job' },
    baselineLabel: { en: 'Baseline', uk: 'Baseline' },
    prTitle: { en: 'feat: Implement Stripe Subscription Webhook', uk: 'feat: Реалізувати Stripe subscription webhook' },
    violationTitleFallback: { en: 'Violation', uk: 'Порушення' },
    unknownFile: { en: 'unknown-file', uk: 'невідомий-файл' },
    violationDetected: { en: 'Violation detected', uk: 'Виявлено порушення' },
    openPolicy: { en: 'Open Policy', uk: 'Відкрити Policy' },
    openSbomDetails: { en: 'Open SBOM details', uk: 'Відкрити деталі SBOM' },
  } as const;
  const t = (key: keyof typeof i18n) => i18n[key][language];

  const impactedFiles = [
    { name: 'src/billing/gateways/stripe.ts', changes: '+124 -12', risk: 'High' },
    { name: 'src/billing/webhooks/handler.ts', changes: '+42 -0', risk: 'Medium' },
    { name: 'src/billing/index.ts', changes: '+2 -1', risk: 'Low' },
    { name: 'tests/billing/stripe_test.ts', changes: '+310 -5', risk: 'Low' },
  ];

  const metadataRows = [
    { label: t('branch'), val: 'feature/stripe-webhooks' },
    { label: t('commit'), val: '7f2d9a1' },
    { label: t('jobId'), val: '#94821' },
    { label: t('baselineLabel'), val: 'main (rev: a2d1e)' },
  ];

  const riskLabel = (risk: string) => {
    if (risk === 'High') return t('highRisk');
    if (risk === 'Medium') return t('mediumRisk');
    return t('lowRisk');
  };

  const topViolations = Array.isArray(data?.pr?.topViolations) ? data?.pr?.topViolations : [];
  const sbomTop = Array.isArray(data?.sbom?.entries) ? data?.sbom?.entries.slice(0, 3) : [];
  const bySeverity = data?.pr?.bySeverity || {};
  const qualityGateFailed = Number((bySeverity as any).critical || 0) + Number((bySeverity as any).high || 0) > 0;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      {/* Header Panel */}
      <div className={clsx(theme.card, "p-6 rounded-2xl overflow-hidden relative")}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-3xl -z-10 rounded-full" />
        
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full text-xs font-bold border border-purple-500/20">
                {t('prEvaluation')}
              </span>
              <span className="text-zinc-500 text-sm italic">{t('openedAgo')}</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">{t('prTitle')}</h1>
            <p className="text-zinc-400 text-sm max-w-2xl">
              {t('subtitle')}
            </p>
          </div>
          
          <div className="shrink-0 flex flex-col items-end gap-3">
            <div className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl',
              qualityGateFailed ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'
            )}>
              {qualityGateFailed ? <XCircle className="w-5 h-5 text-rose-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              <span className={clsx('font-bold', qualityGateFailed ? 'text-rose-500' : 'text-emerald-500')}>
                {qualityGateFailed ? t('gateFailed') : t('gatePassed')}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">{t('analysisTime')}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-zinc-800/50">
          <StatMini label={t('newViolations')} val={String(data?.pr?.totalViolations || 0)} color={qualityGateFailed ? 'rose' : 'emerald'} />
          <StatMini label={t('critical')} val={String((bySeverity as any).critical || 0)} color="rose" />
          <StatMini label={t('high')} val={String((bySeverity as any).high || 0)} color="amber" />
          <StatMini label={t('atRiskPackages')} val={String(data?.sbom?.totalAtRiskPackages || 0)} color="zinc" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Violations & Files */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Violations */}
          <div className={clsx(theme.card, "p-6 rounded-2xl")}>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> {t('topViolations')}
            </h3>
            <div className="space-y-4">
              {(topViolations.length > 0 ? topViolations.slice(0, 3) : [{ ruleId: 'N/A', severity: 'low', message: t('noViolations'), from: 'n/a' }]).map((item: any, idx: number) => (
                <ViolationItem 
                  key={`${item.ruleId || 'rule'}-${idx}`}
                  title={item.ruleId || item.type || t('violationTitleFallback')} 
                  severity={String(item.severity || 'low').replace(/^./, (m: string) => m.toUpperCase())}
                  file={item.from || item.moduleId || t('unknownFile')}
                  desc={item.message || t('violationDetected')}
                  onOpenPolicy={() => onAction?.('open-view', {
                    view: 'policy',
                    rule: {
                      id: item.ruleId || item.type || `PR-${idx + 1}`,
                      inferredRule: item.ruleId || item.type || t('violationTitleFallback'),
                      source: item.from || item.moduleId || '',
                    },
                  })}
                />
              ))}
              
              {/* Inline Annotation Preview */}
              <div className="ml-8 my-4 p-4 bg-[#0d0d0e] border-l-4 border-rose-500 rounded-r-xl font-mono text-[11px] space-y-2">
                <div className="flex items-center gap-2 mb-2 text-[10px] text-zinc-500 uppercase font-bold">
                  <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded">{t('violation')}</span> src/billing/gateways/stripe.ts:42
                </div>
                <div className="text-zinc-600">{"41 |  import { AuthContext } from '@auth/core';"}</div>
                <div className="bg-rose-500/10 text-rose-300 -mx-4 px-4 py-1">{"42 |  const user = AuthContext.getUser();"}</div>
                <div className="text-zinc-400 pl-4 border-l border-zinc-700 italic mt-2">
                  {`"${t('violationPolicyText')}"`}
                </div>
              </div>

            </div>
          </div>

          {/* Impacted Files */}
          <div className={clsx(theme.card, "p-6 rounded-2xl")}>
            <h3 className="text-lg font-bold mb-6">{t('impactedFiles')}</h3>
            <div className="space-y-2">
              {impactedFiles.map((file) => (
                <div key={file.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/30 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileCode className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-[10px] font-mono">
                      <span className="text-emerald-500">{file.changes.split(' ')[0]}</span>{' '}
                      <span className="text-rose-500">{file.changes.split(' ')[1]}</span>
                    </div>
                    <span className={clsx(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      file.risk === 'High' ? "text-rose-500 border-rose-500/20 bg-rose-500/5" :
                      file.risk === 'Medium' ? "text-amber-500 border-amber-500/20 bg-amber-500/5" :
                      "text-zinc-500 border-zinc-800"
                    )}>
                      {riskLabel(file.risk)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: SBOM & Metadata */}
        <div className="space-y-6">
          {/* SBOM Highlights */}
          <div className={clsx(theme.card, "p-6 rounded-2xl")}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{t('sbomImpact')}</h3>
              <button
                type="button"
                aria-label={t('openSbomDetails')}
                onClick={() => onAction?.('open-sbom')}
                className="p-1 rounded hover:bg-rose-500/10"
              >
                <svg className="w-6 h-6 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
              </button>
            </div>
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-bold">stripe-v2.x.x</div>
                  <div className="text-[10px] font-bold text-rose-500">CVSS 9.8</div>
                </div>
                <p className="text-xs text-zinc-400 mb-3">{t('knownCriticalVuln')}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 font-mono">{t('upgradeTo')}</span>
                    <button type="button" onClick={() => onAction?.('open-sbom')} className="p-1 rounded hover:bg-zinc-700/20">
                      <ArrowRight className="w-3 h-3 text-zinc-600" />
                    </button>
                  </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t('addedDependencies')}</h4>
                {(sbomTop.length > 0 ? sbomTop : [
                  { package: 'n/a', riskScore: 0 }
                ]).map((dep: any) => (
                  <div key={dep.package || dep.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-sm">{dep.package || dep.name}</span>
                    </div>
                    <div className="text-xs font-mono text-zinc-500">{Number(dep.riskScore || dep.score || 0)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Metadata Panel */}
          <div className={clsx(theme.card, "p-6 rounded-2xl")}>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">{t('runMetadata')}</h3>
            <div className="space-y-4">
              {metadataRows.map((item) => (
                <MetadataRow key={item.label} label={item.label} val={item.val} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => onAction?.('open-ci')}
              className="w-full mt-6 py-2.5 rounded-xl border border-zinc-800 text-sm font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" /> {t('viewCiPipeline')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatMini({ label, val, color }: any) {
  const colors: any = {
    rose: 'text-rose-500',
    amber: 'text-amber-500',
    zinc: 'text-zinc-400',
    emerald: 'text-emerald-500',
  };
  return (
    <div>
      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</div>
      <div className={clsx("text-xl font-bold font-mono mt-1", colors[color])}>{val}</div>
    </div>
  );
}

function ViolationItem({ title, severity, file, desc, onOpenPolicy }: any) {
  return (
    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold">{title}</h4>
          <button
            type="button"
            className="p-1 rounded hover:bg-zinc-800/20"
            aria-label="Open Policy"
            onClick={(event) => {
              event.stopPropagation();
              onOpenPolicy?.();
            }}
          >
            <ChevronRight className="lucide lucide-chevron-right w-4 h-4 text-zinc-700" />
          </button>
        </div>
        <span className={clsx(
          "text-[9px] font-bold px-1.5 py-0.5 rounded-md border",
          severity === 'Critical' ? "text-rose-500 border-rose-500/20 bg-rose-500/5" : "text-amber-500 border-amber-500/20 bg-amber-500/5"
        )}>
          {severity}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-2">
        <FileCode className="w-3 h-3" /> {file}
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function MetadataRow({ label, val }: any) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono text-zinc-300">{val}</span>
    </div>
  );
}
