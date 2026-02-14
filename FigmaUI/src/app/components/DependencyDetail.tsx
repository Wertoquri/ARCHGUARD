import React, { useMemo, useState } from 'react';
import { 
  Package, 
  ExternalLink, 
  ShieldAlert, 
  TrendingUp, 
  History,
  GitBranch,
  Network,
  Download,
  Share2,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { clsx } from 'clsx';
import type { UiBootstrapData } from '../App';

function getLastNQuarterLabels(n: number) {
  const now = new Date();
  let year = now.getFullYear();
  const month = now.getMonth();
  let currentQuarter = Math.floor(month / 3) + 1; // 1..4

  const labels: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    let q = currentQuarter - i;
    let y = year;
    while (q <= 0) {
      q += 4;
      y -= 1;
    }
    while (q > 4) {
      q -= 4;
      y += 1;
    }
    labels.push(`${y} Q${q}`);
  }
  return labels;
}

interface DependencyDetailProps {
  theme: any;
  data?: UiBootstrapData;
  onAction?: (action: string, payload?: any) => void;
  focusPackage?: string | null;
  language?: 'en' | 'uk';
}

export function DependencyDetail({ theme, data, onAction, focusPackage = null, language = 'en' }: DependencyDetailProps) {
  const i18n = {
    trustedSource: { en: 'Trusted Source', uk: 'Довірене джерело' },
    cvesDetected: { en: 'CVEs Detected', uk: 'Виявлено CVE' },
    codeUsages: { en: 'code usages', uk: 'використань у коді' },
    markForRemoval: { en: 'Mark for Removal', uk: 'Позначити на видалення' },
    vulnerabilityTimeline: { en: 'Vulnerability Timeline', uk: 'Таймлайн вразливостей' },
    sourceLabel: { en: 'Source: GitHub Advisory Database', uk: 'Джерело: GitHub Advisory Database' },
    usageBlastRadius: { en: 'Usage Blast Radius', uk: 'Радіус впливу використання' },
    noUsageMap: { en: 'No usage map data available for this package', uk: 'Немає даних мапи використання для цього пакета' },
    riskProfile: { en: 'Risk Profile', uk: 'Профіль ризику' },
    compositeScore: { en: 'Composite Score', uk: 'Композитний бал' },
    remediation: { en: 'Remediation', uk: 'Ремедіація' },
    recommendedUpdate: { en: 'Recommended Update', uk: 'Рекомендоване оновлення' },
    alternative: { en: 'Alternative', uk: 'Альтернатива' },
    applyUpdate: { en: 'Apply Update (PR)', uk: 'Застосувати оновлення (PR)' },
    viewMigrationGuide: { en: 'View Migration Guide', uk: 'Переглянути гайд міграції' },
    callSites: { en: 'Call Sites', uk: 'Виклики' },
    criticalRisk: { en: 'Critical Risk', uk: 'Критичний ризик' },
    highRisk: { en: 'High Risk', uk: 'Високий ризик' },
    mediumRisk: { en: 'Medium Risk', uk: 'Середній ризик' },
    lowRisk: { en: 'Low Risk', uk: 'Низький ризик' },
    quarters: { en: 'quarters', uk: 'кварталів' },
    cveSeverity: { en: 'CVE Severity', uk: 'Серйозність CVE' },
    maintenance: { en: 'Maintenance', uk: 'Підтримка' },
    licenseRisk: { en: 'License Risk', uk: 'Ліцензійний ризик' },
    exposureLabel: { en: 'Exposure', uk: 'Експозиція' },
    criticalPosture: { en: 'Critical risk posture detected.', uk: 'Виявлено критичний ризиковий профіль.' },
    highPosture: { en: 'High risk posture detected.', uk: 'Виявлено високий ризиковий профіль.' },
    mediumPosture: { en: 'Moderate risk posture detected.', uk: 'Виявлено помірний ризиковий профіль.' },
    lowPosture: { en: 'Low risk posture detected.', uk: 'Виявлено низький ризиковий профіль.' },
    primaryImpactArea: { en: 'Primary impact area', uk: 'Головна зона впливу' },
    notAvailable: { en: 'not available', uk: 'недоступно' },
    upgradeFromTo: { en: 'Upgrade from', uk: 'Оновити з' },
    toVersion: { en: 'to', uk: 'до' },
    replaceWith: { en: 'Replace with', uk: 'Замінити на' },
    createMigrationIssue: { en: 'Create Migration Issue', uk: 'Створити migration-задачу' },
    creatingIssue: { en: 'Creating issue...', uk: 'Створення задачі...' },
    issueReady: { en: 'Migration issue link prepared and opened.', uk: 'Посилання на migration-задачу підготовлено та відкрито.' },
    issueFailed: { en: 'Could not prepare migration issue link.', uk: 'Не вдалося підготувати посилання на migration-задачу.' },
  } as const;
  const t = (key: keyof typeof i18n) => i18n[key][language];
  const [quarters, setQuarters] = useState<number>(7);
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);
  const [issueStatus, setIssueStatus] = useState<string>('');

  const entries = Array.isArray(data?.sbom?.entries) ? data.sbom.entries : [];
  const primary = useMemo(() => {
    if (!entries.length) return null;
    const focus = String(focusPackage || '').trim().toLowerCase();
    if (!focus) return entries[0];

    const exact = entries.find((entry: any) => String(entry?.package || entry?.name || '').trim().toLowerCase() === focus);
    if (exact) return exact;

    const partial = entries.find((entry: any) => String(entry?.package || entry?.name || '').trim().toLowerCase().includes(focus));
    if (partial) return partial;

    return entries[0];
  }, [entries, focusPackage]);
  // Build vulnerability timeline from real SBOM data only.
  const vulnData = useMemo(() => {
    const labels = getLastNQuarterLabels(quarters);
    const counts: number[] = labels.map(() => 0);

    // Prefer explicit quarterlyCounts if provided by SBOM entry
    if (primary?.quarterlyCounts && Array.isArray(primary.quarterlyCounts)) {
      // Assume quarterlyCounts aligns with most recent quarters; take last `quarters` values
      const arr = primary.quarterlyCounts.slice(-quarters);
      // pad left if needed
      const padded = Array.from({ length: Math.max(0, quarters - arr.length) }, () => 0).concat(arr);
      return labels.map((label, i) => ({ year: label, count: Number(padded[i] || 0) }));
    }

    // If vulnerabilities have dates, bucket them by quarter
    if (primary && Array.isArray(primary.vulnerabilities) && primary.vulnerabilities.length > 0) {
      const dateKeys = ['published', 'publishedAt', 'disclosureDate', 'created_at', 'created', 'reportedAt', 'date'];
      for (const vuln of primary.vulnerabilities) {
        let dateStr: any = null;
        for (const k of dateKeys) {
          if (vuln[k]) { dateStr = vuln[k]; break; }
        }
        const d = dateStr ? new Date(dateStr) : null;
        if (d && !isNaN(d.getTime())) {
          // compute quarter label
          const q = Math.floor(d.getMonth() / 3) + 1;
          const y = d.getFullYear();
          const label = `${y} Q${q}`;
          const idx = labels.indexOf(label);
          if (idx >= 0) counts[idx] = (counts[idx] || 0) + 1;
        }
      }
      return labels.map((label, i) => ({ year: label, count: counts[i] || 0 }));
    }

    // No timeline details available in source => return zeroed real timeline window
    return labels.map((label) => ({ year: label, count: 0 }));
  }, [primary, quarters]);

  const primaryPkg = primary;
  const focusedName = String(focusPackage || '').trim();
  const packageName = primaryPkg?.package || primaryPkg?.name || focusedName || 'unknown-package';
  const vulnerabilities = Array.isArray(primaryPkg?.vulnerabilities) ? primaryPkg.vulnerabilities : [];
  const vulns = vulnerabilities.length;
  const riskScore = Number(primaryPkg?.riskScore || 0);
  const exposure = Number(primaryPkg?.exposure || 0);

  const numericScores = vulnerabilities
    .map((item: any) => Number(item?.score || 0))
    .filter((value: number) => Number.isFinite(value) && value > 0);
  const maxVulnScore = numericScores.length > 0 ? Math.max(...numericScores) : 0;
  const avgVulnScore = numericScores.length > 0 ? numericScores.reduce((acc: number, value: number) => acc + value, 0) / numericScores.length : 0;

  const maxExposureAcrossEntries = entries.length > 0
    ? Math.max(...entries.map((entry: any) => Number(entry?.exposure || 0)))
    : 0;
  const cveSeverityScore = Math.round(Math.max(maxVulnScore * 10, avgVulnScore * 10));
  const maintenanceScore = Number(primaryPkg?.maintenanceScore || 0);
  const licenseRiskScore = Number(primaryPkg?.licenseRiskScore || 0);
  const exposureScore = maxExposureAcrossEntries > 0
    ? Math.round((exposure / maxExposureAcrossEntries) * 100)
    : 0;
  const inferredVersion = String(primaryPkg?.version || primaryPkg?.installedVersion || 'n/a');
  const suggestedVersion = String(primaryPkg?.fixedVersion || primaryPkg?.recommendedVersion || 'n/a');
  const replacementName = String(primaryPkg?.recommendedAlternative || 'n/a');
  const riskTone = riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : riskScore >= 40 ? 'medium' : 'low';
  const description = language === 'uk'
    ? `Пакет ${packageName} наразі має ${vulns} відомих сигналів вразливостей та ${exposure} точок використання в кодовій базі.`
    : `Package ${packageName} currently has ${vulns} known vulnerability signal(s) and ${exposure} usage point(s) in the codebase.`;

  const blastItems = useMemo(() => {
    const usedBy = Array.isArray(primaryPkg?.usedBy) ? primaryPkg.usedBy : [];
    if (usedBy.length === 0) return [];

    const byModule = new Map<string, number>();
    for (const filePath of usedBy) {
      const normalized = String(filePath || '').replace(/\\/g, '/');
      const moduleName = normalized.split('/')[0] || 'root';
      byModule.set(moduleName, (byModule.get(moduleName) || 0) + 1);
    }

    return Array.from(byModule.entries())
      .map(([module, instances]) => ({
        module,
        instances,
        risk: riskScore >= 80 ? 'Critical' : riskScore >= 60 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low',
      }))
      .sort((a, b) => b.instances - a.instances)
      .slice(0, 4);
  }, [primaryPkg, riskScore]);

  const createMigrationIssue = async () => {
    const finding = {
      id: `DEP-${packageName}`,
      rule: 'dependency-migration',
      type: 'dependency-remediation',
      severity: riskTone === 'critical' ? 'Critical' : riskTone === 'high' ? 'High' : riskTone === 'medium' ? 'Medium' : 'Low',
      owner: 'team-platform',
      area: packageName,
      from: packageName,
      to: replacementName !== 'n/a' ? replacementName : '',
      message: `Dependency remediation for ${packageName} (risk ${riskScore}/100).`,
    };

    setIsCreatingIssue(true);
    setIssueStatus('');
    try {
      const response = await fetch('/api/actions/create-issue-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finding,
          target: 'auto',
          status: 'in-progress',
          confidence: riskTone === 'critical' || riskTone === 'high' ? 'high' : 'medium',
          assignee: 'team-platform',
        }),
      });
      const json = await response.json();
      if (!response.ok || !json?.ok) throw new Error(json?.error || 'Issue creation failed');

      const url = String(json?.issue?.url || '').trim();
      if (url) {
        onAction?.('open-external', { url });
      }
      setIssueStatus(t('issueReady'));
    } catch {
      setIssueStatus(t('issueFailed'));
    } finally {
      setIsCreatingIssue(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex gap-6 items-start">
          <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
            <Package className="w-10 h-10 text-zinc-500" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">{packageName}</h1>
              <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-xs font-mono">risk:{riskScore}</span>
            </div>
            <p className="text-zinc-500 max-w-xl">{description}</p>
            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
                <CheckCircle2 className="w-4 h-4" /> {t('trustedSource')}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-500">
                <ShieldAlert className="w-4 h-4" /> {vulns} {t('cvesDetected')}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
                <Download className="w-4 h-4" /> {exposure} {t('codeUsages')}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onAction?.('open-external', { url: `https://www.npmjs.com/package/${packageName}` })}
            className={clsx(theme.card, "p-2 rounded-lg text-zinc-400 hover:text-zinc-200")}
          >
            <ExternalLink className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => onAction?.('mark-removal', { packageName })}
            className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
          >
            {t('markForRemoval')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Vulnerability Timeline */}
          <div className={clsx(theme.card, "p-6 rounded-2xl")}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-rose-500" /> {t('vulnerabilityTimeline')}
              </h3>
              <div className="flex items-center gap-3">
                <div className="text-xs font-medium text-zinc-500 mr-2">{t('sourceLabel')}</div>
                <select
                  value={quarters}
                  onChange={(e) => setQuarters(Number(e.target.value))}
                  className="text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300"
                >
                  <option value={4}>4 {t('quarters')}</option>
                  <option value={6}>6 {t('quarters')}</option>
                  <option value={7}>7 {t('quarters')}</option>
                  <option value={8}>8 {t('quarters')}</option>
                  <option value={12}>12 {t('quarters')}</option>
                </select>
              </div>
            </div>
            <div className="h-[250px] w-full relative">
              <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vulnData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                    itemStyle={{ color: '#f43f5e' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#f43f5e" strokeWidth={3} dot={{ fill: '#f43f5e', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Blast Radius / Where Used */}
          <div className={clsx(theme.card, "p-6 rounded-2xl")}>
            <h3 className="font-bold mb-6 flex items-center gap-2">
              <Network className="w-5 h-5 text-cyan-500" /> {t('usageBlastRadius')}
            </h3>
            <div className="space-y-4">
              {blastItems.length > 0 ? blastItems.map((item) => (
                <BlastItem
                  key={item.module}
                  module={item.module}
                  instances={item.instances}
                  risk={item.risk}
                  language={language}
                />
              )) : (
                <div className="text-xs text-zinc-500">{t('noUsageMap')}</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Risk Profile Card */}
          <div className={clsx(theme.card, "p-6 rounded-2xl bg-gradient-to-br from-[#141417] to-[#1a1a1e]")}>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-6">{t('riskProfile')}</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('compositeScore')}</span>
                <span className="text-2xl font-bold text-rose-500">{riskScore}/100</span>
              </div>
              <div className="space-y-2">
                <RiskBar label={t('cveSeverity')} val={cveSeverityScore} color={cveSeverityScore >= 70 ? 'bg-rose-500' : cveSeverityScore >= 40 ? 'bg-amber-500' : 'bg-emerald-500'} />
                <RiskBar label={t('maintenance')} val={maintenanceScore} color={maintenanceScore >= 70 ? 'bg-rose-500' : maintenanceScore >= 40 ? 'bg-amber-500' : 'bg-emerald-500'} />
                <RiskBar label={t('licenseRisk')} val={licenseRiskScore} color={licenseRiskScore >= 70 ? 'bg-rose-500' : licenseRiskScore >= 40 ? 'bg-amber-500' : 'bg-emerald-500'} />
                <RiskBar label={t('exposureLabel')} val={exposureScore} color={exposureScore >= 70 ? 'bg-rose-500' : exposureScore >= 40 ? 'bg-amber-500' : 'bg-emerald-500'} />
              </div>
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-xs text-zinc-400">
                    {riskTone === 'critical' ? t('criticalPosture') : riskTone === 'high' ? t('highPosture') : riskTone === 'medium' ? t('mediumPosture') : t('lowPosture')} {t('primaryImpactArea')}: <span className="text-zinc-200">{blastItems[0]?.module || t('notAvailable')}</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Remediation */}
          <div className={clsx(theme.card, "p-6 rounded-2xl")}>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-6">{t('remediation')}</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <div className="text-sm font-bold text-emerald-400 mb-1">{t('recommendedUpdate')}</div>
                <div className="text-xs text-zinc-400 mb-3">{t('upgradeFromTo')} <span className="font-mono text-zinc-200">v{inferredVersion}</span> {t('toVersion')} <span className="font-mono text-zinc-200">v{suggestedVersion}</span></div>
                <button
                  type="button"
                  onClick={() => onAction?.('open-view', { view: 'pr-review' })}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all"
                >
                  {t('applyUpdate')}
                </button>
              </div>
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900">
                <div className="text-sm font-bold text-zinc-300 mb-1">{t('alternative')}</div>
                <div className="text-xs text-zinc-500 mb-3">{t('replaceWith')} <span className="font-mono text-zinc-200">{replacementName}</span></div>
                <button
                  type="button"
                  onClick={() => onAction?.('open-view', { view: 'policy' })}
                  className="w-full py-2 border border-zinc-700 hover:bg-zinc-800 text-zinc-400 rounded-lg text-xs font-bold transition-all"
                >
                  {t('viewMigrationGuide')}
                </button>
                <button
                  type="button"
                  onClick={createMigrationIssue}
                  disabled={isCreatingIssue}
                  className="w-full mt-2 py-2 border border-cyan-600/40 hover:bg-cyan-500/10 disabled:opacity-60 text-cyan-300 rounded-lg text-xs font-bold transition-all"
                >
                  {isCreatingIssue ? t('creatingIssue') : t('createMigrationIssue')}
                </button>
                {issueStatus ? (
                  <div className="mt-2 text-[11px] text-zinc-400">{issueStatus}</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BlastItem({ module, instances, risk, language = 'en' }: any) {
  const labels: any = {
    callSites: { en: 'Call Sites', uk: 'Виклики' },
    Critical: { en: 'Critical Risk', uk: 'Критичний ризик' },
    High: { en: 'High Risk', uk: 'Високий ризик' },
    Medium: { en: 'Medium Risk', uk: 'Середній ризик' },
    Low: { en: 'Low Risk', uk: 'Низький ризик' },
  };
  const riskLabel = labels[risk]?.[language] || risk;
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
      <div className="flex items-center gap-3">
        <GitBranch className="w-4 h-4 text-zinc-500" />
        <div>
          <div className="text-sm font-bold">{module}</div>
          <div className="text-[10px] text-zinc-500 uppercase font-bold">{instances} {labels.callSites[language]}</div>
        </div>
      </div>
      <span className={clsx(
        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
        risk === 'Critical' ? "text-rose-500 border-rose-500/20 bg-rose-500/5" :
        risk === 'High' ? "text-orange-500 border-orange-500/20 bg-orange-500/5" :
        risk === 'Medium' ? "text-amber-500 border-amber-500/20 bg-amber-500/5" :
        "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
      )}>
        {riskLabel}
      </span>
    </div>
  );
}

function RiskBar({ label, val, color }: any) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
        <span>{label}</span>
        <span>{val}%</span>
      </div>
      <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className={clsx("h-full", color)} style={{ width: `${val}%` }} />
      </div>
    </div>
  );
}
