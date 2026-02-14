import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Search, 
  AlertTriangle, 
  GitPullRequest, 
  ShieldCheck, 
  Package, 
  Settings, 
  Palette, 
  Bell, 
  User, 
  ChevronRight,
  Menu,
  X,
  Terminal,
  Languages
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Components
import { Dashboard } from './components/Dashboard';
import { Findings } from './components/Findings';
import { PRReview } from './components/PRReview';
import { PolicyStudio } from './components/PolicyStudio';
import { DependencyDetail } from './components/DependencyDetail';
import { SettingsPage } from './components/Settings';
import { DesignSystem } from './components/DesignSystem';
import AssignModal from './components/modals/AssignModal';
import IgnoreModal from './components/modals/IgnoreModal';
import RuleEditorModal from './components/modals/RuleEditorModal';

type View = 'dashboard' | 'findings' | 'pr-review' | 'policy' | 'dependency' | 'settings' | 'design-system';
type ThemeMode = 'security-ops' | 'calm-enterprise';
type Language = 'en' | 'uk';

export interface UiBootstrapData {
  context?: {
    repository?: string | null;
    actionsUrl?: string | null;
    jiraBaseUrl?: string | null;
    saveEnabled?: boolean;
    githubActionsEnabled?: boolean;
  };
  findings?: {
    file?: string;
    raw?: any;
    summary?: any;
    remediationTracker?: Record<string, any>;
  };
  pr?: {
    totalViolations?: number;
    bySeverity?: Record<string, number>;
    topViolations?: any[];
  };
  sbom?: {
    totalAtRiskPackages?: number;
    criticalPackages?: number;
    entries?: any[];
  };
  trends?: {
    history?: any[];
  };
}

interface GitHubProfile {
  login: string;
  name: string;
  avatarUrl: string | null;
  htmlUrl: string;
  bio?: string;
  company?: string;
  location?: string;
  publicRepos?: number;
  followers?: number;
  following?: number;
}

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [themeMode, setThemeMode] = useState<ThemeMode>('security-ops');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [uiData, setUiData] = useState<UiBootstrapData>({});
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [githubProfile, setGithubProfile] = useState<GitHubProfile | null>(null);
  const [actionMessage, setActionMessage] = useState<string>('');
  const [assignModal, setAssignModal] = useState<{ open: boolean; finding?: any; defaultOwner?: string }>({ open: false });
  const [ignoreModal, setIgnoreModal] = useState<{ open: boolean; finding?: any }>({ open: false });
  const [ruleModal, setRuleModal] = useState<{ open: boolean; rule?: any }>({ open: false });
  const [policyPanel, setPolicyPanel] = useState<string | null>(null);
  const [policyFocusRule, setPolicyFocusRule] = useState<any | null>(null);
  const [dependencyFocus, setDependencyFocus] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('en');

  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/ui/bootstrap')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to fetch bootstrap data')))
      .then((json) => {
        if (!active) return;
        setUiData(json || {});
      })
      .catch(() => {
        if (!active) return;
        setUiData({});
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('archguard.language') : null;
      if (stored === 'en' || stored === 'uk') {
        setLanguage(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('archguard.language', language);
      }
      if (typeof document !== 'undefined') {
        document.documentElement.lang = language === 'uk' ? 'uk' : 'en';
      }
    } catch {
      // ignore
    }
  }, [language]);

  useEffect(() => {
    let active = true;
    // include locally stored GitHub username (if any) to help server resolve profile after restarts
    let profileUrl = '/api/profile/github';
    try {
      const localGh = typeof window !== 'undefined' ? window.localStorage.getItem('archguard.githubUsername') : null;
      if (localGh) profileUrl += `?username=${encodeURIComponent(localGh)}`;
    } catch (e) {
      // ignore
    }

    fetch(profileUrl)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to fetch GitHub profile')))
      .then((json) => {
        if (!active) return;
        if (json?.connected && json?.profile) {
          setGithubProfile(json.profile);
        }
      })
      .catch(() => {
        if (!active) return;
        setGithubProfile(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const themeClasses = useMemo(() => {
    if (themeMode === 'security-ops') {
      return {
        bg: 'bg-[#0A0A0B]',
        sidebar: 'bg-[#0D0D0E] border-r border-[#1F1F22]',
        card: 'bg-[#141417] border border-[#27272A]',
        text: 'text-zinc-100',
        textMuted: 'text-zinc-500',
        accent: 'text-cyan-400',
        accentBg: 'bg-cyan-500/10',
        navActive: 'bg-zinc-800/50 text-white',
        navHover: 'hover:bg-zinc-800/30'
      };
    } else {
      return {
        bg: 'bg-[#121214]',
        sidebar: 'bg-[#18181B] border-r border-[#27272A]',
        card: 'bg-[#1C1C1F] border border-[#2D2D33]',
        text: 'text-slate-200',
        textMuted: 'text-slate-500',
        accent: 'text-indigo-400',
        accentBg: 'bg-indigo-500/10',
        navActive: 'bg-slate-800/40 text-white',
        navHover: 'hover:bg-slate-800/20'
      };
    }
  }, [themeMode]);

  const dict = {
    dashboard: { en: 'Dashboard', uk: 'Дашборд' },
    findings: { en: 'Findings', uk: 'Знахідки' },
    prReview: { en: 'PR Review', uk: 'Огляд PR' },
    policyStudio: { en: 'Policy Studio', uk: 'Студія політик' },
    dependencies: { en: 'Dependencies', uk: 'Залежності' },
    settings: { en: 'Settings', uk: 'Налаштування' },
    designSystem: { en: 'Design System', uk: 'Дизайн-система' },
    collapse: { en: 'Collapse', uk: 'Згорнути' },
    searchPlaceholder: { en: 'Search dependencies, rules, or findings...', uk: 'Пошук залежностей, правил або знахідок...' },
    notifications: { en: 'Notifications', uk: 'Сповіщення' },
    markRead: { en: 'Mark all read', uk: 'Позначити все як прочитане' },
    openGitHubProfile: { en: 'Open GitHub Profile', uk: 'Відкрити GitHub профіль' },
    openCiPipeline: { en: 'Open CI Pipeline', uk: 'Відкрити CI pipeline' },
    profileSettings: { en: 'Profile Settings', uk: 'Налаштування профілю' },
    themeDesign: { en: 'Theme & Design', uk: 'Тема і дизайн' },
    toggleThemeMode: { en: 'Toggle Theme Mode', uk: 'Змінити тему' },
    go: { en: 'Go', uk: 'Перейти' },
    language: { en: 'Language', uk: 'Мова' },
    userProfileAlt: { en: 'User profile', uk: 'Профіль користувача' },
    defaultUserName: { en: 'Alex Rivera', uk: 'Алекс Ріверa' },
    defaultUserRole: { en: 'Lead Architect', uk: 'Головний архітектор' },
  } as const;

  const t = (key: keyof typeof dict) => dict[key][language];

  const msgDict = {
    notificationPrGateAttention: { en: 'PR quality gate requires attention', uk: 'PR quality gate потребує уваги' },
    notificationPrGateHealthy: { en: 'PR quality gate is healthy', uk: 'PR quality gate у нормі' },
    notificationPrGateDesc: { en: '{count} high/critical issues in latest PR evaluation', uk: '{count} high/critical проблем у останній PR-оцінці' },
    notificationSbomRisk: { en: 'Critical dependency risk detected', uk: 'Виявлено критичний ризик залежностей' },
    notificationSbomHealthy: { en: 'No critical dependency risk', uk: 'Критичний ризик залежностей відсутній' },
    notificationSbomDesc: { en: '{count} critical package(s) from SBOM correlation', uk: '{count} критичних пакунків за SBOM-кореляцією' },
    notificationFindingsUpdated: { en: 'Findings snapshot updated', uk: 'Знімок findings оновлено' },
    notificationFindingsDesc: { en: '{findings} total findings, {pr} in latest PR run', uk: '{findings} загалом findings, {pr} в останньому PR-запуску' },

    searchEnterQuery: { en: 'Enter a search query to navigate', uk: 'Введіть пошуковий запит для навігації' },
    openedPolicyStudio: { en: 'Opened Policy Studio', uk: 'Відкрито Policy Studio' },
    openedPrReview: { en: 'Opened PR Review', uk: 'Відкрито PR Review' },
    openedDependencies: { en: 'Opened Dependencies', uk: 'Відкрито Dependencies' },
    openedSettings: { en: 'Opened Settings', uk: 'Відкрито Settings' },
    openedFindings: { en: 'Opened Findings', uk: 'Відкрито Findings' },
    runningAnalysis: { en: 'Running analysis...', uk: 'Запуск аналізу...' },
    analysisCompleted: { en: 'Analysis completed{policyHint}: {count} findings', uk: 'Аналіз завершено{policyHint}: {count} findings' },
    findingsExported: { en: 'Findings exported', uk: 'Findings експортовано' },
    openedCustomCi: { en: 'Opened custom CI URL (from localStorage)', uk: 'Відкрито кастомний CI URL (з localStorage)' },
    openedCiPipeline: { en: 'Opened CI pipeline', uk: 'Відкрито CI pipeline' },
    ciMissingOpenedActions: { en: 'CI link missing — opened repo actions page', uk: 'CI посилання відсутнє — відкрито сторінку repo actions' },
    ciMissingOpenedRepo: { en: 'CI link missing — opened repository page', uk: 'CI посилання відсутнє — відкрито сторінку репозиторію' },
    ciUnavailable: { en: 'CI URL is not available in current environment', uk: 'CI URL недоступний у поточному середовищі' },
    openedSbomDetails: { en: 'Opened SBOM details', uk: 'Відкрито деталі SBOM' },
    openedGithubProfile: { en: 'Opened GitHub profile', uk: 'Відкрито GitHub профіль' },
    openedExternalLink: { en: 'Opened external link', uk: 'Відкрито зовнішнє посилання' },
    noUrlProvided: { en: 'No URL provided', uk: 'URL не вказано' },
    savingConfiguration: { en: 'Saving configuration...', uk: 'Збереження конфігурації...' },
    configurationSaved: { en: 'Configuration saved', uk: 'Конфігурацію збережено' },
    noCiUrlProvided: { en: 'No CI URL provided', uk: 'CI URL не вказано' },
    savingGithubUsername: { en: 'Saving GitHub username...', uk: 'Збереження GitHub username...' },
    savingJiraUrl: { en: 'Saving Jira URL...', uk: 'Збереження Jira URL...' },
    saveFailed: { en: 'Save failed: {reason}', uk: 'Збереження не вдалося: {reason}' },
    copiedToClipboard: { en: 'Copied to clipboard', uk: 'Скопійовано в буфер обміну' },
    clipboardUnavailable: { en: 'Clipboard API is unavailable', uk: 'Clipboard API недоступний' },
    removalQueuedWorkflow: { en: 'Removal queued and workflow triggered for {name}', uk: 'Видалення поставлено в чергу, workflow запущено для {name}' },
    removalQueuedLocal: { en: 'Removal queued locally for {name}', uk: 'Видалення локально поставлено в чергу для {name}' },
    noPackSpecified: { en: 'No pack specified', uk: 'Pack не вказано' },
    deletingPack: { en: 'Deleting pack: {name}...', uk: 'Видалення pack: {name}...' },
    packDeleted: { en: 'Pack deleted: {name}', uk: 'Pack видалено: {name}' },
    deleteFailed: { en: 'Delete failed: {reason}', uk: 'Видалення не вдалося: {reason}' },
    actionCompleted: { en: 'Action completed', uk: 'Дію виконано' },
    actionFailed: { en: 'Action failed: {reason}', uk: 'Дія завершилась помилкою: {reason}' },
    assigningOwner: { en: 'Assigning owner...', uk: 'Призначення owner...' },
    ownerAssigned: { en: 'Owner assigned: {owner}', uk: 'Owner призначено: {owner}' },
    assignFailed: { en: 'Assign failed: {reason}', uk: 'Призначення не вдалося: {reason}' },
    addingIgnore: { en: 'Adding ignore to baseline...', uk: 'Додавання ignore у baseline...' },
    ignoreAdded: { en: 'Finding added to baseline ignore list', uk: 'Finding додано до baseline ignore-list' },
    ignoreFailed: { en: 'Ignore failed: {reason}', uk: 'Ignore не спрацював: {reason}' },
    savingRule: { en: 'Saving rule...', uk: 'Збереження правила...' },
    saveBlocked: { en: 'Save blocked: {reason}', uk: 'Збереження заблоковано: {reason}' },
    ruleSaved: { en: 'Rule saved: {id}', uk: 'Правило збережено: {id}' },
  } as const;

  const m = (key: keyof typeof msgDict, vars?: Record<string, string | number>) => {
    let output: string = msgDict[key][language];
    if (!vars) return output;
    for (const [varKey, value] of Object.entries(vars)) {
      output = output.replaceAll(`{${varKey}}`, String(value));
    }
    return output;
  };

  const navItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'findings', label: t('findings'), icon: AlertTriangle },
    { id: 'pr-review', label: t('prReview'), icon: GitPullRequest },
    { id: 'policy', label: t('policyStudio'), icon: ShieldCheck },
    { id: 'dependency', label: t('dependencies'), icon: Package },
    { id: 'settings', label: t('settings'), icon: Settings },
    { id: 'design-system', label: t('designSystem'), icon: Palette },
  ];

  const notifications = useMemo(() => {
    const bySeverity = uiData?.pr?.bySeverity || {};
    const highCritical = Number(bySeverity.high || 0) + Number(bySeverity.critical || 0);
    const sbomCritical = Number(uiData?.sbom?.criticalPackages || 0);
    const totalFindings = Number(uiData?.findings?.summary?.totalViolations || 0);
    const totalPr = Number(uiData?.pr?.totalViolations || 0);

    return [
      {
        id: 'pr-gate',
        title: highCritical > 0 ? m('notificationPrGateAttention') : m('notificationPrGateHealthy'),
        description: m('notificationPrGateDesc', { count: highCritical }),
        targetView: 'pr-review' as View,
        critical: highCritical > 0,
      },
      {
        id: 'sbom-risk',
        title: sbomCritical > 0 ? m('notificationSbomRisk') : m('notificationSbomHealthy'),
        description: m('notificationSbomDesc', { count: sbomCritical }),
        targetView: 'dependency' as View,
        critical: sbomCritical > 0,
      },
      {
        id: 'findings-total',
        title: m('notificationFindingsUpdated'),
        description: m('notificationFindingsDesc', { findings: totalFindings, pr: totalPr }),
        targetView: 'findings' as View,
        critical: false,
      },
    ];
  }, [uiData, language]);

  useEffect(() => {
    // compute unread based on persisted read IDs in localStorage
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('archguard.readNotifications') : null;
      const readIds = new Set<string>(stored ? JSON.parse(stored) : []);
      setReadNotificationIds(readIds);
      const unread = notifications.filter((item) => !readIds.has(item.id)).length;
      setUnreadNotifications(unread);
    } catch (e) {
      const unread = notifications.filter((item) => item.critical).length || notifications.length;
      setUnreadNotifications(unread);
    }
  }, [notifications]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleSearch = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setActionMessage(m('searchEnterQuery'));
      searchInputRef.current?.focus();
      return;
    }

    if (q === 'ci' || q === 'actions' || q === 'pipeline') {
      void performAction('open-ci');
      return;
    }
    if (q === 'github' || q === 'profile') {
      void performAction('open-github-profile');
      return;
    }
    if (q.startsWith('http://') || q.startsWith('https://')) {
      void performAction('open-external', { url: q });
      return;
    }

    if (q.includes('policy') || q.includes('rule')) {
      setCurrentView('policy');
      setActionMessage(m('openedPolicyStudio'));
      return;
    }
    if (q.includes('pr') || q.includes('pull') || q.includes('merge')) {
      setCurrentView('pr-review');
      setActionMessage(m('openedPrReview'));
      return;
    }
    if (q.includes('dep') || q.includes('sbom') || q.includes('package')) {
      setCurrentView('dependency');
      setActionMessage(m('openedDependencies'));
      return;
    }
    if (q.includes('setting') || q.includes('config')) {
      setCurrentView('settings');
      setActionMessage(m('openedSettings'));
      return;
    }
    setCurrentView('findings');
    setActionMessage(m('openedFindings'));
  };

  const refreshBootstrap = async () => {
    const bootstrap = await fetch('/api/ui/bootstrap').then((res) => res.ok ? res.json() : null);
    if (bootstrap?.ok) setUiData(bootstrap);
  };

  const performAction = async (action: string, payload?: any) => {
    try {
      switch (action) {
        case 'open-view': {
            if (payload?.view) setCurrentView(payload.view as View);
            if (payload?.view === 'dependency') {
              const focus = String(payload?.packageName || payload?.focus || '').trim();
              setDependencyFocus(focus || null);
            }
            // if opening policy with a sub/action/section, surface a small panel
            if (payload?.view === 'policy') {
              if (payload?.rule) {
                setPolicyFocusRule(payload.rule);
                setPolicyPanel('editor');
              } else {
                setPolicyFocusRule(null);
              }
              const panel = payload?.sub || payload?.action || payload?.section || null;
              if (!payload?.rule) setPolicyPanel(panel);
            } else {
              setPolicyPanel(null);
              setPolicyFocusRule(null);
            }
          break;
        }
        case 'run-analysis': {
          setActionMessage(m('runningAnalysis'));
          const response = await fetch('/api/actions/run-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload || {}),
          });
          const json = await response.json();
          if (!json?.ok) throw new Error(json?.error || 'Analysis failed');

          await refreshBootstrap();
          const policyHint = json?.policyFile ? ` (${json.policyFile})` : '';
          setActionMessage(m('analysisCompleted', { policyHint, count: json?.summary?.totalViolations || 0 }));
          break;
        }
        case 'export-findings': {
          const findings = uiData?.findings?.raw || {};
          const blob = new Blob([JSON.stringify(findings, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'findings.export.json';
          link.click();
          URL.revokeObjectURL(url);
          setActionMessage(m('findingsExported'));
          break;
        }
        case 'open-ci': {
          const storedCi = typeof window !== 'undefined' ? window.localStorage.getItem('archguard.ciUrl') : null;
          const actionsUrl = storedCi || uiData?.context?.actionsUrl || null;
          const repo = uiData?.context?.repository || null;
          const repoActions = repo ? `https://github.com/${repo}/actions` : null;
          const repoUrl = repo ? `https://github.com/${repo}` : null;

          const url = actionsUrl || repoActions || repoUrl;
          if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
            const msg = storedCi ? m('openedCustomCi') : actionsUrl ? m('openedCiPipeline') : repoActions ? m('ciMissingOpenedActions') : m('ciMissingOpenedRepo');
            setActionMessage(msg);
          } else {
            setActionMessage(m('ciUnavailable'));
          }
          break;
        }
        case 'open-sbom': {
          setCurrentView('dependency');
          setActionMessage(m('openedSbomDetails'));
          break;
        }
        case 'open-github-profile': {
          if (githubProfile?.htmlUrl) {
            window.open(githubProfile.htmlUrl, '_blank', 'noopener,noreferrer');
            setActionMessage(m('openedGithubProfile'));
          }
          break;
        }
        case 'open-external': {
          const url = payload?.url;
          if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
            setActionMessage(m('openedExternalLink'));
          } else {
            setActionMessage(m('noUrlProvided'));
          }
          break;
        }
        case 'save-settings': {
          // persist settings like CI URL to the server-side UI config
          const ciUrl = payload?.ciUrl ?? null;
          const githubUsername = payload?.githubUsername ?? null;
          const jiraBaseUrl = payload?.jiraBaseUrl ?? null;
          try {
            if (ciUrl !== null) {
              setActionMessage(m('savingConfiguration'));
              const resp = await fetch('/api/ui/ci-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ciUrl }),
              });
              const j = await resp.json();
              if (!resp.ok || !j?.ok) throw new Error(j?.error || 'Save failed');
              await refreshBootstrap();
              setActionMessage(m('configurationSaved'));
            } else {
              setActionMessage(m('noCiUrlProvided'));
            }
            if (githubUsername !== null) {
              setActionMessage(m('savingGithubUsername'));
              const r2 = await fetch('/api/ui/github-username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ githubUsername }),
              });
              const j2 = await r2.json();
              if (!r2.ok || !j2?.ok) throw new Error(j2?.error || 'Save failed');
              await refreshBootstrap();
              setActionMessage(m('configurationSaved'));
            }
            if (jiraBaseUrl !== null) {
              setActionMessage(m('savingJiraUrl'));
              const r3 = await fetch('/api/ui/jira-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jiraBaseUrl }),
              });
              const j3 = await r3.json();
              if (!r3.ok || !j3?.ok) throw new Error(j3?.error || 'Save failed');
              await refreshBootstrap();
              setActionMessage(m('configurationSaved'));
            }
            // refresh GitHub profile immediately so UI shows avatar/name without reload
            try {
              if (githubUsername) {
                const prof = await fetch(`/api/profile/github?username=${encodeURIComponent(githubUsername)}`);
                if (prof.ok) {
                  const pj = await prof.json();
                  if (pj?.connected && pj?.profile) setGithubProfile(pj.profile);
                }
              }
            } catch (e) {
              // ignore
            }
          } catch (err: any) {
            setActionMessage(m('saveFailed', { reason: String(err?.message || err) }));
          }
          break;
        }
        case 'share': {
          const text = String(payload?.text || 'ARCHGUARD item');
          if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            setActionMessage(m('copiedToClipboard'));
          } else {
            setActionMessage(m('clipboardUnavailable'));
          }
          break;
        }
        case 'assign-finding': {
          const finding = payload?.finding;
          if (!finding) throw new Error('No finding selected');
          setAssignModal({ open: true, finding, defaultOwner: String(finding.owner || 'team-platform') });
          break;
        }
        case 'ignore-finding': {
          const finding = payload?.finding;
          if (!finding) throw new Error('No finding selected');
          setIgnoreModal({ open: true, finding });
          break;
        }
        case 'save-rule': {
          const rule = payload?.rule;
          if (!rule) throw new Error('No rule payload');
          setRuleModal({ open: true, rule });
          break;
        }
        case 'mark-removal': {
          const packageName = String(payload?.packageName || '').trim();
          if (!packageName) throw new Error('Missing package name');

          const response = await fetch('/api/actions/mark-removal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packageName, requestedBy: githubProfile?.login || 'ui-user' }),
          });
          const json = await response.json();
          if (!response.ok || !json?.ok) throw new Error(json?.error || 'Mark removal failed');

          const message = json.triggeredWorkflow
            ? m('removalQueuedWorkflow', { name: packageName })
            : m('removalQueuedLocal', { name: packageName });
          setActionMessage(message);
          break;
        }
        case 'delete-pack': {
          try {
            const name = payload?.name;
            if (!name) { setActionMessage(m('noPackSpecified')); break; }
            setActionMessage(m('deletingPack', { name }));
            const resp = await fetch('/api/policy/packs/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name }),
            });
            const j = await resp.json();
            if (!resp.ok || !j?.ok) throw new Error(j?.error || 'Delete failed');
            await refreshBootstrap();
            setActionMessage(m('packDeleted', { name }));
          } catch (err: any) {
            setActionMessage(m('deleteFailed', { reason: String(err?.message || err) }));
          }
          break;
        }
        default:
          setActionMessage(payload?.message || m('actionCompleted'));
      }
    } catch (error: any) {
      setActionMessage(m('actionFailed', { reason: String(error?.message || error) }));
    }
  };

    // Modal submit handlers
    const handleAssignSubmit = async (owner: string) => {
      try {
        const finding = assignModal.finding;
        setActionMessage(m('assigningOwner'));
        const response = await fetch('/api/actions/assign-finding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ finding, owner }),
        });
        const json = await response.json();
        if (!response.ok || !json?.ok) throw new Error(json?.error || 'Assign failed');
        await refreshBootstrap();
        setActionMessage(m('ownerAssigned', { owner }));
      } catch (err: any) {
        setActionMessage(m('assignFailed', { reason: String(err?.message || err) }));
      } finally {
        setAssignModal({ open: false });
      }
    };

    const handleIgnoreSubmit = async (payload: { reason: string; owner: string; expiresAt?: string }) => {
      try {
        const finding = ignoreModal.finding;
        setActionMessage(m('addingIgnore'));
        const response = await fetch('/api/actions/ignore-finding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ finding, ...payload }),
        });
        const json = await response.json();
        if (!response.ok || !json?.ok) throw new Error(json?.error || 'Ignore failed');
        await refreshBootstrap();
        setActionMessage(m('ignoreAdded'));
      } catch (err: any) {
        setActionMessage(m('ignoreFailed', { reason: String(err?.message || err) }));
      } finally {
        setIgnoreModal({ open: false });
      }
    };

    const handleRuleSubmit = async (rule: any) => {
      try {
        setActionMessage(m('savingRule'));
        const response = await fetch('/api/actions/save-rule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rule }),
        });
        const json = await response.json();
        if (response.status === 403) {
          const reason = json?.error || 'Saving is disabled by server policy';
          setActionMessage(m('saveBlocked', { reason }));
          return;
        }
        if (!response.ok || !json?.ok) throw new Error(json?.error || 'Save rule failed');
        setActionMessage(m('ruleSaved', { id: json.ruleId }));
      } catch (err: any) {
        setActionMessage(m('saveFailed', { reason: String(err?.message || err) }));
      } finally {
        setRuleModal({ open: false });
      }
    };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard theme={themeClasses} data={uiData} onAction={performAction} language={language} />;
      case 'findings': return <Findings theme={themeClasses} data={uiData} onAction={performAction} language={language} />;
      case 'pr-review': return <PRReview theme={themeClasses} data={uiData} onAction={performAction} language={language} />;
      case 'policy': return <PolicyStudio theme={themeClasses} data={uiData} onAction={performAction} panel={policyPanel} focusRule={policyFocusRule} language={language} onClosePanel={() => setPolicyPanel(null)} />;
      case 'dependency': return <DependencyDetail theme={themeClasses} data={uiData} onAction={performAction} focusPackage={dependencyFocus} language={language} />;
      case 'settings': return <SettingsPage theme={themeClasses} onAction={performAction} language={language} />;
      case 'design-system': return <DesignSystem theme={themeClasses} themeMode={themeMode} setThemeMode={setThemeMode} onAction={performAction} language={language} />;
      default: return <Dashboard theme={themeClasses} data={uiData} onAction={performAction} language={language} />;
    }
  };

  return (
    <div className={cn("min-h-screen flex font-['Inter'] transition-colors duration-300", themeClasses.bg, themeClasses.text)}>
      {/* Sidebar Desktop */}
      <aside className={cn(
        "hidden lg:flex flex-col fixed inset-y-0 left-0 z-50 transition-all duration-300",
        isSidebarOpen ? "w-64" : "w-20",
        themeClasses.sidebar
      )}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          {isSidebarOpen && <span className="font-bold tracking-tight text-xl uppercase italic">ArchGuard</span>}
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                currentView === item.id ? themeClasses.navActive : cn(themeClasses.textMuted, themeClasses.navHover)
              )}
            >
              <item.icon className={cn("w-5 h-5", currentView === item.id ? "text-cyan-400" : "")} />
              {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
              {isSidebarOpen && currentView === item.id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800/50">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/50 text-zinc-500 transition-all"
          >
            <ChevronRight className={cn("w-5 h-5 transition-transform", isSidebarOpen ? "rotate-180" : "rotate-0")} />
            {isSidebarOpen && <span className="text-sm font-medium">{t('collapse')}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Menu */}
      <div className={cn(
        "lg:hidden fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm transition-opacity duration-300",
        isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}>
        <div className={cn(
          "w-3/4 max-w-xs h-full p-6 transition-transform duration-300",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          themeClasses.sidebar
        )}>
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold tracking-tight text-xl uppercase italic">ArchGuard</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id as View);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl",
                  currentView === item.id ? themeClasses.navActive : themeClasses.textMuted
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col transition-all duration-300 min-w-0",
        isSidebarOpen ? "lg:pl-64" : "lg:pl-20"
      )}>
        {/* Top Nav */}
        <header className={cn(
          "h-16 flex items-center justify-between px-6 border-b sticky top-0 z-40 backdrop-blur-md",
          themeMode === 'security-ops' ? "bg-[#0A0A0B]/80 border-[#1F1F22]" : "bg-[#121214]/80 border-[#27272A]"
        )}>
          <div className="flex items-center gap-4 flex-1">
            <button className="lg:hidden" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative max-w-md w-full hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                className={cn(
                  "w-full pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all",
                  themeMode === 'security-ops' ? "bg-zinc-900 text-zinc-200" : "bg-slate-800/50 text-slate-200"
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
            <button
              type="button"
              onClick={() => setLanguage((prev) => (prev === 'en' ? 'uk' : 'en'))}
              className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-zinc-800 hover:bg-zinc-800/40"
              title={t('language')}
            >
              <Languages className="w-3.5 h-3.5" />
              {language === 'en' ? 'EN' : 'UKR'}
            </button>
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => {
                  const next = !isNotificationsOpen;
                  setIsNotificationsOpen(next);
                  if (next) {
                    // mark all currently visible notifications as read
                    try {
                      const ids = notifications.map((n) => n.id);
                      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('archguard.readNotifications') : null;
                      const read = new Set<string>(stored ? JSON.parse(stored) : []);
                      ids.forEach((id) => read.add(id));
                      const arr = Array.from(read);
                      if (typeof window !== 'undefined') window.localStorage.setItem('archguard.readNotifications', JSON.stringify(arr));
                      setReadNotificationIds(read);
                      setUnreadNotifications(0);
                    } catch (e) {
                      setUnreadNotifications(0);
                    }
                  }
                }}
                className={cn("p-2 rounded-lg relative transition-colors", themeClasses.navHover)}
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-rose-500 text-white rounded-full text-[10px] leading-4 text-center font-bold">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className={cn("absolute right-0 mt-2 w-80 rounded-xl shadow-2xl p-3 z-[80]", themeClasses.card)}>
                  <div className="flex items-center justify-between px-2 pb-2 border-b border-zinc-800/60">
                    <span className="text-sm font-semibold">{t('notifications')}</span>
                    <button
                      type="button"
                      className="text-xs text-zinc-400 hover:text-zinc-200"
                      onClick={() => setUnreadNotifications(0)}
                    >
                      {t('markRead')}
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {notifications.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => {
                          // mark this notification as read and navigate
                          try {
                            const stored = typeof window !== 'undefined' ? window.localStorage.getItem('archguard.readNotifications') : null;
                            const read = new Set<string>(stored ? JSON.parse(stored) : []);
                            read.add(item.id);
                            if (typeof window !== 'undefined') window.localStorage.setItem('archguard.readNotifications', JSON.stringify(Array.from(read)));
                            setReadNotificationIds(read);
                            setUnreadNotifications((prev) => Math.max(0, prev - 1));
                          } catch (e) {
                            // ignore
                          }
                          setCurrentView(item.targetView);
                          setIsNotificationsOpen(false);
                        }}
                        className={cn(
                          "w-full text-left p-2 rounded-lg border transition-colors",
                          item.critical ? "border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10" : "border-zinc-800 hover:bg-zinc-800/40"
                        )}
                      >
                        <div className="text-xs font-semibold">{item.title}</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">{item.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="h-8 w-[1px] bg-zinc-800" />
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 pl-2 rounded-lg transition-colors hover:bg-zinc-800/30"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden border border-zinc-600">
                  <img
                    src={githubProfile?.avatarUrl || 'https://images.unsplash.com/photo-1652471943570-f3590a4e52ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHByb2ZpbGUlMjBtYW58ZW58MXx8fHwxNzcxMDcyNDc2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'}
                    alt={githubProfile?.name || t('userProfileAlt')}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold">{githubProfile?.name || t('defaultUserName')}</div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">{githubProfile?.login ? `@${githubProfile.login}` : t('defaultUserRole')}</div>
                </div>
              </button>

              {isProfileMenuOpen && (
                <div className={cn("absolute right-0 mt-2 w-56 rounded-xl shadow-2xl p-2 z-[80]", themeClasses.card)}>
                  {githubProfile?.htmlUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        performAction('open-github-profile');
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800/40 flex items-center gap-2 text-sm"
                    >
                      <User className="w-4 h-4" /> {t('openGitHubProfile')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      performAction('open-ci');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800/40 flex items-center gap-2 text-sm"
                  >
                    <Terminal className="w-4 h-4" /> {t('openCiPipeline')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('settings');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800/40 flex items-center gap-2 text-sm"
                  >
                    <User className="w-4 h-4" /> {t('profileSettings')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('design-system');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800/40 flex items-center gap-2 text-sm"
                  >
                    <Palette className="w-4 h-4" /> {t('themeDesign')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setThemeMode((prev) => (prev === 'security-ops' ? 'calm-enterprise' : 'security-ops'));
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800/40 flex items-center gap-2 text-sm"
                  >
                    <Settings className="w-4 h-4" /> {t('toggleThemeMode')}
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="hidden md:inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-800 hover:bg-zinc-800/40"
            >
              {t('go')}
            </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 p-6 overflow-x-hidden">
          {actionMessage && (
            <div className="mb-4 px-3 py-2 rounded-lg text-xs border border-zinc-800 bg-zinc-900/60 text-zinc-300 flex items-center justify-between">
              <span>{actionMessage}</span>
              <button type="button" className="text-zinc-500 hover:text-zinc-200" onClick={() => setActionMessage('')}>✕</button>
            </div>
          )}
          {renderView()}
        </div>
      </main>
      {/* Modals */}
      <AssignModal
        open={assignModal.open}
        finding={assignModal.finding}
        defaultOwner={assignModal.defaultOwner}
        language={language}
        onClose={() => setAssignModal({ open: false })}
        onSubmit={handleAssignSubmit}
      />
      <IgnoreModal
        open={ignoreModal.open}
        finding={ignoreModal.finding}
        language={language}
        onClose={() => setIgnoreModal({ open: false })}
        onSubmit={handleIgnoreSubmit}
      />
      <RuleEditorModal
        open={ruleModal.open}
        rule={ruleModal.rule}
        language={language}
        onClose={() => setRuleModal({ open: false })}
        onSubmit={handleRuleSubmit}
      />
    </div>
  );
}
