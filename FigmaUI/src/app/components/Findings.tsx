import React, { useEffect, useMemo, useState } from 'react';
import { 
  Filter, 
  Download, 
  MoreHorizontal, 
  Search,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldAlert,
  X
} from 'lucide-react';
import { clsx } from 'clsx';
import type { UiBootstrapData } from '../App';

interface FindingsProps {
  theme: any;
  data?: UiBootstrapData;
  onAction?: (action: string, payload?: any) => void;
  language?: 'en' | 'uk';
}

export function Findings({ theme, data, onAction, language = 'en' }: FindingsProps) {
  const i18n = {
    title: { en: 'Findings Workspace', uk: 'Робочий простір Findings' },
    subtitle: { en: 'Manage and remediate architectural governance violations', uk: 'Керуйте та усувайте порушення архітектурного governance' },
    export: { en: 'Export', uk: 'Експорт' },
    createPolicy: { en: 'Create Policy', uk: 'Створити політику' },
    filterPlaceholder: { en: 'Filter findings...', uk: 'Фільтр знахідок...' },
    groupBy: { en: 'Group by:', uk: 'Групувати за:' },
    module: { en: 'Module', uk: 'Модуль' },
    severity: { en: 'Severity', uk: 'Серйозність' },
    team: { en: 'Team', uk: 'Команда' },
    status: { en: 'Status', uk: 'Статус' },
    ruleType: { en: 'Rule Type', uk: 'Тип правила' },
    noFindings: { en: 'No findings available from current data source.', uk: 'Немає знахідок у поточному джерелі даних.' },
    showing: { en: 'Showing', uk: 'Показано' },
    filtered: { en: 'filtered', uk: 'відфільтровано' },
    total: { en: 'total', uk: 'загалом' },
    actionPlan: { en: 'Action Plan', uk: 'План дій' },
    assignee: { en: 'Assignee', uk: 'Виконавець' },
    dueDate: { en: 'Due date', uk: 'Дедлайн' },
    savePlan: { en: 'Save Action Plan', uk: 'Зберегти план дій' },
    createIssue: { en: 'Create Jira/GitHub Issue', uk: 'Створити Jira/GitHub задачу' },
    progressHistory: { en: 'Progress History', uk: 'Історія прогресу' },
    noRemediation: { en: 'No remediation updates yet.', uk: 'Оновлень remediation ще немає.' },
  } as const;
  const t = (key: keyof typeof i18n) => i18n[key][language];

  const [selectedFinding, setSelectedFinding] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchScope, setSearchScope] = useState<'Module' | 'Severity' | 'Team'>('Module');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [remediationOverrides, setRemediationOverrides] = useState<Record<string, any>>({});
  const [planAssignee, setPlanAssignee] = useState<string>('');
  const [planDueDate, setPlanDueDate] = useState<string>('');
  const [planStatus, setPlanStatus] = useState<'open' | 'in-progress' | 'done'>('open');
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const pageSize = 10;

  const findings = useMemo(() => {
    const serverTracker = (data?.findings?.remediationTracker && typeof data.findings.remediationTracker === 'object') ? data.findings.remediationTracker : {};
    let localTracker: Record<string, any> = {};
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('archguard.remediationTracker') : null;
      localTracker = raw ? JSON.parse(raw) : {};
    } catch {
      localTracker = {};
    }
    const tracker = { ...localTracker, ...serverTracker };
    const source = Array.isArray(data?.findings?.raw?.violations) ? data?.findings?.raw?.violations : [];
    if (source.length === 0) return [];
    return source.map((item: any, index: number) => {
      const mapped = {
      id: item?.id || item?.ruleId || `FG-${1000 + index}`,
      rule: item?.ruleId || item?.type || 'rule',
      type: item?.type || item?.ruleId || item?.rule || 'rule',
      severity: String(item?.severity || 'low').replace(/^./, (m: string) => m.toUpperCase()),
      owner: item?.owner || 'Unassigned',
      area: item?.moduleId || item?.from || 'Unknown area',
      status: item?.baselineIgnored ? 'Baseline' : 'Active',
      age: item?.age || 'n/a',
      message: item?.message || 'Violation detected',
      from: item?.from || '',
      to: item?.to || '',
      evidencePath: item?.path || item?.file || item?.moduleId || item?.from || 'n/a',
      };

      const findingKey = buildFindingKey(mapped);
      const tracked = tracker[findingKey] || {};
      return {
        ...mapped,
        findingKey,
        remediationStatus: String(tracked?.status || 'open'),
        remediationAssignee: String(tracked?.assignee || mapped.owner || ''),
        remediationDueDate: String(tracked?.dueDate || ''),
        remediationConfidence: String(tracked?.confidence || deriveRemediationConfidence(mapped, tracked)),
        remediationHistory: Array.isArray(tracked?.history) ? tracked.history : [],
      };
    });
  }, [data]);

  useEffect(() => {
    if (!selectedFinding) return;
    const override = remediationOverrides[selectedFinding.findingKey] || {};
    setPlanAssignee(String(override.assignee || selectedFinding.remediationAssignee || selectedFinding.owner || ''));
    setPlanDueDate(String(override.dueDate || selectedFinding.remediationDueDate || ''));
    setPlanStatus((override.status || selectedFinding.remediationStatus || 'open') as 'open' | 'in-progress' | 'done');
  }, [selectedFinding, remediationOverrides]);

  const filterCounts = useMemo(() => {
    const highCritical = findings.filter((f: any) => ['High', 'Critical'].includes(String(f.severity || ''))).length;
    const withOwner = findings.filter((f: any) => String(f.owner || '').trim().toLowerCase() !== 'unassigned').length;
    const baseline = findings.filter((f: any) => String(f.status || '').toLowerCase() === 'baseline').length;
    const ruleType = findings.filter((f: any) => {
      const rule = String(f.rule || '').toLowerCase();
      return rule.includes('dependency') || rule.includes('cyclic') || rule.includes('layer');
    }).length;
    return {
      severity: highCritical,
      team: withOwner,
      status: baseline,
      ruleType,
    };
  }, [findings]);

  const visibleFindings = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return findings;
    return findings.filter((f: any) => {
      if (searchScope === 'Module') {
        return String(f.area || '').toLowerCase().includes(q);
      }
      if (searchScope === 'Severity') {
        return String(f.severity || '').toLowerCase().includes(q);
      }
      if (searchScope === 'Team') {
        return String(f.owner || '').toLowerCase().includes(q);
      }
      return false;
    });
  }, [findings, query, searchScope]);

  const filteredFindings = useMemo(() => {
    if (!activeFilter) return visibleFindings;
    switch (activeFilter) {
      case 'Severity':
        return visibleFindings.filter((f: any) => ['High', 'Critical'].includes(f.severity));
      case 'Team':
        return visibleFindings.filter((f: any) => String(f.owner).toLowerCase().includes('team'));
      case 'Status':
        return visibleFindings.filter((f: any) => String(f.status).toLowerCase() === 'baseline');
      case 'Rule Type':
        return visibleFindings.filter((f: any) => String(f.rule).toLowerCase().includes('dependency') || String(f.rule).toLowerCase().includes('cyclic'));
      default:
        return visibleFindings;
    }
  }, [visibleFindings, activeFilter]);

  const pagedFindings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFindings.slice(start, start + pageSize);
  }, [filteredFindings, currentPage]);

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'Critical': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'High': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'Medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    }
  };

  const selectedOverride = selectedFinding ? (remediationOverrides[selectedFinding.findingKey] || null) : null;
  const selectedHistory = selectedFinding
    ? [...(Array.isArray(selectedFinding.remediationHistory) ? selectedFinding.remediationHistory : []), ...(Array.isArray(selectedOverride?.history) ? selectedOverride.history : [])]
    : [];
  const selectedConfidence = selectedFinding
    ? deriveRemediationConfidence(selectedFinding, { assignee: planAssignee, dueDate: planDueDate })
    : 'low';

  const saveRemediationPlan = async () => {
    if (!selectedFinding) return;
    const payload = {
      finding: selectedFinding,
      status: planStatus,
      assignee: planAssignee,
      dueDate: planDueDate,
      confidence: selectedConfidence,
      note: 'Updated from Findings drawer',
    };
    const historyItem = {
      at: new Date().toISOString(),
      source: 'drawer',
      status: planStatus,
      assignee: planAssignee || '',
      dueDate: planDueDate || '',
      note: 'Updated from Findings drawer',
    };

    setIsSavingPlan(true);
    try {
      const response = await fetch('/api/actions/remediation-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok || !json?.ok) throw new Error(json?.error || 'Failed to save remediation plan');

      const nextOverride = {
        status: planStatus,
        assignee: planAssignee,
        dueDate: planDueDate,
        confidence: selectedConfidence,
        history: [historyItem],
      };
      setRemediationOverrides((prev) => ({ ...prev, [selectedFinding.findingKey]: nextOverride }));
      setSelectedFinding((prev: any) => prev ? ({ ...prev, remediationStatus: planStatus, remediationAssignee: planAssignee, remediationDueDate: planDueDate, remediationConfidence: selectedConfidence }) : prev);
    } catch {
      try {
        const key = 'archguard.remediationTracker';
        const raw = window.localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : {};
        parsed[selectedFinding.findingKey] = {
          status: planStatus,
          assignee: planAssignee,
          dueDate: planDueDate,
          confidence: selectedConfidence,
          history: [...(Array.isArray(parsed[selectedFinding.findingKey]?.history) ? parsed[selectedFinding.findingKey].history : []), historyItem],
        };
        window.localStorage.setItem(key, JSON.stringify(parsed));
        setRemediationOverrides((prev) => ({
          ...prev,
          [selectedFinding.findingKey]: {
            status: planStatus,
            assignee: planAssignee,
            dueDate: planDueDate,
            confidence: selectedConfidence,
            history: [historyItem],
          },
        }));
      } catch {
        // no-op
      }
    } finally {
      setIsSavingPlan(false);
    }
  };

  const openIssueForFinding = async () => {
    if (!selectedFinding) return;

    const fallbackIssue = buildIssueTargets(data, selectedFinding);
    const fallbackTarget = fallbackIssue.githubUrl || fallbackIssue.jiraUrl || null;

    try {
      const response = await fetch('/api/actions/create-issue-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finding: selectedFinding,
          target: 'auto',
          assignee: planAssignee,
          dueDate: planDueDate,
          status: planStatus,
          confidence: selectedConfidence,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json?.ok) throw new Error(json?.error || 'Failed to create issue link');

      const selectedUrl = String(json?.issue?.url || '').trim();
      if (selectedUrl) {
        onAction?.('open-external', { url: selectedUrl });
      } else if (fallbackTarget) {
        onAction?.('open-external', { url: fallbackTarget });
      }

      const entry = json?.remediation?.entry || null;
      if (entry && selectedFinding?.findingKey) {
        setRemediationOverrides((prev) => ({
          ...prev,
          [selectedFinding.findingKey]: {
            status: String(entry.status || planStatus),
            assignee: String(entry.assignee || planAssignee || ''),
            dueDate: String(entry.dueDate || planDueDate || ''),
            confidence: String(entry.confidence || selectedConfidence),
            history: Array.isArray(entry.history) ? entry.history : [],
          },
        }));
      }
    } catch {
      if (fallbackTarget) {
        onAction?.('open-external', { url: fallbackTarget });
      }
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className={theme.textMuted}>{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onAction?.('export-findings')}
            className={clsx(theme.card, "px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-zinc-800 transition-colors")}
          >
            <Download className="w-4 h-4" /> {t('export')}
          </button>
          <button
            type="button"
            onClick={() => onAction?.('open-view', { view: 'policy' })}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {t('createPolicy')}
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className={clsx(theme.card, "p-2 rounded-xl flex flex-wrap items-center gap-2")}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder={t('filterPlaceholder')} 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 bg-transparent border-none text-sm focus:outline-none"
          />
        </div>
        <div className="h-6 w-[1px] bg-zinc-800 hidden md:block" />
        <FilterButton label={t('severity')} count={filterCounts.severity} onClick={() => { setActiveFilter(activeFilter === 'Severity' ? null : 'Severity'); setCurrentPage(1); }} />
        <FilterButton label={t('team')} count={filterCounts.team} onClick={() => { setActiveFilter(activeFilter === 'Team' ? null : 'Team'); setCurrentPage(1); }} />
        <FilterButton label={t('status')} count={filterCounts.status} onClick={() => { setActiveFilter(activeFilter === 'Status' ? null : 'Status'); setCurrentPage(1); }} />
        <FilterButton label={t('ruleType')} count={filterCounts.ruleType} onClick={() => { setActiveFilter(activeFilter === 'Rule Type' ? null : 'Rule Type'); setCurrentPage(1); }} />
        <div className="ml-auto flex items-center gap-2 pr-2">
          <span className="text-[11px] text-zinc-500 uppercase font-bold tracking-wider">{t('groupBy')}</span>
          <select
            value={searchScope}
            onChange={(e) => { setSearchScope(e.target.value as 'Module' | 'Severity' | 'Team'); setCurrentPage(1); }}
            className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs font-semibold outline-none cursor-pointer"
          >
            <option value="Module">{t('module')}</option>
            <option value="Severity">{t('severity')}</option>
            <option value="Team">{t('team')}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={clsx(theme.card, "rounded-xl overflow-hidden flex-1 flex flex-col")}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold bg-zinc-900/50">
              <tr>
                <th className="px-6 py-4 font-bold border-b border-zinc-800">Finding ID</th>
                <th className="px-6 py-4 font-bold border-b border-zinc-800">Rule & Evidence</th>
                <th className="px-6 py-4 font-bold border-b border-zinc-800">Severity</th>
                <th className="px-6 py-4 font-bold border-b border-zinc-800">Owner</th>
                <th className="px-6 py-4 font-bold border-b border-zinc-800">Area</th>
                <th className="px-6 py-4 font-bold border-b border-zinc-800">Age</th>
                <th className="px-6 py-4 font-bold border-b border-zinc-800 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 text-sm">
              {pagedFindings.map((f: any) => (
                <tr 
                  key={f.id} 
                  className={clsx(
                    "group transition-colors cursor-pointer",
                    selectedFinding?.id === f.id ? "bg-cyan-500/5" : "hover:bg-zinc-800/30"
                  )}
                  onClick={() => setSelectedFinding(f)}
                >
                  <td className="px-6 py-4 font-mono text-xs text-zinc-400">{f.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold">{f.rule}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{f.from && f.to ? `${f.from} -> ${f.to}` : f.area}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold border", getSeverityColor(f.severity))}>
                      {f.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-300">{f.owner}</td>
                  <td className="px-6 py-4 text-zinc-400">{f.area}</td>
                  <td className="px-6 py-4 text-zinc-500">{f.age}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction?.('open-view', { view: 'policy', rule: { id: f.id, inferredRule: f.rule } });
                      }}
                      className="p-1 rounded hover:bg-zinc-800/20"
                      aria-label="Open Policy"
                    >
                      <ChevronRight className="w-4 h-4 text-zinc-700" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                          e.stopPropagation();
                          // Open policy view for this finding's rule
                          onAction?.('open-view', { view: 'policy', rule: { id: f.id, inferredRule: f.rule } });
                        }}
                      className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-500 transition-all"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {pagedFindings.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-zinc-500">
                    {t('noFindings')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-auto p-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <div>{t('showing')} {filteredFindings.length} {t('filtered')}, {findings.length} {t('total')}</div>
          <div className="flex gap-2 items-center">
            <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded border border-zinc-800 hover:bg-zinc-800 disabled:opacity-50">Prev</button>
            <div className="px-3 py-1 rounded border border-zinc-800 bg-zinc-800 text-zinc-200">{currentPage}</div>
            <button type="button" onClick={() => setCurrentPage((p) => p + 1)} className="px-3 py-1 rounded border border-zinc-800 hover:bg-zinc-800">Next</button>
          </div>
        </div>
      </div>

      {/* Detail Drawer Overlay */}
      {selectedFinding && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in flex justify-end">
          <div 
            className="w-full max-w-lg h-full bg-[#141417] border-l border-zinc-800 shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 p-6 bg-[#141417] border-b border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">{selectedFinding.id}</span>
                <h2 className="text-xl font-bold mt-1">{selectedFinding.rule}</h2>
              </div>
              <button onClick={() => setSelectedFinding(null)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              <div className="flex gap-4">
                <div className="flex-1 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Severity</div>
                  <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold border inline-block", getSeverityColor(selectedFinding.severity))}>
                    {selectedFinding.severity}
                  </span>
                </div>
                <div className="flex-1 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Status</div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Clock className="w-3 h-3 text-amber-500" /> {selectedFinding.status}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Description
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {selectedFinding.message || 'Violation details are not available for this item.'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" /> Evidence
                </h3>
                <div className="rounded-xl bg-[#0d0d0e] border border-zinc-800 p-4 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                  <div className="text-zinc-600 mb-2">// {selectedFinding.evidencePath || 'n/a'}</div>
                  <div><span className="text-zinc-500">from</span> <span className="text-emerald-400">{selectedFinding.from || selectedFinding.area}</span></div>
                  <div className="bg-rose-500/10 text-rose-300 -mx-4 px-4 py-0.5"><span className="text-zinc-500">to</span> <span className="text-yellow-400">{selectedFinding.to || 'n/a'}</span></div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onAction?.('open-view', { view: 'dependency', focus: selectedFinding.from || selectedFinding.area }); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onAction?.('open-view', { view: 'dependency', focus: selectedFinding.from || selectedFinding.area }); } }}
                    className="text-zinc-500 mt-4 opacity-50 underline cursor-pointer"
                  >
                    View full dependency graph
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Remediation
                </h3>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 mb-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">{t('actionPlan')}</div>
                    <span className={clsx(
                      'px-2 py-0.5 rounded-full text-[10px] border font-bold',
                      selectedConfidence === 'high' && 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                      selectedConfidence === 'medium' && 'text-amber-400 bg-amber-500/10 border-amber-500/30',
                      selectedConfidence === 'low' && 'text-zinc-400 bg-zinc-800 border-zinc-700'
                    )}>
                      Confidence: {selectedConfidence}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-500">{t('assignee')}</label>
                      <input
                        value={planAssignee}
                        onChange={(e) => setPlanAssignee(e.target.value)}
                        className="w-full mt-1 p-2 rounded border bg-transparent border-zinc-700 text-sm"
                        placeholder="team-architecture"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-500">{t('dueDate')}</label>
                      <input
                        type="date"
                        value={planDueDate ? String(planDueDate).slice(0, 10) : ''}
                        onChange={(e) => setPlanDueDate(e.target.value)}
                        className="w-full mt-1 p-2 rounded border bg-transparent border-zinc-700 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500">Status</label>
                    <div className="mt-1 flex gap-2">
                      {(['open', 'in-progress', 'done'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setPlanStatus(status)}
                          className={clsx(
                            'px-2 py-1 rounded text-xs border transition-colors',
                            planStatus === status ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                          )}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveRemediationPlan}
                      disabled={isSavingPlan}
                      className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-xs font-semibold"
                    >
                      {isSavingPlan ? 'Saving...' : t('savePlan')}
                    </button>
                    <button
                      type="button"
                      onClick={openIssueForFinding}
                      className="px-3 py-1.5 rounded border border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold"
                    >
                      {t('createIssue')}
                    </button>
                  </div>
                </div>
                <ul className="space-y-3">
                  {getRemediationSteps(selectedFinding).map((step) => (
                    <RemediationStep key={step} text={step} />
                  ))}
                </ul>
                <div className="mt-4 rounded-xl bg-zinc-900/70 border border-zinc-800 p-3">
                  <div className="text-[11px] text-zinc-500 uppercase font-bold tracking-wider mb-2">{t('progressHistory')}</div>
                  {selectedHistory.length === 0 ? (
                    <div className="text-xs text-zinc-500">{t('noRemediation')}</div>
                  ) : (
                    <ul className="space-y-2">
                      {selectedHistory.slice(-5).reverse().map((item: any, idx: number) => (
                        <li key={`${item.at || idx}-${idx}`} className="text-xs text-zinc-400">
                          <span className="text-zinc-500">{String(item.at || '').replace('T', ' ').slice(0, 16) || 'n/a'}</span>
                          {' · '}
                          <span className="text-zinc-200">{item.status || 'open'}</span>
                          {' · '}
                          <span>{item.assignee || 'unassigned'}</span>
                          {item.dueDate ? ` · due ${String(item.dueDate).slice(0, 10)}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-800 flex gap-3">
                <button
                  type="button"
                  onClick={() => onAction?.('assign-finding', { finding: selectedFinding })}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl transition-all"
                >
                  Assign to Team
                </button>
                <button
                  type="button"
                  onClick={() => onAction?.('ignore-finding', { finding: selectedFinding })}
                  className="flex-1 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-bold py-2.5 rounded-xl transition-all"
                >
                  Ignore Finding
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getRemediationSteps(finding: any): string[] {
  const ruleText = String(finding?.rule || finding?.type || '').toLowerCase();
  const owner = String(finding?.owner || 'Unassigned');
  const from = String(finding?.from || finding?.area || 'source module');
  const toRaw = typeof finding?.to === 'string' ? finding.to.trim() : '';
  const hasTo = toRaw.length > 0;
  const to = hasTo ? toRaw : '';
  const area = String(finding?.area || from);
  const ruleLabel = String(finding?.rule || finding?.type || 'policy rule');
  const relation = hasTo ? `${from} -> ${to}` : from;

  if (ruleText.includes('cyclic')) {
    return [
      `Break the cycle around ${area} by extracting shared contracts into a separate boundary module.`,
      hasTo
        ? `Replace direct imports between ${from} and ${to} with events or interfaces.`
        : `Replace direct imports in ${from} with events or interfaces where boundaries are crossed.`,
      `Assign follow-up to ${owner} and add a guard rule that blocks this direction in future PRs.`,
    ];
  }

  if (ruleText.includes('forbidden') || ruleText.includes('dependency') || ruleText.includes('layer')) {
    return [
      `Move ${relation} to an allowed layer or introduce an adapter at the boundary.`,
      hasTo
        ? `Refactor call sites in ${from} to depend on abstractions instead of concrete ${to} implementation.`
        : `Refactor call sites in ${from} to depend on abstractions instead of concrete implementation details.`,
      `Confirm ownership with ${owner} and track this violation under ${ruleLabel} until resolved.`,
    ];
  }

  if (ruleText.includes('secret') || ruleText.includes('token') || ruleText.includes('credential')) {
    return [
      `Remove hardcoded credentials from ${area} and rotate exposed keys immediately.`,
      `Load secrets for ${area} from a managed secret store through environment injection.`,
      `Assign validation to ${owner} and enforce secret scanning in CI to prevent reintroduction.`,
    ];
  }

  if (ruleText.includes('deprecated') || ruleText.includes('api')) {
    return [
      `Replace deprecated API usage found in ${area} with supported alternatives from the migration guide.`,
      `Add compatibility tests around ${from} integration points before rollout.`,
      `Create a phased migration task for ${owner} and track closure of ${ruleLabel}.`,
    ];
  }

  return [
    `Confirm ownership (${owner}) and create a remediation task for ${ruleLabel}.`,
    `Reduce coupling around ${from} by isolating the violating dependency behind a clear boundary.`,
    `Tighten policy checks so violations in ${area} cannot be merged again.`,
  ];
}

function buildFindingKey(finding: any): string {
  const payload = {
    ruleId: finding?.rule || finding?.type || finding?.id || '',
    type: finding?.type || '',
    moduleId: finding?.area || finding?.moduleId || '',
    from: finding?.from || '',
    to: finding?.to || '',
    message: finding?.message || '',
  };
  const json = JSON.stringify(payload);
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(json).replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }
  return json;
}

function deriveRemediationConfidence(finding: any, plan?: { assignee?: string; dueDate?: string }): 'high' | 'medium' | 'low' {
  const rule = String(finding?.rule || finding?.type || '').toLowerCase();
  const hasFrom = String(finding?.from || finding?.area || '').trim().length > 0;
  const hasTo = String(finding?.to || '').trim().length > 0;
  const hasOwner = String(plan?.assignee || finding?.remediationAssignee || finding?.owner || '').trim().length > 0;
  const hasDueDate = String(plan?.dueDate || finding?.remediationDueDate || '').trim().length > 0;

  const deterministicRule = rule.includes('cyclic') || rule.includes('dependency') || rule.includes('layer') || rule.includes('forbidden');
  const sensitiveRule = rule.includes('secret') || rule.includes('token') || rule.includes('credential');

  if ((deterministicRule || sensitiveRule) && hasFrom && hasOwner && (hasTo || sensitiveRule)) return 'high';
  if (hasFrom && hasOwner) return 'medium';
  if (hasOwner || hasDueDate) return 'medium';
  return 'low';
}

function buildIssueTargets(data: UiBootstrapData | undefined, finding: any): { githubUrl: string | null; jiraUrl: string | null } {
  const title = `[ARCHGUARD] ${finding?.severity || 'Unknown'}: ${finding?.rule || finding?.id || 'Finding'}`;
  const body = [
    `Finding ID: ${finding?.id || 'n/a'}`,
    `Rule: ${finding?.rule || 'n/a'}`,
    `Severity: ${finding?.severity || 'n/a'}`,
    `Owner: ${finding?.owner || 'Unassigned'}`,
    `Area: ${finding?.area || 'n/a'}`,
    `From: ${finding?.from || 'n/a'}`,
    `To: ${finding?.to || 'n/a'}`,
    '',
    `Description: ${finding?.message || 'Violation detected'}`,
  ].join('\n');

  const repo = String(data?.context?.repository || '').trim();
  const githubUrl = repo
    ? `https://github.com/${repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
    : null;

  const jiraBase = String(data?.context?.jiraBaseUrl || '').trim().replace(/\/$/, '');
  const jiraUrl = jiraBase
    ? `${jiraBase}/secure/CreateIssueDetails!init.jspa?summary=${encodeURIComponent(title)}&description=${encodeURIComponent(body)}`
    : null;

  return { githubUrl, jiraUrl };
}

function FilterButton({ label, count, onClick }: any) {
  return (
    <button type="button" onClick={onClick} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 flex items-center gap-2 border border-zinc-800 transition-all">
      {label}
      {count && <span className="bg-cyan-500/20 text-cyan-400 px-1.5 rounded-md text-[10px]">{count}</span>}
      <ChevronRight className="w-3 h-3 rotate-90" />
    </button>
  );
}

function RemediationStep({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 group">
      <div className="mt-1 w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-cyan-500/20 transition-colors">
        <CheckCircle2 className="w-3 h-3 text-zinc-500 group-hover:text-cyan-400" />
      </div>
      <span className="text-sm text-zinc-400 leading-tight">{text}</span>
    </li>
  );
}
