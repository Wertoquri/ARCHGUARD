import React, { useEffect, useState, useRef } from 'react';
import ConfirmModal from './modals/ConfirmModal';
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  MoreVertical, 
  Code2, 
  Play, 
  Save, 
  History,
  AlertCircle,
  CheckCircle2,
  Settings2,
  ChevronRight,
  Database,
  Layers
} from 'lucide-react';
import { clsx } from 'clsx';
import type { UiBootstrapData } from '../App';

interface PolicyStudioProps {
  theme: any;
  data?: UiBootstrapData;
  onAction?: (action: string, payload?: any) => void;
  panel?: string | null;
  focusRule?: any | null;
  language?: 'en' | 'uk';
  onClosePanel?: () => void;
}

export function PolicyStudio({ theme, data, onAction, panel = null, focusRule = null, language = 'en', onClosePanel }: PolicyStudioProps) {
  const [localPanel, setLocalPanel] = useState<string | null>(panel || null);

  useEffect(() => {
    setLocalPanel(panel || null);
    if (panel === 'editor') {
      setActiveTab('editor');
    }
  }, [panel]);

  const closePanel = () => {
    setLocalPanel(null);
    if (onClosePanel) onClosePanel();
  };
  const [activeTab, setActiveTab] = useState('rules');
  const [policies, setPolicies] = useState<any[]>([]);
  const saveEnabled = data?.context?.saveEnabled !== false;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuAction, setMenuAction] = useState<{ pack?: string; action?: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; file?: string; displayName?: string }>({ open: false });
  const [archives, setArchives] = useState<any[]>([]);
  const [showChangelog, setShowChangelog] = useState<boolean>(false);
  const [changelogEntries, setChangelogEntries] = useState<any[]>([]);
  const [changelogOpen, setChangelogOpen] = useState<boolean>(false);
  const [changelogPack, setChangelogPack] = useState<any | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<{ open: boolean; archived?: string; displayName?: string }>({ open: false });
  const [confirmOpenAdd, setConfirmOpenAdd] = useState<{ open: boolean }>({ open: false });
  const [newMenuOpen, setNewMenuOpen] = useState<boolean>(false);
  const newMenuRef = useRef<HTMLDivElement | null>(null);
  const [editorRaw, setEditorRaw] = useState<string>('');
  const [editorFileName, setEditorFileName] = useState<string>('examples/policy.yaml');
  const [editorPolicyName, setEditorPolicyName] = useState<string>('Current Policy');
  const [showFullEditor, setShowFullEditor] = useState<boolean>(false);
  const focusedRuleText = String(focusRule?.inferredRule || focusRule?.id || '').trim();
  const [policyHistoryEntries, setPolicyHistoryEntries] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStatus, setHistoryStatus] = useState<string>('');
  const [restoringBackup, setRestoringBackup] = useState<string | null>(null);
  const i18n = {
    title: { en: 'Policy Studio', uk: 'Студія політик' },
    subtitle: { en: 'Define and simulate governance rules for your architecture', uk: 'Визначайте та симулюйте governance-правила для вашої архітектури' },
    history: { en: 'History', uk: 'Історія' },
    newPolicy: { en: 'New Policy', uk: 'Нова політика' },
    newBlankRule: { en: 'New Blank Rule', uk: 'Нове порожнє правило' },
    uploadPolicyPack: { en: 'Upload Policy Pack', uk: 'Завантажити policy pack' },
    policyLibrary: { en: 'Policy Library', uk: 'Бібліотека політик' },
    ruleEditor: { en: 'Rule Editor', uk: 'Редактор правил' },
    simulations: { en: 'Simulations', uk: 'Симуляції' },
    opening: { en: 'Opening…', uk: 'Відкриття…' },
    openPack: { en: 'Open Pack', uk: 'Відкрити pack' },
    simulating: { en: 'Simulating…', uk: 'Симуляція…' },
    simulate: { en: 'Simulate', uk: 'Симулювати' },
    deletePack: { en: 'Delete Pack', uk: 'Видалити pack' },
    rulesActive: { en: 'Rules active', uk: 'Активних правил' },
    impact: { en: 'Impact', uk: 'Вплив' },
    high: { en: 'High', uk: 'Високий' },
    medium: { en: 'Medium', uk: 'Середній' },
    active: { en: 'Active', uk: 'Активна' },
    simulation: { en: 'Simulation', uk: 'Симуляція' },
    pack: { en: 'Pack', uk: 'Пакет' },
    addPolicyPack: { en: 'Add Policy Pack', uk: 'Додати policy pack' },
    archivedPacks: { en: 'Archived Packs', uk: 'Архівні pack-и' },
    archivedAt: { en: 'Archived', uk: 'Архівовано' },
    archivePolicyPack: { en: 'Archive Policy Pack', uk: 'Архівувати policy pack' },
    moveToArchive: { en: 'Move pack to archive?', uk: 'Перемістити pack в архів?' },
    archive: { en: 'Archive', uk: 'Архівувати' },
    cancel: { en: 'Cancel', uk: 'Скасувати' },
    addPolicyPackPrompt: { en: 'Open Add Policy Pack panel? You can upload a YAML pack from here.', uk: 'Відкрити панель додавання policy pack? Тут можна завантажити YAML pack.' },
    open: { en: 'Open', uk: 'Відкрити' },
    restoreArchivedPack: { en: 'Restore Archived Pack', uk: 'Відновити архівний pack' },
    restoreArchivedPrompt: { en: 'Restore archived pack?', uk: 'Відновити архівний pack?' },
    loading: { en: 'Loading...', uk: 'Завантаження...' },
    notAvailable: { en: 'n/a', uk: 'н/д' },
    uploadPackHint: { en: 'Upload a policy pack YAML to add rules.', uk: 'Завантажте YAML policy pack, щоб додати правила.' },
    uploading: { en: 'Uploading…', uk: 'Завантаження…' },
    upload: { en: 'Upload', uk: 'Завантажити' },
    clear: { en: 'Clear', uk: 'Очистити' },
    selected: { en: 'Selected', uk: 'Вибрано' },
    uploadSuccessful: { en: 'Upload successful.', uk: 'Завантаження успішне.' },
    editorPrefs: { en: 'Editor preferences can be configured here.', uk: 'Тут можна налаштувати параметри редактора.' },
    lastAnalysis: { en: 'Last analysis', uk: 'Останній аналіз' },
    noRecentAnalysis: { en: 'No recent analysis metadata', uk: 'Немає метаданих недавнього аналізу' },
    policySourceUnavailable: { en: 'Policy source is unavailable.', uk: 'Джерело policy недоступне.' },
    quickSimulationHint: { en: 'Apply this rule against your current codebase to see projected impact.', uk: 'Застосуйте це правило до поточного кодбейзу, щоб побачити прогнозований вплив.' },
    projectedViolations: { en: 'Projected Violations', uk: 'Прогнозовані порушення' },
    ruleParameters: { en: 'Rule Parameters', uk: 'Параметри правил' },
    enforcementMode: { en: 'Enforcement Mode', uk: 'Режим застосування' },
    blockPr: { en: 'Block PR (Hard)', uk: 'Блокувати PR (Hard)' },
    warnPr: { en: 'Warn PR (Soft)', uk: 'Попереджати PR (Soft)' },
    silentLogging: { en: 'Silent Logging', uk: 'Тихе логування' },
    exclusionPatterns: { en: 'Exclusion Patterns', uk: 'Патерни виключень' },
    exclusionPlaceholder: { en: 'e.g. tests/**, scripts/**', uk: 'наприклад, tests/**, scripts/**' },
    scenarioMatrix: { en: 'Scenario Matrix', uk: 'Матриця сценаріїв' },
    run: { en: 'Run', uk: 'Запустити' },
    noPacksFound: { en: 'No policy packs found. Upload a YAML pack in Policy Library to enable scenario simulations.', uk: 'Policy pack-и не знайдено. Завантажте YAML pack у Policy Library, щоб увімкнути сценарні симуляції.' },
    runWorkspaceAnalysis: { en: 'Run Current Workspace Analysis', uk: 'Запустити аналіз поточного workspace' },
    runWorkspaceHint: { en: 'Recalculate findings and compare impact before rollout.', uk: 'Перерахуйте findings і порівняйте вплив перед rollout.' },
    runSimulationAnalysis: { en: 'Run Simulation Analysis', uk: 'Запустити аналіз симуляції' },
    simulationTips: { en: 'Simulation Tips', uk: 'Поради для симуляції' },
    tip1: { en: 'Start from the highest-risk pack in your list.', uk: 'Починайте з pack-у з найвищим ризиком у списку.' },
    tip2: { en: 'Review deltas in high/critical counts first.', uk: 'Спочатку перевіряйте зміни у high/critical показниках.' },
    tip3: { en: 'Promote only rules with clear ownership mapping.', uk: 'Просувайте лише правила з чітким ownership mapping.' },
    saveRule: { en: 'Save Rule', uk: 'Зберегти правило' },
    saveRuleDisabled: { en: 'Saving disabled by server policy', uk: 'Збереження вимкнене політикою сервера' },
    focusedFromFindings: { en: 'Focused from Findings', uk: 'Фокус із Findings' },
    linesHidden: { en: 'more lines are hidden', uk: 'додаткових рядків приховано' },
    collapseCode: { en: 'Collapse code', uk: 'Згорнути код' },
    openFullCode: { en: 'Open full code', uk: 'Відкрити повний код' },
    quickSimulation: { en: 'Quick Simulation', uk: 'Швидка симуляція' },
    runAnalysis: { en: 'Run Full Analysis', uk: 'Запустити повний аналіз' },
    policyHistoryTitle: { en: 'Policy History', uk: 'Історія політик' },
    addPackTitle: { en: 'Add Policy Pack', uk: 'Додати policy pack' },
    editorSettingsTitle: { en: 'Editor Settings', uk: 'Налаштування редактора' },
    noHistory: { en: 'No policy history available.', uk: 'Історія політик відсутня.' },
    currentPolicy: { en: 'Current policy', uk: 'Поточна політика' },
    restore: { en: 'Restore', uk: 'Відновити' },
    restoring: { en: 'Restoring...', uk: 'Відновлення...' },
    close: { en: 'Close', uk: 'Закрити' },
    rollbackDone: { en: 'Policy restored from backup successfully.', uk: 'Політику успішно відновлено з backup.' },
    rollbackActiveFile: { en: 'Active file', uk: 'Активний файл' },
    rollbackFailed: { en: 'Failed to restore policy backup.', uk: 'Не вдалося відновити backup політики.' },
    versions: { en: 'Versions', uk: 'Версії' },
    changelogTitle: { en: 'Changelog', uk: 'Журнал змін' },
    changelogEmpty: { en: 'No changelog available for this pack.', uk: 'Журнал змін відсутній для цього pack-а.' },
  } as const;
  const t = (key: keyof typeof i18n) => i18n[key][language];

  const policyDisplayName = (policy: any) => {
    if (String(policy?.file || '') === 'examples/policy.yaml') return t('currentPolicy');
    return String(policy?.name || t('currentPolicy'));
  };

  const statusLabel = (status: string) => {
    if (status === 'Active') return t('active');
    if (status === 'Simulation') return t('simulation');
    if (status === 'Pack') return t('pack');
    return status;
  };

  const impactLabel = (impact: string) => {
    if (impact === 'High') return t('high');
    if (impact === 'Medium') return t('medium');
    return impact;
  };

  async function loadPolicySource(file?: string | null, displayName?: string) {
    const selectedFile = String(file || 'examples/policy.yaml').trim();
    const qs = selectedFile ? `?file=${encodeURIComponent(selectedFile)}` : '';
    const res = await fetch(`/api/policy${qs}`).catch(() => null);
    if (!res || !res.ok) return;
    const json = await res.json();
    if (typeof json?.raw === 'string') {
      setEditorRaw(json.raw);
      setEditorFileName(String(json?.file || selectedFile));
      setEditorPolicyName(displayName || (selectedFile === 'examples/policy.yaml' ? t('currentPolicy') : selectedFile));
      setShowFullEditor(false);
      setActiveTab('editor');
    }
  }

  async function refreshPolicies() {
    try {
      const [policyJson, packsJson] = await Promise.all([
        fetch('/api/policy').then((res) => res.ok ? res.json() : null).catch(() => null),
        fetch('/api/policy/packs').then((res) => res.ok ? res.json() : null).catch(() => null),
      ]);

      const currentRules = Array.isArray(policyJson?.policy?.rules) ? policyJson.policy.rules.length : 0;
      const packRows = Array.isArray(packsJson?.packs) ? packsJson.packs : [];

      if (typeof policyJson?.raw === 'string') {
        setEditorRaw(policyJson.raw);
        setEditorFileName(String(policyJson?.file || 'examples/policy.yaml'));
        setEditorPolicyName(t('currentPolicy'));
      }

      const mapped = [
        { name: t('currentPolicy'), file: 'examples/policy.yaml', rules: currentRules, status: 'Active', impact: 'High' },
        ...packRows.map((pack: any) => ({
          name: pack.name,
          file: pack.path || pack.file,
          rules: Number(pack.rules || 0),
          status: 'Pack',
          impact: Number(pack.rules || 0) > 15 ? 'High' : 'Medium',
          version: pack.version || '0.0.1',
          description: pack.description || '',
          changelog: Array.isArray(pack.changelog) ? pack.changelog : [],
          modifiedAt: pack.modifiedAt || 0,
        })),
      ];

      setPolicies(mapped);
    } catch (e) {
      // ignore
    }
  }
  useEffect(() => {
    let active = true;

    Promise.all([
      fetch('/api/policy').then((res) => res.ok ? res.json() : null).catch(() => null),
      fetch('/api/policy/packs').then((res) => res.ok ? res.json() : null).catch(() => null),
    ]).then(([policyJson, packsJson]) => {
      if (!active) return;
      const currentRules = Array.isArray(policyJson?.policy?.rules) ? policyJson.policy.rules.length : 0;
      const packRows = Array.isArray(packsJson?.packs) ? packsJson.packs : [];

      if (typeof policyJson?.raw === 'string') {
        setEditorRaw(policyJson.raw);
        setEditorFileName(String(policyJson?.file || 'examples/policy.yaml'));
        setEditorPolicyName(t('currentPolicy'));
      }

      const mapped = [
        { name: t('currentPolicy'), file: 'examples/policy.yaml', rules: currentRules, status: 'Active', impact: 'High' },
        ...packRows.map((pack: any) => ({
          name: pack.name,
          file: pack.path || pack.file,
          rules: Number(pack.rules || 0),
          status: 'Pack',
          impact: Number(pack.rules || 0) > 15 ? 'High' : 'Medium',
          version: pack.version || '0.0.1',
          description: pack.description || '',
          changelog: Array.isArray(pack.changelog) ? pack.changelog : [],
          modifiedAt: pack.modifiedAt || 0,
        })),
      ];

      setPolicies(mapped);
    });

    return () => {
      active = false;
    };
  }, [language]);

  useEffect(() => {
    if (!focusedRuleText) return;
    setActiveTab('editor');
    setShowFullEditor(true);
  }, [focusedRuleText]);

  useEffect(() => {
    if (localPanel !== 'history') return;
    let active = true;
    setHistoryLoading(true);
    setHistoryStatus('');
    fetch('/api/policy/history')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load policy history'))))
      .then((json) => {
        if (!active) return;
        setPolicyHistoryEntries(Array.isArray(json?.entries) ? json.entries : []);
      })
      .catch(() => {
        if (!active) return;
        setPolicyHistoryEntries([]);
      })
      .finally(() => {
        if (!active) return;
        setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [localPanel]);

  const editorLines = (editorRaw || '').split('\n');
  const previewLineLimit = 80;
  const hasHiddenEditorLines = editorLines.length > previewLineLimit;
  const displayedEditorLines = showFullEditor ? editorLines : editorLines.slice(0, previewLineLimit);

  function wrapCodeLine(line: string, maxChars = 96): string[] {
    if (!line) return [''];
    if (line.length <= maxChars) return [line];
    const chunks: string[] = [];
    for (let index = 0; index < line.length; index += maxChars) {
      chunks.push(line.slice(index, index + maxChars));
    }
    return chunks;
  }
  const editorUpdatedLabel = data?.findings?.summary?.generatedAt
    ? new Date(String(data.findings.summary.generatedAt)).toLocaleString()
    : null;
  const projectedViolations = Number(data?.findings?.summary?.totalViolations || 0);
  const projectedPercent = Math.max(0, Math.min(100, Math.round((projectedViolations / 200) * 100)));
  const simulationPacks = policies.filter((policy) => policy?.status === 'Pack' && typeof policy?.file === 'string' && policy.file.trim() !== '');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError(null);
    setUploadSuccess(false);
    const f = e.target.files?.[0] || null;
    setSelectedFile(f);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile, selectedFile.name);
      const res = await fetch('/api/policy/packs/upload-with-version', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const txt = json?.error || await res.text().catch(() => '');
        setUploadError(`Upload failed: ${res.status} ${txt}`);
      } else if (!json?.ok) {
        setUploadError(json?.error || 'Upload failed');
      } else {
        setUploadSuccess(true);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        // show changelog modal if meta returned
        if (json?.meta) {
          setChangelogPack(json.meta);
          setChangelogOpen(true);
        }
        await refreshPolicies();
        await refreshArchive();
      }
    } catch (e: any) {
      setUploadError(e?.message || String(e));
    } finally {
      setUploading(false);
    }
  }

  async function refreshArchive() {
    try {
      const res = await fetch('/api/policy/packs/archive');
      if (!res.ok) return;
      const j = await res.json();
      setArchives(Array.isArray(j?.archives) ? j.archives : []);
    } catch (e) {
      // ignore
    }
  }

  const openChangelogForPack = (p: any) => {
    setChangelogPack(p);
    setChangelogOpen(true);
  };

  // close menu when clicking outside
  useEffect(() => {
    if (!openMenu) return;
    function handler(e: Event) {
      try {
        const target = (e as any).target as Node;
        if (menuRef.current && menuRef.current.contains(target)) return;
        const toggleBtn = document.querySelector(`[data-menu-toggle="${openMenu}"]`);
        if (toggleBtn && toggleBtn.contains(target)) return;
        setOpenMenu(null);
      } catch (err) {
        setOpenMenu(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenMenu(null);
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenu]);

  // close New menu when clicking outside
  useEffect(() => {
    if (!newMenuOpen) return;
    function handler(e: Event) {
      try {
        const target = (e as any).target as Node;
        if (newMenuRef.current && newMenuRef.current.contains(target)) return;
        setNewMenuOpen(false);
      } catch (err) {
        setNewMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setNewMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [newMenuOpen]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className={theme.textMuted}>{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAction?.('open-view', { view: 'policy', sub: 'history' })}
              className={clsx(theme.card, "px-3 py-2 rounded-lg text-sm flex items-center gap-2")}
            >
              <History className="w-4 h-4" /> {t('history')}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setNewMenuOpen((s) => !s); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> {t('newPolicy')}
              </button>
              {newMenuOpen && (
                <div ref={newMenuRef} className="absolute right-0 mt-2 w-44 rounded-lg shadow-2xl p-2 z-50 bg-[#0d0d0e] border border-zinc-800">
                  <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-zinc-800/40" onClick={() => { onAction?.('save-rule', { rule: {} }); setNewMenuOpen(false); }}>{t('newBlankRule')}</button>
                  <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-zinc-800/40" onClick={() => { setConfirmOpenAdd({ open: true }); setNewMenuOpen(false); }}>{t('uploadPolicyPack')}</button>
                </div>
              )}
            </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-zinc-800">
        <TabButton active={activeTab === 'rules'} onClick={() => setActiveTab('rules')} label={t('policyLibrary')} />
        <TabButton active={activeTab === 'editor'} onClick={() => setActiveTab('editor')} label={t('ruleEditor')} />
        <TabButton active={activeTab === 'simulate'} onClick={() => setActiveTab('simulate')} label={t('simulations')} />
      </div>

      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(policies.length > 0 ? policies : [{ name: t('currentPolicy'), rules: 12, status: 'Active', impact: 'High' }]).map((p) => (
            <div key={p.name} className={clsx(theme.card, "p-5 rounded-2xl flex flex-col group hover:border-zinc-600 transition-all relative")}>
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-zinc-800 group-hover:bg-indigo-500/20 transition-colors">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="relative">
                  <button type="button" data-menu-toggle={p.name} onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === p.name ? null : p.name); }} className="text-zinc-600 hover:text-zinc-400">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openMenu === p.name && (
                    <div ref={menuRef} className="absolute right-0 mt-2 w-40 rounded-lg shadow-2xl p-2 z-50 bg-[#0d0d0e] border border-zinc-800" role="menu">
                      <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-zinc-800/40 active:bg-zinc-700" onClick={() => { setMenuAction({ pack: p.name, action: 'open' }); loadPolicySource(p.file || 'examples/policy.yaml', policyDisplayName(p)); setOpenMenu(null); setTimeout(() => setMenuAction(null), 800); }}> {menuAction && menuAction.pack === p.name && menuAction.action === 'open' ? t('opening') : t('openPack')}</button>
                      <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-zinc-800/40 active:bg-zinc-700" onClick={() => { setMenuAction({ pack: p.name, action: 'simulate' }); onAction?.('run-analysis', { file: p.file || 'examples/policy.yaml', pack: policyDisplayName(p) }); setOpenMenu(null); setTimeout(() => setMenuAction(null), 800); }}>{menuAction && menuAction.pack === p.name && menuAction.action === 'simulate' ? t('simulating') : t('simulate')}</button>
                      <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-zinc-800/40 active:bg-zinc-700" onClick={() => { setOpenMenu(null); openChangelogForPack(p); }}>{t('versions')}</button>
                      <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-rose-800/40 text-rose-400" onClick={() => { setConfirmDelete({ open: true, file: p.file, displayName: policyDisplayName(p) }); setOpenMenu(null); }}>{t('deletePack')}</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg mb-1">{policyDisplayName(p)}</h3>
                  {p.description ? <div className="text-xs text-zinc-500 mb-2">{p.description}</div> : null}
                  <p className="text-xs text-zinc-500 mb-2">{p.rules} {t('rulesActive')} • {impactLabel(String(p.impact || ''))} {t('impact')}</p>
                </div>
                <div className="text-xs text-zinc-500">v{p.version || '0.0.1'}</div>
              </div>
              
              <div className="mt-auto flex items-center justify-between">
                <span className={clsx(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                  p.status === 'Active' ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" :
                  p.status === 'Simulation' ? "text-amber-500 border-amber-500/20 bg-amber-500/5" :
                  "text-zinc-500 border-zinc-800"
                )}>
                  {statusLabel(String(p.status || ''))}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    loadPolicySource(p.file || 'examples/policy.yaml', policyDisplayName(p));
                  }}
                  className="p-1 rounded hover:bg-zinc-800/20"
                  aria-label={p.file ? `${t('open')} ${policyDisplayName(p)}` : t('openPack')}
                >
                  <ChevronRight className="w-4 h-4 text-zinc-700" />
                </button>
              </div>
            </div>
          ))}
          <div
            className="border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center hover:border-zinc-700 transition-colors cursor-pointer"
            onClick={() => setConfirmOpenAdd({ open: true })}
          >
            <div className="p-3 rounded-full bg-zinc-900 mb-4">
              <Plus className="w-6 h-6 text-zinc-500" />
            </div>
            <p className="text-sm font-bold text-zinc-500">{t('addPolicyPack')}</p>
          </div>
        </div>
      )}

      {/* Archived packs listing */}
      {archives.length > 0 && (
        <div className="pt-4">
          <h3 className="text-sm font-bold text-zinc-400 mb-3">{t('archivedPacks')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {archives.map((a) => (
              <div key={a.file} className={clsx(theme.card, 'p-4 rounded-xl flex flex-col justify-between')}>
                <div>
                  <div className="text-sm font-bold">{a.originalName}</div>
                  <div className="text-xs text-zinc-500">{t('archivedAt')}: {a.archivedAt ? new Date(a.archivedAt).toLocaleString() : a.file}</div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button className="px-3 py-1.5 rounded text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => setConfirmRestore({ open: true, archived: a.file, displayName: a.originalName })}>{t('restore')}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDelete.open}
        title={t('archivePolicyPack')}
        message={confirmDelete.displayName ? `${t('archivePolicyPack')}: "${confirmDelete.displayName}"?` : t('moveToArchive')}
        onClose={() => setConfirmDelete({ open: false })}
        onConfirm={() => { if (confirmDelete.file) onAction?.('delete-pack', { name: confirmDelete.file }); }}
        confirmLabel={t('archive')}
        cancelLabel={t('cancel')}
      />

      <ConfirmModal
        open={confirmOpenAdd.open}
        title={t('addPolicyPack')}
        message={t('addPolicyPackPrompt')}
        onClose={() => setConfirmOpenAdd({ open: false })}
        onConfirm={() => { setLocalPanel('add-pack'); setConfirmOpenAdd({ open: false }); }}
        confirmLabel={t('open')}
        cancelLabel={t('cancel')}
      />

      <ConfirmModal
        open={confirmRestore.open}
        title={t('restoreArchivedPack')}
        message={confirmRestore.displayName ? `${t('restoreArchivedPack')}: "${confirmRestore.displayName}"?` : t('restoreArchivedPrompt')}
        onClose={() => setConfirmRestore({ open: false })}
        onConfirm={() => {
          (async () => {
            try {
              const archived = confirmRestore.archived;
              if (!archived) return;
              const res = await fetch('/api/policy/packs/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ archived }),
                credentials: 'same-origin',
              });
              if (res.ok) {
                await refreshPolicies();
                await refreshArchive();
              }
            } catch (e) {
              // ignore
            }
          })();
          setConfirmRestore({ open: false });
        }}
        confirmLabel={t('restore')}
        cancelLabel={t('cancel')}
      />

      {changelogOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
          <div className={clsx(theme.card, 'w-full max-w-lg p-6 rounded-xl border border-zinc-800')}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('changelogTitle')}{changelogPack?.name ? ` - ${changelogPack.name}` : ''}</h3>
              <button className="text-zinc-400 hover:text-zinc-200" onClick={() => { setChangelogOpen(false); setChangelogPack(null); }}>✕</button>
            </div>
            <div className="space-y-3 text-sm text-zinc-400">
              {Array.isArray(changelogPack?.changelog) && changelogPack.changelog.length > 0 ? (
                <ul className="space-y-2">
                  {changelogPack.changelog.map((entry: any, idx: number) => (
                    <li key={idx} className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
                      <div className="text-xs text-zinc-500">{entry.date ? new Date(entry.date).toLocaleString() : ''}</div>
                      <div className="font-semibold text-zinc-200">{entry.version || ''}</div>
                      <div className="text-zinc-400 text-xs mt-1">{entry.message || entry.desc || entry.changelog || ''}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-zinc-500">{t('changelogEmpty')}</div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button className="px-4 py-2 rounded bg-zinc-800 text-white" onClick={() => { setChangelogOpen(false); setChangelogPack(null); }}>{t('close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* simple modal for panels: history / add-pack / editor-settings */}
      {localPanel && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
          <div className={clsx(theme.card, 'w-full max-w-2xl p-6 rounded-xl border border-zinc-800') }>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{localPanel === 'history' ? t('policyHistoryTitle') : localPanel === 'add-pack' ? t('addPackTitle') : t('editorSettingsTitle')}</h3>
              <button className="text-zinc-400 hover:text-zinc-200" onClick={closePanel}>✕</button>
            </div>
            <div className="space-y-4">
              {localPanel === 'history' && (
                <div className="space-y-3">
                  {historyLoading ? (
                    <div className="text-sm text-zinc-500">{t('loading')}</div>
                    ) : policyHistoryEntries.length > 0 ? (
                    <ul className="space-y-2 text-xs text-zinc-400 max-h-64 overflow-auto pr-2">
                      {policyHistoryEntries.map((entry: any) => (
                        <li key={entry.file} className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-zinc-200">{entry.type === 'current' ? t('currentPolicy') : entry.file}</div>
                            <div className="text-zinc-500">{entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : t('notAvailable')} · {Number(entry.size || 0)} bytes</div>
                          </div>
                          {entry.type === 'backup' ? (
                            <button
                              type="button"
                              disabled={restoringBackup === entry.file}
                              onClick={async () => {
                                setRestoringBackup(entry.file);
                                setHistoryStatus('');
                                try {
                                  const res = await fetch('/api/policy/history/restore', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ backupFile: entry.file }),
                                  });
                                  const json = await res.json();
                                  if (!res.ok || !json?.ok) throw new Error(json?.error || 'Restore failed');

                                  await refreshPolicies();
                                  const historyRes = await fetch('/api/policy/history');
                                  if (historyRes.ok) {
                                    const historyJson = await historyRes.json();
                                    setPolicyHistoryEntries(Array.isArray(historyJson?.entries) ? historyJson.entries : []);
                                  }
                                  const activeFile = String(json?.activeFile || 'examples/policy.yaml');
                                  setHistoryStatus(`${t('rollbackDone')} ${t('rollbackActiveFile')}: ${activeFile}`);
                                } catch {
                                  setHistoryStatus(t('rollbackFailed'));
                                } finally {
                                  setRestoringBackup(null);
                                }
                              }}
                              className="px-2.5 py-1 rounded border border-emerald-600/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60"
                            >
                              {restoringBackup === entry.file ? t('restoring') : t('restore')}
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-zinc-500">{t('noHistory')}</div>
                  )}
                  {historyStatus ? <div className="text-xs text-zinc-400">{historyStatus}</div> : null}
                </div>
              )}
              {localPanel === 'add-pack' && (
                <div>
                  <p className="text-sm text-zinc-500 mb-3">{t('uploadPackHint')}</p>
                  <div className="flex items-center gap-2">
                    <input ref={fileInputRef} type="file" accept=".yaml,.yml" className="text-xs" onChange={(e) => handleFileChange(e)} />
                    <button
                      type="button"
                      onClick={() => handleUpload()}
                      disabled={!selectedFile || uploading}
                      className={clsx(
                        "px-3 py-1.5 rounded text-sm font-medium bg-cyan-600 text-white",
                        !selectedFile || uploading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-cyan-500'
                      )}
                    >
                      {uploading ? t('uploading') : t('upload')}
                    </button>
                    <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="px-2 py-1 rounded bg-zinc-700 text-white text-sm">{t('clear')}</button>
                  </div>
                  {selectedFile && <div className="mt-2 text-xs text-zinc-400">{t('selected')}: {selectedFile.name}</div>}
                  {uploadError && <div className="mt-2 text-xs text-rose-400">{uploadError}</div>}
                  {uploadSuccess && <div className="mt-2 text-xs text-emerald-400">{t('uploadSuccessful')}</div>}
                </div>
              )}
              {localPanel === 'editor-settings' && (
                <div className="text-sm text-zinc-500">{t('editorPrefs')}</div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button className="px-4 py-2 rounded bg-zinc-800 text-white" onClick={closePanel}>{t('close')}</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className={clsx(theme.card, "rounded-2xl overflow-hidden flex-1 flex flex-col min-h-[500px]")}>
              <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Code2 className="w-4 h-4 text-indigo-400" /> {editorPolicyName}
                  </div>
                  <div className="h-4 w-[1px] bg-zinc-800" />
                  <div className="text-xs text-zinc-500">{editorFileName} • {editorUpdatedLabel ? `${t('lastAnalysis')}: ${editorUpdatedLabel}` : t('noRecentAnalysis')}</div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => onAction?.('open-view', { view: 'policy', section: 'editor-settings' })} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors"><Settings2 className="w-4 h-4" /></button>
                  <button
                    type="button"
                    disabled={!saveEnabled}
                    onClick={() => onAction?.('save-rule', {
                      rule: {
                        id: 'R-UI-LAYER-DOMAIN-INFRA',
                        name: 'UI Layer Guardrail',
                        type: 'forbidden_dependency',
                        from: 'src/domain/**',
                        to: 'src/infrastructure/**',
                        severity: 'high',
                      },
                    })}
                    className={clsx(
                      "text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                      saveEnabled ? "bg-indigo-600 hover:bg-indigo-500" : "bg-zinc-700 opacity-60 cursor-not-allowed"
                    )}
                    title={saveEnabled ? t('saveRule') : t('saveRuleDisabled')}
                  >
                    <Save className="w-3.5 h-3.5" /> {t('saveRule')}
                  </button>
                </div>
              </div>
              {focusedRuleText && (
                <div className="px-4 py-2 border-b border-zinc-800 bg-indigo-500/10 text-xs text-indigo-300">
                  {t('focusedFromFindings')}: {focusedRuleText}
                </div>
              )}
              <div className="flex-1 bg-[#0d0d0e] p-6 font-mono text-sm overflow-auto">
                <div className="flex gap-4">
                  <div className="text-zinc-700 text-right select-none w-8">
                    {displayedEditorLines.map((_, i) => <div key={i}>{i + 1}</div>)}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    {displayedEditorLines.length > 0 ? displayedEditorLines.map((line, index) => (
                      <div
                        key={`${index}-${line.slice(0, 16)}`}
                        className={clsx(
                          'text-zinc-300 whitespace-pre-wrap break-words',
                          focusedRuleText && line.toLowerCase().includes(focusedRuleText.toLowerCase()) && 'bg-indigo-500/20 text-indigo-100 px-1 rounded'
                        )}
                      >
                        {wrapCodeLine(line).map((chunk, chunkIndex) => (
                          <div key={`${index}-${chunkIndex}`} className={chunkIndex > 0 ? 'pl-5 text-zinc-400' : ''}>{chunk || ' '}</div>
                        ))}
                      </div>
                    )) : (
                      <div className="text-zinc-500">{t('policySourceUnavailable')}</div>
                    )}
                    {!showFullEditor && hasHiddenEditorLines && (
                      <div className="text-zinc-500 mt-2">... {editorLines.length - previewLineLimit} {t('linesHidden')}</div>
                    )}
                  </div>
                </div>
              </div>
              {hasHiddenEditorLines && (
                <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/40 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowFullEditor((value) => !value)}
                    className="px-3 py-1.5 rounded text-xs font-semibold border border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                  >
                    {showFullEditor ? t('collapseCode') : t('openFullCode')}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className={clsx(theme.card, "p-6 rounded-2xl")}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-6 flex items-center gap-2">
                <Play className="w-4 h-4" /> {t('quickSimulation')}
              </h3>
              <div className="space-y-4">
                <p className="text-xs text-zinc-400">{t('quickSimulationHint')}</p>
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold">{t('projectedViolations')}</span>
                    <span className="text-lg font-bold font-mono text-amber-500">{projectedViolations}</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${projectedPercent}%` }} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onAction?.('run-analysis', { file: editorFileName, pack: editorPolicyName })}
                  className="w-full py-2.5 rounded-xl border border-indigo-500/30 text-indigo-400 text-sm font-bold hover:bg-indigo-500/10 transition-all"
                >
                  {t('runAnalysis')}
                </button>
              </div>
            </div>

            <div className={clsx(theme.card, "p-6 rounded-2xl")}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-6 flex items-center gap-2">
                <Database className="w-4 h-4" /> {t('ruleParameters')}
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 font-medium">{t('enforcementMode')}</label>
                  <select className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none">
                    <option>{t('blockPr')}</option>
                    <option>{t('warnPr')}</option>
                    <option>{t('silentLogging')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 font-medium">{t('exclusionPatterns')}</label>
                  <input type="text" placeholder={t('exclusionPlaceholder')} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'simulate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className={clsx(theme.card, "p-6 rounded-2xl")}> 
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4" /> {t('scenarioMatrix')}
              </h3>
              <div className="space-y-3 text-sm text-zinc-300">
                {simulationPacks.length > 0 ? simulationPacks.map((p) => (
                  <div key={`simulate-${p.name}`} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                    <span>{policyDisplayName(p)}</span>
                    <button type="button" onClick={() => onAction?.('run-analysis', { file: p.file, pack: policyDisplayName(p) })} className="text-xs font-bold text-indigo-400 hover:underline">{t('run')}</button>
                  </div>
                )) : (
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400">
                    {t('noPacksFound')}
                  </div>
                )}
              </div>
            </div>

            <div className={clsx(theme.card, "p-6 rounded-2xl")}> 
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">{t('runWorkspaceAnalysis')}</h3>
              <p className="text-sm text-zinc-400 mb-4">{t('runWorkspaceHint')}</p>
              <button
                type="button"
                onClick={() => onAction?.('run-analysis')}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold"
              >
                {t('runSimulationAnalysis')}
              </button>
            </div>
          </div>

          <div className={clsx(theme.card, "p-6 rounded-2xl h-fit")}> 
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">{t('simulationTips')}</h3>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>• {t('tip1')}</li>
              <li>• {t('tip2')}</li>
              <li>• {t('tip3')}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={clsx(
        "px-6 py-3 text-sm font-medium transition-all relative",
        active ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {label}
      {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
    </button>
  );
}
