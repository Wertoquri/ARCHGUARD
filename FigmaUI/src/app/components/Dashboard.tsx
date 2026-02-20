import React from 'react';
import { 
  TrendingUp, 
  AlertCircle, 
  ShieldCheck, 
  Clock, 
  Package,
  Layers,
  ChevronUp,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { UiBootstrapData } from '../App';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DashboardProps {
  theme: any;
  data?: UiBootstrapData;
  onAction?: (action: string, payload?: any) => void;
  language?: 'en' | 'uk';
}

export function Dashboard({ theme, data, onAction, language = 'en' }: DashboardProps) {
  const i18n = {
    executiveOverview: { en: 'Executive Overview', uk: 'Огляд для керівництва' },
    summary: { en: 'Platform governance and dependency risk intelligence summary', uk: 'Зведення з governance платформи та ризиків залежностей' },
    last30: { en: 'Last 30 days', uk: 'Останні 30 днів' },
    last90: { en: 'Last 90 days', uk: 'Останні 90 днів' },
    runAnalysis: { en: 'Run Analysis', uk: 'Запустити аналіз' },
    totalViolations: { en: 'Total Violations', uk: 'Усього порушень' },
    highCritical: { en: 'High/Critical', uk: 'High/Critical' },
    riskScore: { en: 'Risk Score', uk: 'Ризиковий бал' },
    mttrTrend: { en: 'MTTR Trend', uk: 'Тренд MTTR' },
    baselineCoverage: { en: 'Baseline Coverage', uk: 'Покриття baseline' },
    violationsTrend: { en: 'Violations Trend', uk: 'Тренд порушень' },
    active: { en: 'Active', uk: 'Активні' },
    baseline: { en: 'Baseline', uk: 'Baseline' },
    noTrendData: { en: 'No trend history available yet', uk: 'Історія трендів поки недоступна' },
    riskByModule: { en: 'Risk by Module', uk: 'Ризик за модулями' },
    noModuleRisk: { en: 'No module risk data available', uk: 'Немає даних ризику по модулях' },
    ownershipWorkload: { en: 'Ownership Workload', uk: 'Навантаження власників' },
    riskyDependencies: { en: 'Risky Dependencies (SBOM)', uk: 'Ризикові залежності (SBOM)' },
    viewSbom: { en: 'View SBOM', uk: 'Переглянути SBOM' },
    noSbom: { en: 'No SBOM risk entries available', uk: 'Немає записів ризику SBOM' },
    whatChanged: { en: 'What changed since last run?', uk: 'Що змінилося з останнього запуску?' },
    qualityGateSnapshot: { en: 'Quality Gate Snapshot', uk: 'Знімок quality gate' },
    noTopRisk: { en: 'No top-risk module data available in current findings.', uk: 'У поточних findings немає даних про модуль із найбільшим ризиком.' },
    noHighCritical: { en: 'No High/Critical', uk: 'Немає High/Critical' },
    total: { en: 'Total', uk: 'Всього' },
    newDependenciesAdded: { en: 'New dependencies added', uk: 'Додано нові залежності' },
    violationsResolved: { en: 'Violations resolved', uk: 'Порушення усунено' },
    policyRulesUpdated: { en: 'Policy rules updated', uk: 'Оновлено policy правила' },
  } as const;
  const t = (key: keyof typeof i18n) => i18n[key][language];
  const summary = data?.findings?.summary || {};
  const bySeverity = summary.bySeverity || { critical: 0, high: 0, medium: 0, low: 0 };

  const trendHistory = Array.isArray(data?.trends?.history) ? data?.trends?.history : [];
  const trendData = trendHistory.length > 0
    ? trendHistory.slice(-7).map((item: any, idx: number) => ({
        name: item?.date || `D${idx + 1}`,
        violations: Number(item?.totalViolations || 0),
        baseline: Number(item?.baselineViolations || 0),
      }))
    : [];

  const topRiskModules = Array.isArray(summary.topRisk)
    ? summary.topRisk.slice(0, 5).map((item: any) => ({
        module: item?.moduleId || 'unknown',
        score: Math.max(0, Math.min(100, Math.round((item?.changeRiskScore || 0) * 10))),
        color: (item?.changeRiskScore || 0) > 7 ? '#f43f5e' : (item?.changeRiskScore || 0) > 4 ? '#fbbf24' : '#38bdf8',
      }))
    : [];

  const riskyDependencies = Array.isArray(data?.sbom?.entries)
    ? data?.sbom?.entries.slice(0, 4)
    : [];

  const totalViolations = Number(summary.totalViolations || 0);
  const highCritical = Number(bySeverity.high || 0) + Number(bySeverity.critical || 0);
  const riskScore = Number(summary.riskSummary?.averageRiskScore || 0);
  const topRiskItem = topRiskModules[0] || null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('executiveOverview')}</h1>
          <p className={theme.textMuted}>{t('summary')}</p>
        </div>
        <div className="flex gap-2">
          <select className={theme.card + " px-3 py-2 rounded-lg text-sm outline-none"}>
            <option>{t('last30')}</option>
            <option>{t('last90')}</option>
          </select>
          <button
            type="button"
            onClick={() => onAction?.('run-analysis')}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {t('runAnalysis')}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title={t('totalViolations')} value={String(totalViolations)} trend="live" isUp={highCritical === 0} icon={AlertCircle} color="rose" theme={theme} />
        <KPICard title={t('highCritical')} value={String(highCritical)} trend="live" isUp={highCritical === 0} icon={ShieldCheck} color="amber" theme={theme} />
        <KPICard title={t('riskScore')} value={String(Math.round(riskScore))} trend="live" isUp={riskScore < 50} icon={Layers} color="cyan" theme={theme} />
        <KPICard title={t('mttrTrend')} value="2.4d" trend="-15%" isUp={false} icon={Clock} color="indigo" theme={theme} />
        <KPICard title={t('baselineCoverage')} value="N/A" trend="live" isUp={true} icon={ShieldCheck} color="emerald" theme={theme} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className={theme.card + " p-6 rounded-2xl col-span-2"}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">{t('violationsTrend')}</h3>
            <div className="flex gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-cyan-500" />
                <span>{t('active')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-500">
                <div className="w-2 h-2 rounded-full bg-zinc-700" />
                <span>{t('baseline')}</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full relative">
            {trendData.length > 0 ? (
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    border: '1px solid #27272a', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="violations" 
                  stroke="#22d3ee" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorViolations)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="baseline" 
                  stroke="#3f3f46" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="transparent" 
                />
              </AreaChart>
            </ResponsiveContainer>
            </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                {t('noTrendData')}
              </div>
            )}
          </div>
        </div>

        {/* Heatmap/Risk by Module */}
        <div className={theme.card + " p-6 rounded-2xl"}>
          <h3 className="font-semibold mb-6">{t('riskByModule')}</h3>
          <div className="space-y-4">
            {topRiskModules.length > 0 ? topRiskModules.map((item: any) => (
              <div key={item.module} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span>{item.module}</span>
                  <span className={theme.textMuted}>{item.score}/100</span>
                </div>
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${item.score}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            )) : (
              <div className="text-xs text-zinc-500">{t('noModuleRisk')}</div>
            )}
          </div>
          <div className="mt-8 pt-6 border-t border-zinc-800/50">
            <h4 className="text-sm font-medium mb-4">{t('ownershipWorkload')}</h4>
            <div className="flex gap-2">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="flex-1 h-12 bg-zinc-800/50 rounded-lg flex flex-col items-center justify-center">
                  <div className="text-[10px] text-zinc-500">S{i}</div>
                  <div className="text-xs font-bold text-cyan-500">{[bySeverity.critical, bySeverity.high, bySeverity.medium, bySeverity.low, totalViolations][i - 1] || 0}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Risky Dependencies */}
        <div className={theme.card + " p-6 rounded-2xl"}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{t('riskyDependencies')}</h3>
            <button
              type="button"
              onClick={() => onAction?.('open-view', { view: 'dependency' })}
              className="text-xs text-cyan-400 hover:underline"
            >
              {t('viewSbom')}
            </button>
          </div>
          <div className="space-y-3">
            {riskyDependencies.length > 0 ? riskyDependencies.map((dep: any) => (
              <div key={dep.package || dep.name} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-800">
                    <Package className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{dep.package || dep.name}</div>
                    <div className="text-[10px] text-zinc-500">{Number(dep.exposure || dep.exposures || 0)} usages • {Array.isArray(dep.vulnerabilities) ? dep.vulnerabilities.length : 0} vulns</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={cn(
                      "text-xs font-bold",
                      Number(dep.riskScore || dep.risk || 0) > 80 ? "text-rose-500" : "text-amber-500"
                    )}>{Number(dep.riskScore || dep.risk || 0)} Risk</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAction?.('open-view', { view: 'dependency', packageName: dep.package || dep.name })}
                    className="p-1 rounded hover:bg-zinc-800/30"
                    aria-label={`Open dependency ${(dep.package || dep.name) ?? ''}`}
                  >
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-xs text-zinc-500">{t('noSbom')}</div>
            )}
          </div>
        </div>

        {/* Change Summary */}
        <div className={theme.card + " p-6 rounded-2xl"}>
          <h3 className="font-semibold mb-4">{t('whatChanged')}</h3>
          <div className="space-y-4">
            <div className="flex gap-4 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
              <div className="shrink-0 w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-sm font-semibold">{t('qualityGateSnapshot')}</div>
                <p className="text-xs text-zinc-400 mt-1">
                  {topRiskItem
                    ? <>Highest current risk: <span className="text-zinc-200">{topRiskItem.module}</span> with score <span className="text-zinc-200">{topRiskItem.score}</span>.</>
                    : <>{t('noTopRisk')}</>}
                </p>
                <div className="mt-2 flex gap-2">
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border",
                    highCritical > 0 ? "bg-rose-500/20 text-rose-400 border-rose-500/20" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                  )}>{highCritical > 0 ? `${highCritical} ${t('highCritical')}` : t('noHighCritical')}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{t('total')}: {totalViolations}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: t('newDependenciesAdded'), val: '+12' },
                { label: t('violationsResolved'), val: '-34' },
                { label: t('policyRulesUpdated'), val: '2' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">{item.label}</span>
                  <span className="font-mono font-medium">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, trend, isUp, icon: Icon, color, theme }: any) {
  const colorMap: any = {
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    cyan: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    indigo: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  };

  return (
    <div className={cn(theme.card, "p-4 rounded-2xl flex flex-col gap-3")}>
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-lg", colorMap[color].split(' ')[1])}>
          <Icon className={cn("w-4 h-4", colorMap[color].split(' ')[0])} />
        </div>
        <div className={cn(
          "flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md",
          isUp ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
        )}>
          {isUp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">{title}</div>
        <div className="text-2xl font-bold mt-0.5 font-mono">{value}</div>
      </div>
    </div>
  );
}
