import React, { useState, useEffect } from 'react';
import ConfirmModal from './modals/ConfirmModal';
import { 
  Bell, 
  Shield, 
  Webhook, 
  Users, 
  Database, 
  Terminal,
  ChevronRight,
  Globe,
  Copy,
  Check
} from 'lucide-react';
import { clsx } from 'clsx';

interface SettingsPageProps {
  theme: any;
  onAction?: (action: string, payload?: any) => void;
  language?: 'en' | 'uk';
}

export function SettingsPage({ theme, onAction, language = 'en' }: SettingsPageProps) {
  const i18n = {
    title: { en: 'Settings', uk: 'Налаштування' },
    subtitle: { en: 'Manage your platform configuration, integrations, and workspace security.', uk: 'Керуйте конфігурацією платформи, інтеграціями та безпекою робочого простору.' },
    general: { en: 'General', uk: 'Загальні' },
    securityAccess: { en: 'Security & Access', uk: 'Безпека і доступ' },
    integrations: { en: 'Integrations', uk: 'Інтеграції' },
    notifications: { en: 'Notifications', uk: 'Сповіщення' },
    teamManagement: { en: 'Team Management', uk: 'Керування командами' },
    apiKeys: { en: 'API Keys', uk: 'API ключі' },
    auditLogs: { en: 'Audit Logs', uk: 'Логи аудиту' },
    saveConfiguration: { en: 'Save Configuration', uk: 'Зберегти конфігурацію' },
    discardChanges: { en: 'Discard Changes', uk: 'Скасувати зміни' },
    openPipeline: { en: 'Open Pipeline', uk: 'Відкрити pipeline' },
    save: { en: 'Save', uk: 'Зберегти' },
    saved: { en: 'Saved', uk: 'Збережено' },
    clear: { en: 'Clear', uk: 'Очистити' },
    ciUrlSaved: { en: 'CI URL saved locally', uk: 'CI URL збережено локально' },
    ciUrlCleared: { en: 'CI URL cleared', uk: 'CI URL очищено' },
    workspace: { en: 'Workspace', uk: 'Робочий простір' },
    defaultLandingPage: { en: 'Default Landing Page', uk: 'Сторінка за замовчуванням' },
    openFindingsOnStart: { en: 'Open Findings view when the app starts', uk: 'Відкривати Findings при запуску застосунку' },
    setToFindings: { en: 'Set to Findings', uk: 'Зробити Findings стартовою' },
    exportPreferences: { en: 'Export Preferences', uk: 'Налаштування експорту' },
    exportPreferencesDesc: { en: 'Use JSON snapshot for reporting workflows', uk: 'Використовуйте JSON-знімок для звітних процесів' },
    testExport: { en: 'Test Export', uk: 'Тестовий експорт' },
    securityControls: { en: 'Security Controls', uk: 'Контролі безпеки' },
    failThreshold: { en: 'Fail Threshold', uk: 'Поріг блокування' },
    failThresholdDesc: { en: 'Fail builds if critical violations > 0', uk: 'Провалювати збірку, якщо критичних порушень > 0' },
    baselineExpiry: { en: 'Baseline Expiry', uk: 'Термін baseline' },
    baselineExpiryDesc: { en: 'Auto-expire baseline exceptions after 90 days', uk: 'Автоматично завершувати baseline-виключення через 90 днів' },
    ciCdIntegration: { en: 'CI/CD Integration', uk: 'Інтеграція CI/CD' },
    githubActions: { en: 'GitHub Actions', uk: 'GitHub Actions' },
    connected: { en: 'Connected', uk: 'Підключено' },
    ciUrlPlaceholder: { en: 'https://ci.example.com/your-pipeline', uk: 'https://ci.example.com/your-pipeline' },
    githubUsernamePlaceholder: { en: 'GitHub username (e.g. octocat)', uk: 'Користувач GitHub (напр. octocat)' },
    jiraBaseUrlPlaceholder: { en: 'Jira base URL (e.g. https://company.atlassian.net)', uk: 'Базовий URL Jira (напр. https://company.atlassian.net)' },
    ciTip: { en: 'Tip: set a custom CI URL to override server links (stored locally)', uk: 'Порада: задайте власний CI URL для перевизначення серверних посилань (зберігається локально)' },
    notificationRules: { en: 'Notification Rules', uk: 'Правила сповіщень' },
    newCriticalViolation: { en: 'New Critical Violation', uk: 'Нове критичне порушення' },
    weeklyGovernanceReport: { en: 'Weekly Governance Report', uk: 'Щотижневий governance-звіт' },
    dependencyAlerts: { en: 'Dependency Vulnerability Alerts', uk: 'Сповіщення про вразливості залежностей' },
    teamOnboarding: { en: 'Team Onboarding', uk: 'Онбординг команди' },
    teamManagementTitle: { en: 'Team Management', uk: 'Керування командою' },
    teamManagementDesc: { en: 'Assign ownership and maintain architecture accountability maps.', uk: 'Призначайте відповідальних та підтримуйте мапи архітектурної відповідальності.' },
    manageOwnership: { en: 'Manage Findings Ownership', uk: 'Керувати ownership у Findings' },
    apiKeyAccess: { en: 'API Key Access', uk: 'Доступ до API ключів' },
    serviceKeysDesc: { en: 'Use service keys for CI and automation integrations.', uk: 'Використовуйте сервісні ключі для інтеграцій CI та автоматизації.' },
    copyKeyTitle: { en: 'Copy key', uk: 'Скопіювати ключ' },
    auditLogsTitle: { en: 'Audit Logs', uk: 'Логи аудиту' },
    auditLogsDesc: { en: 'Review governance actions, rule updates, and exception changes.', uk: 'Переглядайте governance-дії, оновлення правил і зміни виключень.' },
    exportAuditSnapshot: { en: 'Export Audit Snapshot', uk: 'Експортувати знімок аудиту' },
    ciUrlModalTitle: { en: 'CI URL', uk: 'CI URL' },
  } as const;
  const t = (key: keyof typeof i18n) => i18n[key][language];
  const [activeSection, setActiveSection] = useState('General');
  const [failThreshold, setFailThreshold] = useState(true);
  const [baselineExpiry, setBaselineExpiry] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [notifications, setNotifications] = useState({
    critical: true,
    weekly: true,
    dependency: true,
    onboarding: false,
  });

  const sectionActions = {
    General: () => onAction?.('open-view', { view: 'settings', section: 'General' }),
    'Security & Access': () => onAction?.('open-view', { view: 'settings', section: 'Security & Access' }),
    Integrations: () => onAction?.('open-ci'),
    Notifications: () => onAction?.('open-view', { view: 'settings', section: 'Notifications' }),
    'Team Management': () => onAction?.('open-view', { view: 'settings', section: 'Team Management' }),
    'API Keys': () => onAction?.('open-view', { view: 'settings', section: 'API Keys' }),
    'Audit Logs': () => onAction?.('open-view', { view: 'settings', section: 'Audit Logs' }),
  } as Record<string, () => void>;

  const [ciUrl, setCiUrl] = useState('');
  const [ciSaved, setCiSaved] = useState(false);
  const [githubUsername, setGithubUsername] = useState('');
  const [jiraBaseUrl, setJiraBaseUrl] = useState('');
  const [showCiConfirm, setShowCiConfirm] = useState(false);
  const [ciConfirmMessage, setCiConfirmMessage] = useState('');
  const [prefsHydrated, setPrefsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('archguard.ciUrl') || '' : '';
      setCiUrl(stored);
      const gh = typeof window !== 'undefined' ? window.localStorage.getItem('archguard.githubUsername') || '' : '';
      setGithubUsername(gh);
      const jira = typeof window !== 'undefined' ? window.localStorage.getItem('archguard.jiraBaseUrl') || '' : '';
      setJiraBaseUrl(jira);

      const settingsRaw = typeof window !== 'undefined' ? window.localStorage.getItem('archguard.settings') : null;
      if (settingsRaw) {
        const parsed = JSON.parse(settingsRaw);
        if (typeof parsed?.failThreshold === 'boolean') setFailThreshold(parsed.failThreshold);
        if (typeof parsed?.baselineExpiry === 'boolean') setBaselineExpiry(parsed.baselineExpiry);
        if (parsed?.notifications && typeof parsed.notifications === 'object') {
          setNotifications((prev) => ({
            ...prev,
            ...parsed.notifications,
          }));
        }
      }
    } catch (e) {
      setCiUrl('');
    } finally {
      setPrefsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!prefsHydrated) return;
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          'archguard.settings',
          JSON.stringify({
            failThreshold,
            baselineExpiry,
            notifications,
          })
        );
      }
    } catch (e) {
      // noop
    }
  }, [prefsHydrated, failThreshold, baselineExpiry, notifications]);

  const saveCiUrl = () => {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem('archguard.ciUrl', ciUrl || '');
      setCiSaved(true);
      setCiConfirmMessage(t('ciUrlSaved'));
      setShowCiConfirm(true);
      setTimeout(() => setCiSaved(false), 1200);
    } catch (e) {
      // noop
    }
  };

  const clearCiUrl = () => {
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem('archguard.ciUrl');
      setCiUrl('');
      setCiConfirmMessage(t('ciUrlCleared'));
      setShowCiConfirm(true);
      setTimeout(() => setCiSaved(false), 1200);
    } catch (e) {
      // noop
    }
  };

  const renderSection = () => {
    if (activeSection === 'General') {
      return (
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">{t('workspace')}</h3>
          <div className={clsx(theme.card, "p-6 rounded-2xl space-y-6")}> 
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{t('defaultLandingPage')}</div>
                <p className="text-xs text-zinc-500">{t('openFindingsOnStart')}</p>
              </div>
              <button
                type="button"
                onClick={() => onAction?.('open-view', { view: 'findings' })}
                className="text-xs font-bold text-cyan-400 hover:underline"
              >
                {t('setToFindings')}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{t('exportPreferences')}</div>
                <p className="text-xs text-zinc-500">{t('exportPreferencesDesc')}</p>
              </div>
              <button
                type="button"
                onClick={() => onAction?.('export-findings')}
                className="text-xs font-bold text-cyan-400 hover:underline"
              >
                {t('testExport')}
              </button>
            </div>
          </div>
        </section>
      );
    }

    if (activeSection === 'Security & Access') {
      return (
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">{t('securityControls')}</h3>
          <div className={clsx(theme.card, "p-6 rounded-2xl space-y-4")}> 
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{t('failThreshold')}</div>
                <p className="text-xs text-zinc-500">{t('failThresholdDesc')}</p>
              </div>
              <div
                className={clsx(
                  "w-8 h-4 rounded-full relative cursor-pointer transition-colors",
                  failThreshold ? 'bg-cyan-600/50' : 'bg-zinc-800'
                )}
                onClick={() => setFailThreshold((v) => !v)}
              >
                <div className={clsx("absolute top-0.5 w-3 h-3 rounded-full transition-all", failThreshold ? 'right-0.5 bg-cyan-400' : 'left-0.5 bg-zinc-600')} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{t('baselineExpiry')}</div>
                <p className="text-xs text-zinc-500">{t('baselineExpiryDesc')}</p>
              </div>
              <div
                className={clsx(
                  "w-8 h-4 rounded-full relative cursor-pointer transition-colors",
                  baselineExpiry ? 'bg-cyan-600/50' : 'bg-zinc-800'
                )}
                onClick={() => setBaselineExpiry((v) => !v)}
              >
                <div className={clsx("absolute top-0.5 w-3 h-3 rounded-full transition-all", baselineExpiry ? 'right-0.5 bg-cyan-400' : 'left-0.5 bg-zinc-600')} />
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (activeSection === 'Integrations') {
      return (
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">{t('ciCdIntegration')}</h3>
          <div className={clsx(theme.card, "p-6 rounded-2xl")}> 
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-bold text-sm">{t('githubActions')}</div>
                <div className="text-xs text-emerald-500 font-medium">{t('connected')}</div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder={t('ciUrlPlaceholder')}
                  value={ciUrl}
                  onChange={(e) => setCiUrl(e.target.value)}
                  className="text-xs px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 min-w-[160px] max-w-[420px] flex-1"
                />
                <input
                  type="text"
                  placeholder={t('githubUsernamePlaceholder')}
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  className="text-xs px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 min-w-[140px] max-w-[240px]"
                />
                <input
                  type="text"
                  placeholder={t('jiraBaseUrlPlaceholder')}
                  value={jiraBaseUrl}
                  onChange={(e) => setJiraBaseUrl(e.target.value)}
                  className="text-xs px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 min-w-[180px] max-w-[320px]"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={saveCiUrl} className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold">
                      {ciSaved ? t('saved') : t('save')}
                  </button>
                    <button type="button" onClick={clearCiUrl} className="px-2 py-1 border border-zinc-700 text-zinc-300 rounded text-xs">
                      {t('clear')}
                  </button>
                </div>
                  <button type="button" onClick={() => onAction?.('open-ci')} className="text-xs font-bold text-cyan-400 hover:underline">{t('openPipeline')}</button>
              </div>
            </div>
            <div className="text-xs text-zinc-500 mt-3">{t('ciTip')}</div>
          </div>
        </section>
      );
    }

    if (activeSection === 'Notifications') {
      return (
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">{t('notificationRules')}</h3>
          <div className={clsx(theme.card, "p-6 rounded-2xl")}> 
            <div className="space-y-4">
              <NotificationToggle label={t('newCriticalViolation')} active={notifications.critical} onClick={() => setNotifications((s) => ({ ...s, critical: !s.critical }))} />
              <NotificationToggle label={t('weeklyGovernanceReport')} active={notifications.weekly} onClick={() => setNotifications((s) => ({ ...s, weekly: !s.weekly }))} />
              <NotificationToggle label={t('dependencyAlerts')} active={notifications.dependency} onClick={() => setNotifications((s) => ({ ...s, dependency: !s.dependency }))} />
              <NotificationToggle label={t('teamOnboarding')} active={notifications.onboarding} onClick={() => setNotifications((s) => ({ ...s, onboarding: !s.onboarding }))} />
            </div>
          </div>
        </section>
      );
    }

    if (activeSection === 'Team Management') {
      return (
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">{t('teamManagementTitle')}</h3>
          <div className={clsx(theme.card, "p-6 rounded-2xl space-y-4")}> 
            <div className="text-sm text-zinc-300">{t('teamManagementDesc')}</div>
            <button
              type="button"
              onClick={() => onAction?.('open-view', { view: 'findings' })}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold"
            >
              {t('manageOwnership')}
            </button>
          </div>
        </section>
      );
    }

    if (activeSection === 'API Keys') {
      const demoKey = 'ag_live_demo_key_********************************';
      return (
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">{t('apiKeyAccess')}</h3>
          <div className={clsx(theme.card, "p-6 rounded-2xl space-y-4")}> 
            <div className="text-xs text-zinc-500">{t('serviceKeysDesc')}</div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs">
              <span className="truncate flex-1">{demoKey}</span>
              <button
                type="button"
                onClick={async () => {
                  if (navigator?.clipboard?.writeText) {
                    await navigator.clipboard.writeText(demoKey);
                    setApiKeyCopied(true);
                    setTimeout(() => setApiKeyCopied(false), 1200);
                  }
                  onAction?.('open-view', { view: 'settings', section: 'API Keys', action: 'copied' });
                }}
                className="p-1.5 rounded hover:bg-zinc-800"
                title={t('copyKeyTitle')}
              >
                {apiKeyCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
              </button>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">{t('auditLogsTitle')}</h3>
        <div className={clsx(theme.card, "p-6 rounded-2xl space-y-4")}> 
          <div className="text-sm text-zinc-300">{t('auditLogsDesc')}</div>
          <button
            type="button"
            onClick={() => onAction?.('open-view', { view: 'settings', section: 'Audit Logs', action: 'export' })}
            className="px-4 py-2 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 rounded-lg text-sm font-bold"
          >
            {t('exportAuditSnapshot')}
          </button>
        </div>
      </section>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">{t('title')}</h1>
        <p className={theme.textMuted}>{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <nav className="space-y-1">
          <SettingsNavLink active={activeSection === 'General'} icon={Globe} label={t('general')} onClick={() => { setActiveSection('General'); sectionActions['General'](); }} />
          <SettingsNavLink active={activeSection === 'Security & Access'} icon={Shield} label={t('securityAccess')} onClick={() => { setActiveSection('Security & Access'); sectionActions['Security & Access'](); }} />
          <SettingsNavLink active={activeSection === 'Integrations'} icon={Webhook} label={t('integrations')} onClick={() => { setActiveSection('Integrations'); sectionActions['Integrations'](); }} />
          <SettingsNavLink active={activeSection === 'Notifications'} icon={Bell} label={t('notifications')} onClick={() => { setActiveSection('Notifications'); sectionActions['Notifications'](); }} />
          <SettingsNavLink active={activeSection === 'Team Management'} icon={Users} label={t('teamManagement')} onClick={() => { setActiveSection('Team Management'); sectionActions['Team Management'](); }} />
          <SettingsNavLink active={activeSection === 'API Keys'} icon={Terminal} label={t('apiKeys')} onClick={() => { setActiveSection('API Keys'); sectionActions['API Keys'](); }} />
          <SettingsNavLink active={activeSection === 'Audit Logs'} icon={Database} label={t('auditLogs')} onClick={() => { setActiveSection('Audit Logs'); sectionActions['Audit Logs'](); }} />
        </nav>

        <div className="md:col-span-2 space-y-8">
          {renderSection()}

          <div className="pt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => onAction?.('open-view', { view: 'settings', section: 'General', action: 'discard' })}
              className="px-6 py-2 rounded-xl text-sm font-bold text-zinc-500 hover:text-zinc-300"
            >
              {t('discardChanges')}
            </button>
            <button
              type="button"
              onClick={() => {
                  try {
                    if (typeof window !== 'undefined') {
                      // persist CI URL locally as a user preference
                      if (ciUrl && ciUrl.trim() !== '') window.localStorage.setItem('archguard.ciUrl', ciUrl);
                      else window.localStorage.removeItem('archguard.ciUrl');
                      // persist GitHub username locally
                      if (githubUsername && githubUsername.trim() !== '') window.localStorage.setItem('archguard.githubUsername', githubUsername);
                      else window.localStorage.removeItem('archguard.githubUsername');
                      // persist Jira base URL locally
                      if (jiraBaseUrl && jiraBaseUrl.trim() !== '') window.localStorage.setItem('archguard.jiraBaseUrl', jiraBaseUrl);
                      else window.localStorage.removeItem('archguard.jiraBaseUrl');
                    }
                  } catch (e) {}

                  // build payload with only explicitly provided fields to avoid accidental null overwrites
                  const payload: any = {};
                  if (ciUrl && ciUrl.trim() !== '') payload.ciUrl = ciUrl.trim();
                  if (githubUsername && githubUsername.trim() !== '') payload.githubUsername = githubUsername.trim();
                  if (jiraBaseUrl && jiraBaseUrl.trim() !== '') payload.jiraBaseUrl = jiraBaseUrl.trim();
                  // include toggles explicitly (they are booleans)
                  payload.failThreshold = Boolean(failThreshold);
                  payload.baselineExpiry = Boolean(baselineExpiry);
                  payload.notifications = notifications;

                  onAction?.('save-settings', payload);
                }}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all"
            >
              {t('saveConfiguration')}
            </button>
          </div>
            <ConfirmModal open={showCiConfirm} title={t('ciUrlModalTitle')} message={ciConfirmMessage} onClose={() => setShowCiConfirm(false)} />
        </div>
      </div>
    </div>
  );
}

function SettingsNavLink({ icon: Icon, label, active, onClick }: any) {
  return (
    <button type="button" onClick={onClick} className={clsx(
      "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all",
      active ? "bg-zinc-800 text-white font-bold" : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
    )}>
      <Icon className={clsx("w-5 h-5", active ? "text-cyan-400" : "text-zinc-500")} />
      <span className="text-sm">{label}</span>
      {active && <ChevronRight className="ml-auto w-4 h-4" />}
    </button>
  );
}

function NotificationToggle({ label, active, onClick }: any) {
  return (
    <div className="flex items-center justify-between group">
      <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{label}</span>
      <div className={clsx(
        "w-8 h-4 rounded-full relative cursor-pointer transition-colors",
        active ? "bg-cyan-600/50" : "bg-zinc-800"
      )} onClick={onClick}>
        <div className={clsx(
          "absolute top-0.5 w-3 h-3 rounded-full transition-all",
          active ? "right-0.5 bg-cyan-400" : "left-0.5 bg-zinc-600"
        )} />
      </div>
    </div>
  );
}
