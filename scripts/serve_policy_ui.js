import express from 'express';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import Ajv from 'ajv';
import multer from 'multer';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'module';
import registerWorkflowsApi from '../src/api/workflows.js';

const app = express();
app.use(express.json({ limit: '1mb' }));
const port = process.env.PORT || 5174;

const uiDir = path.join(process.cwd(), 'policy-ui');
const findingsUiDir = path.join(process.cwd(), 'findings-ui');
const figmaUiDistDir = path.join(process.cwd(), 'FigmaUI', 'dist');

app.use(express.static(uiDir));
app.use('/findings-ui', express.static(findingsUiDir));
app.use('/figma-ui', express.static(figmaUiDistDir));

// register workflows API from src/api/workflows.js
try {
  registerWorkflowsApi(app);
} catch (e) {
  console.error('Failed to register workflows API', e && e.stack ? e.stack : e);
}

function safeResolveFindingsPath(inputPath) {
  const cwd = process.cwd();
  const normalized = inputPath || 'findings.json';
  const abs = path.resolve(cwd, normalized);
  if (!abs.startsWith(cwd)) {
    return null;
  }
  return abs;
}

function safeResolveWorkspacePath(inputPath, defaultRelativePath) {
  const cwd = process.cwd();
  const normalized = inputPath || defaultRelativePath;
  const abs = path.resolve(cwd, normalized);
  if (!abs.startsWith(cwd)) {
    return null;
  }
  return abs;
}

function resolveAnalysisPolicyFile(inputFile) {
  const cwd = process.cwd();
  const requested = String(inputFile || 'examples/policy.yaml').trim().replace(/\\/g, '/');
  if (!requested.match(/\.ya?ml$/i)) {
    return { ok: false, status: 400, error: 'Policy file must be a .yml or .yaml file' };
  }

  const abs = safeResolveWorkspacePath(requested, 'examples/policy.yaml');
  if (!abs) {
    return { ok: false, status: 400, error: 'Invalid policy file path' };
  }

  const relativePath = path.relative(cwd, abs).replace(/\\/g, '/');
  const isCurrentPolicy = relativePath === 'examples/policy.yaml';
  const isPackPolicy = relativePath.startsWith('policy-packs/') && !relativePath.startsWith('policy-packs/archive/');
  if (!isCurrentPolicy && !isPackPolicy) {
    return { ok: false, status: 400, error: 'Unsupported policy file location' };
  }

  if (!fs.existsSync(abs)) {
    return { ok: false, status: 404, error: 'Policy file not found' };
  }

  return { ok: true, absPath: abs, relativePath };
}

function readJsonFileSafe(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  } catch {
    return null;
  }
}

function buildFindingsSummary(findings) {
  const modules = Array.isArray(findings?.moduleMetrics) ? findings.moduleMetrics : [];
  const violations = Array.isArray(findings?.violations) ? findings.violations : [];
  const topRisk = modules
    .slice()
    .sort((a, b) => (b.changeRiskScore || 0) - (a.changeRiskScore || 0))
    .slice(0, 10);

  const bySeverity = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const v of violations) {
    if (bySeverity[v.severity] !== undefined) {
      bySeverity[v.severity] += 1;
    }
  }

  return {
    generatedAt: findings?.generatedAt || null,
    globalMetrics: findings?.globalMetrics || {},
    riskSummary: findings?.riskSummary || {},
    totalViolations: violations.length,
    bySeverity,
    topRisk,
  };
}

function runAnalysisToFile(outFile, policyFile, callback) {
  const cmd = `node ./src/cli.js --policy ${JSON.stringify(policyFile)} --out ${JSON.stringify(outFile)} --fail-on critical`;
  exec(cmd, { cwd: process.cwd(), env: process.env }, () => {
    if (!fs.existsSync(outFile)) {
      callback(new Error('Analysis output was not generated'));
      return;
    }
    try {
      const raw = fs.readFileSync(outFile, 'utf8');
      const findings = JSON.parse(raw);
      callback(null, findings);
    } catch (error) {
      callback(error);
    }
  });
}

function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function backupIfExists(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.copyFileSync(targetPath, `${targetPath}.${Date.now()}.bak`);
  }
}

function writeJsonWithBackup(targetPath, data) {
  ensureDirForFile(targetPath);
  backupIfExists(targetPath);
  fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf8');
}

function normalizeOwnerMap(raw) {
  return {
    owners: Array.isArray(raw?.owners) ? raw.owners : [],
    defaultOwner: typeof raw?.defaultOwner === 'string' && raw.defaultOwner.trim() !== '' ? raw.defaultOwner : 'unowned',
  };
}

function normalizeBaselineConfig(raw) {
  return {
    ignoredViolations: Array.isArray(raw?.ignoredViolations) ? raw.ignoredViolations : [],
  };
}

function normalizeRemediationStore(raw) {
  return {
    entries: raw && typeof raw.entries === 'object' && raw.entries !== null ? raw.entries : {},
  };
}

function buildFindingKey(finding) {
  const payload = {
    ruleId: finding?.ruleId || finding?.rule || finding?.id || '',
    type: finding?.type || '',
    moduleId: finding?.moduleId || finding?.area || '',
    from: finding?.from || '',
    to: finding?.to || '',
    message: finding?.message || '',
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function upsertRemediationEntry(storePath, payload) {
  const raw = readJsonFileSafe(storePath) || {};
  const normalized = normalizeRemediationStore(raw);
  const finding = payload?.finding || {};
  const key = String(payload?.findingKey || buildFindingKey(finding));
  const now = new Date().toISOString();

  const previous = normalized.entries[key] || {
    findingRef: {
      id: finding?.id || finding?.ruleId || finding?.rule || undefined,
      rule: finding?.rule || finding?.ruleId || finding?.type || undefined,
      from: finding?.from || undefined,
      to: finding?.to || undefined,
      area: finding?.area || finding?.moduleId || undefined,
    },
    status: 'open',
    assignee: '',
    dueDate: '',
    confidence: 'low',
    updatedAt: null,
    history: [],
  };

  const next = {
    ...previous,
    status: payload?.status || previous.status || 'open',
    assignee: payload?.assignee !== undefined ? payload.assignee : previous.assignee,
    dueDate: payload?.dueDate !== undefined ? payload.dueDate : previous.dueDate,
    confidence: payload?.confidence || previous.confidence || 'low',
    lastIssue: payload?.issue || previous.lastIssue || null,
    updatedAt: now,
  };

  const historyItem = {
    at: now,
    source: payload?.source || 'ui',
    status: next.status,
    assignee: next.assignee || '',
    dueDate: next.dueDate || '',
    note: payload?.note || '',
  };

  const history = Array.isArray(previous.history) ? previous.history.slice() : [];
  history.push(historyItem);
  next.history = history.slice(-30);

  normalized.entries[key] = next;
  writeJsonWithBackup(storePath, normalized);

  return { key, entry: next, total: Object.keys(normalized.entries).length };
}

function buildIssueTargetsForFinding(finding, options = {}) {
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

  const repository = String(options.repository || process.env.GITHUB_REPOSITORY || '').trim();
  const githubUrl = repository
    ? `https://github.com/${repository}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
    : null;

  const uiConfigPath = path.join(process.cwd(), 'config', 'ui-config.json');
  const uiConfig = readJsonFileSafe(uiConfigPath) || {};
  const jiraBase = String(options.jiraBaseUrl || uiConfig?.jiraBaseUrl || process.env.JIRA_BASE_URL || '').trim().replace(/\/$/, '');
  const jiraUrl = jiraBase
    ? `${jiraBase}/secure/CreateIssueDetails!init.jspa?summary=${encodeURIComponent(title)}&description=${encodeURIComponent(body)}`
    : null;

  return { githubUrl, jiraUrl, title };
}

function safeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

function defaultRuleId() {
  return `R-UI-${Date.now()}`;
}

function getPolicyHistoryEntries() {
  const examplesDir = path.join(process.cwd(), 'examples');
  const policyPath = path.join(examplesDir, 'policy.yaml');
  const result = [];

  if (fs.existsSync(policyPath)) {
    const stat = fs.statSync(policyPath);
    result.push({
      type: 'current',
      file: 'policy.yaml',
      path: policyPath,
      updatedAt: stat.mtime.toISOString(),
      size: stat.size,
      label: 'Current policy',
      backupOf: null,
    });
  }

  if (!fs.existsSync(examplesDir)) return result;

  const backups = fs.readdirSync(examplesDir)
    .filter((file) => /^policy\.ya?ml\.[0-9]+\.bak$/i.test(file))
    .map((file) => {
      const full = path.join(examplesDir, file);
      const stat = fs.statSync(full);
      const matched = file.match(/\.([0-9]+)\.bak$/i);
      const ts = matched ? Number(matched[1]) : 0;
      const restoredAt = Number.isFinite(ts) && ts > 0 ? new Date(ts).toISOString() : stat.mtime.toISOString();
      return {
        type: 'backup',
        file,
        path: full,
        updatedAt: restoredAt,
        size: stat.size,
        label: `Backup ${file}`,
        backupOf: 'policy.yaml',
      };
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return result.concat(backups);
}

function isSaveEnabled() {
  if (process.env.POLICY_UI_READONLY === '1') return false;
  if (process.env.POLICY_UI_ENABLE_SAVE === '0') return false;
  if (process.env.POLICY_UI_ENABLE_SAVE === '1') return true;
  return true;
}

function resolveGitHubProfileUsername(req) {
  const fromQuery = typeof req.query.username === 'string' ? req.query.username.trim() : '';
  if (fromQuery) return fromQuery;

  // check persisted UI config first
  try {
    const uiConfigPath = path.join(process.cwd(), 'config', 'ui-config.json');
    if (fs.existsSync(uiConfigPath)) {
      const raw = fs.readFileSync(uiConfigPath, 'utf8');
      const cfg = JSON.parse(raw || '{}');
      if (cfg?.githubProfileUsername) return String(cfg.githubProfileUsername).trim();
    }
  } catch (e) {
    // ignore and fall back
  }

  const fromEnv = String(process.env.GITHUB_PROFILE_USERNAME || '').trim();
  if (fromEnv) return fromEnv;

  const repo = String(process.env.GITHUB_REPOSITORY || '').trim();
  if (repo.includes('/')) {
    return repo.split('/')[0];
  }
  return '';
}

app.get('/api/findings', (req, res) => {
  const target = safeResolveFindingsPath(req.query.file);
  if (!target) {
    return res.status(400).json({ error: 'Invalid findings path' });
  }
  if (!fs.existsSync(target)) {
    return res.status(404).json({ error: 'Findings file not found', file: target });
  }
  try {
    const raw = fs.readFileSync(target, 'utf8');
    const findings = JSON.parse(raw);
    return res.json({ ok: true, file: target, findings });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to parse findings', details: String(err) });
  }
});

app.get('/api/findings/summary', (req, res) => {
  const target = safeResolveFindingsPath(req.query.file);
  if (!target) {
    return res.status(400).json({ error: 'Invalid findings path' });
  }
  if (!fs.existsSync(target)) {
    return res.status(404).json({ error: 'Findings file not found', file: target });
  }

  try {
    const raw = fs.readFileSync(target, 'utf8');
    const findings = JSON.parse(raw);
    const summary = buildFindingsSummary(findings);

    return res.json({
      ok: true,
      file: target,
      ...summary,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to build summary', details: String(err) });
  }
});

app.get('/api/pr/summary', (req, res) => {
  const findingsPath = safeResolveWorkspacePath(req.query.findings, 'tmp/findings_pr.json')
    || safeResolveWorkspacePath(null, 'findings.json');
  const summaryPath = safeResolveWorkspacePath(req.query.summary, 'tmp/findings_pr_summary.json');
  const sbomPath = safeResolveWorkspacePath(req.query.sbom, 'tmp/sbom_risk_pr.json')
    || safeResolveWorkspacePath(null, 'tmp/sbom_risk.json');

  const findings = readJsonFileSafe(findingsPath) || { violations: [] };
  const summary = readJsonFileSafe(summaryPath) || null;
  const sbom = readJsonFileSafe(sbomPath) || { entries: [] };
  const violations = Array.isArray(findings.violations) ? findings.violations : [];

  return res.json({
    ok: true,
    findingsFile: findingsPath,
    summaryFile: summaryPath,
    sbomFile: sbomPath,
    totalViolations: violations.length,
    bySeverity: summary?.remainingBySeverity || buildFindingsSummary(findings).bySeverity,
    topViolations: violations.slice(0, 10),
    sbomTop: Array.isArray(sbom.entries) ? sbom.entries.slice(0, 5) : [],
  });
});

app.get('/api/sbom/risk', (req, res) => {
  const target = safeResolveWorkspacePath(req.query.file, 'tmp/sbom_risk.json')
    || safeResolveWorkspacePath(null, 'tmp/sbom_risk_pr.json');
  if (!target) {
    return res.status(400).json({ error: 'Invalid sbom risk path' });
  }

  const sbom = readJsonFileSafe(target);
  if (!sbom) {
    return res.status(404).json({ error: 'SBOM risk file not found or invalid', file: target });
  }

  return res.json({ ok: true, file: target, ...sbom });
});

app.get('/api/profile/github', async (req, res) => {
  const username = resolveGitHubProfileUsername(req);
  if (!username) {
    return res.json({
      ok: true,
      connected: false,
      reason: 'No GitHub username configured',
      hint: 'Set GITHUB_PROFILE_USERNAME env or pass ?username=<github-login>',
    });
  }

  const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  const headers = {
    'User-Agent': 'archguard-ui',
    Accept: 'application/vnd.github+json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
    if (!response.ok) {
      return res.status(200).json({
        ok: true,
        connected: false,
        username,
        reason: `GitHub API returned ${response.status}`,
      });
    }

    const profile = await response.json();
    return res.json({
      ok: true,
      connected: true,
      username,
      profile: {
        login: profile.login || username,
        name: profile.name || profile.login || username,
        avatarUrl: profile.avatar_url || null,
        htmlUrl: profile.html_url || `https://github.com/${username}`,
        bio: profile.bio || '',
        company: profile.company || '',
        location: profile.location || '',
        publicRepos: Number(profile.public_repos || 0),
        followers: Number(profile.followers || 0),
        following: Number(profile.following || 0),
      },
    });
  } catch (error) {
    return res.status(200).json({
      ok: true,
      connected: false,
      username,
      reason: String(error),
    });
  }
});

app.get('/api/trends', (req, res) => {
  const target = safeResolveWorkspacePath(req.query.file, 'analytics/trends_history.json');
  if (!target) {
    return res.status(400).json({ error: 'Invalid trends path' });
  }
  const trends = readJsonFileSafe(target);
  if (!trends) {
    return res.status(404).json({ error: 'Trends file not found or invalid', file: target });
  }

  const items = Array.isArray(trends.history) ? trends.history : [];
  const limit = Number(req.query.limit || 30);
  return res.json({
    ok: true,
    file: target,
    count: items.length,
    history: items.slice(Math.max(0, items.length - (Number.isFinite(limit) ? limit : 30))),
  });
});

app.get('/api/policy/packs', (req, res) => {
  const packsDir = path.join(process.cwd(), 'policy-packs');
  if (!fs.existsSync(packsDir)) {
    return res.json({ ok: true, packs: [] });
  }

  const packs = fs.readdirSync(packsDir)
    .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
    .map((file) => {
      const fullPath = path.join(packsDir, file);
      const stat = fs.existsSync(fullPath) ? fs.statSync(fullPath) : null;
      const raw = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
      let parsed = null;
      try {
        parsed = yaml.parse(raw);
      } catch {
        parsed = null;
      }
      const rules = Array.isArray(parsed?.rules) ? parsed.rules.length : (Array.isArray(parsed?.policies) ? parsed.policies.length : 0);

      // prefer .meta.json if present
      const metaPath = path.join(packsDir, `${file}.meta.json`);
      let meta = null;
      try {
        if (fs.existsSync(metaPath)) meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) || null;
      } catch {
        meta = null;
      }

      const version = meta?.version || parsed?.version || parsed?.meta?.version || '0.0.1';
      const description = meta?.description || parsed?.description || parsed?.meta?.description || '';
      const categories = Array.isArray(meta?.categories) ? meta.categories : (Array.isArray(parsed?.categories) ? parsed.categories : (parsed?.meta?.categories || []));
      const changelog = Array.isArray(meta?.changelog) ? meta.changelog : [];

      return {
        file,
        path: `policy-packs/${file}`,
        name: parsed?.name || file.replace(/\.ya?ml$/, ''),
        description,
        version,
        categories,
        rules,
        changelog,
        modifiedAt: stat ? stat.mtimeMs : 0,
      };
    });

  return res.json({ ok: true, packs });
});

// Upload a policy pack YAML file and persist to policy-packs/
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
app.post('/api/policy/packs/upload', upload.single('file'), (req, res) => {
  if (!req.file || !req.file.originalname) {
    return res.status(400).json({ ok: false, error: 'No file uploaded' });
  }

  const original = String(req.file.originalname || 'uploaded.yaml');
  // Normalize name and ensure .yaml extension
  const ext = original.match(/\.ya?ml$/i) ? original.match(/\.ya?ml$/i)[0] : '.yaml';
  const base = original.replace(/\.ya?ml$/i, '');
  const safeName = safeSlug(base) + ext;

  const packsDir = path.join(process.cwd(), 'policy-packs');
  if (!fs.existsSync(packsDir)) fs.mkdirSync(packsDir, { recursive: true });

  const targetPath = path.join(packsDir, safeName);
  try {
    backupIfExists(targetPath);
    fs.writeFileSync(targetPath, req.file.buffer);

    // attempt to parse YAML to detect invalid uploads (non-fatal)
    try {
      const parsed = yaml.parse(req.file.buffer.toString('utf8'));
      // optionally could validate structure here
    } catch (e) {
      // keep the file but warn
      return res.json({ ok: true, warning: 'Uploaded file saved but failed to parse as YAML', file: `policy-packs/${safeName}` });
    }

    return res.json({ ok: true, file: `policy-packs/${safeName}` });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'failed to save uploaded pack', details: String(err) });
  }
});

// Upload with versioning and metadata (.meta.json)
app.post('/api/policy/packs/upload-with-version', upload.single('file'), (req, res) => {
  if (!req.file || !req.file.originalname) {
    return res.status(400).json({ ok: false, error: 'No file uploaded' });
  }

  const original = String(req.file.originalname || 'uploaded.yaml');
  const ext = original.match(/\.ya?ml$/i) ? original.match(/\.ya?ml$/i)[0] : '.yaml';
  const base = original.replace(/\.ya?ml$/i, '');
  const safeName = safeSlug(base) + ext;

  const packsDir = path.join(process.cwd(), 'policy-packs');
  if (!fs.existsSync(packsDir)) fs.mkdirSync(packsDir, { recursive: true });

  const targetPath = path.join(packsDir, safeName);
  const metaPath = path.join(packsDir, `${safeName}.meta.json`);

  // helper to bump patch version (semver simple)
  function bumpPatch(v) {
    try {
      const parts = String(v || '0.0.0').split('.').map((p) => parseInt(p || '0', 10));
      if (parts.length < 3) while (parts.length < 3) parts.push(0);
      parts[2] = (isFinite(parts[2]) ? parts[2] : 0) + 1;
      return `${parts[0]}.${parts[1]}.${parts[2]}`;
    } catch (e) {
      return '0.0.1';
    }
  }

  try {
    // write YAML file (backup existing)
    backupIfExists(targetPath);
    fs.writeFileSync(targetPath, req.file.buffer);

    // parse YAML (non-fatal)
    let parsed = null;
    try {
      parsed = yaml.parse(req.file.buffer.toString('utf8')) || {};
    } catch (e) {
      // save meta warning and continue
      const meta = { version: '0.0.1', uploadedAt: Date.now(), changelog: [{ version: '0.0.1', note: 'uploaded (parse failed)', at: Date.now() }] };
      try { fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8'); } catch {};
      return res.json({ ok: true, warning: 'Uploaded file saved but failed to parse as YAML', file: `policy-packs/${safeName}`, meta });
    }

    // read existing meta if any
    let existingMeta = null;
    try {
      if (fs.existsSync(metaPath)) existingMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) || null;
    } catch {}

    const incomingVersion = parsed?.version || parsed?.meta?.version || null;
    let newVersion = '0.0.1';
    let changelog = [];

    if (existingMeta && existingMeta.version) {
      // if incomingVersion provided and different and greater? use incomingVersion, else bump
      if (incomingVersion && incomingVersion !== existingMeta.version) {
        newVersion = incomingVersion;
        changelog = Array.isArray(existingMeta.changelog) ? existingMeta.changelog.slice() : [];
        changelog.unshift({ version: newVersion, note: 'uploaded (incoming version)', at: Date.now() });
      } else {
        newVersion = bumpPatch(existingMeta.version);
        changelog = Array.isArray(existingMeta.changelog) ? existingMeta.changelog.slice() : [];
        changelog.unshift({ version: newVersion, note: 'auto bump patch on upload', at: Date.now() });
      }
    } else if (incomingVersion) {
      newVersion = incomingVersion;
      changelog = [{ version: newVersion, note: 'uploaded (incoming version)', at: Date.now() }];
    } else {
      newVersion = '0.0.1';
      changelog = [{ version: newVersion, note: 'initial upload', at: Date.now() }];
    }

    const meta = {
      name: parsed?.name || base,
      description: parsed?.description || parsed?.meta?.description || '',
      version: newVersion,
      uploadedAt: Date.now(),
      changelog,
    };

    try {
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
    } catch (e) {
      // non-fatal
    }

    return res.json({ ok: true, file: `policy-packs/${safeName}`, meta });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'failed to save uploaded pack', details: String(err) });
  }
});

// Delete a policy pack by filename (requires name, backed up before deletion)
app.post('/api/policy/packs/delete', (req, res) => {
  const name = typeof req.body?.name === 'string' ? String(req.body.name).trim() : '';
  if (!name) return res.status(400).json({ ok: false, error: 'Missing pack name' });

  // only allow yaml files
  if (!name.match(/\.ya?ml$/i)) return res.status(400).json({ ok: false, error: 'Invalid pack name' });

  const packsDir = path.join(process.cwd(), 'policy-packs');
  const targetPath = path.join(packsDir, name);
  const resolved = path.resolve(targetPath);
  if (!resolved.startsWith(path.resolve(process.cwd()))) return res.status(400).json({ ok: false, error: 'Invalid path' });
  if (!fs.existsSync(resolved)) return res.status(404).json({ ok: false, error: 'Pack not found' });

  try {
    // move to archive folder instead of permanent delete
    const archiveDir = path.join(packsDir, 'archive');
    if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
    const destName = `${Date.now()}_${name}`;
    const destPath = path.join(archiveDir, destName);
    try {
      fs.renameSync(resolved, destPath);
    } catch (e) {
      // fallback to copy + unlink
      fs.copyFileSync(resolved, destPath);
      fs.unlinkSync(resolved);
    }
    return res.json({ ok: true, archivedTo: `policy-packs/archive/${destName}` });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to archive pack', details: String(err) });
  }
});

// List archived policy packs
app.get('/api/policy/packs/archive', (req, res) => {
  const archiveDir = path.join(process.cwd(), 'policy-packs', 'archive');
  if (!fs.existsSync(archiveDir)) return res.json({ ok: true, archives: [] });
  try {
    const files = fs.readdirSync(archiveDir)
      .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map((file) => {
        return {
          file,
          path: `policy-packs/archive/${file}`,
          originalName: file.replace(/^[0-9]+_/, ''),
          archivedAt: Number((file.match(/^([0-9]+)_/) || [])[1] || 0),
        };
      });
    return res.json({ ok: true, archives: files });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to list archive', details: String(err) });
  }
});

// Restore an archived pack back to policy-packs
app.post('/api/policy/packs/restore', (req, res) => {
  const archived = typeof req.body?.archived === 'string' ? String(req.body.archived).trim() : '';
  if (!archived) return res.status(400).json({ ok: false, error: 'Missing archived filename' });

  const archiveDir = path.join(process.cwd(), 'policy-packs', 'archive');
  const srcPath = path.join(archiveDir, archived);
  const resolved = path.resolve(srcPath);
  if (!resolved.startsWith(path.resolve(process.cwd()))) return res.status(400).json({ ok: false, error: 'Invalid path' });
  if (!fs.existsSync(resolved)) return res.status(404).json({ ok: false, error: 'Archived pack not found' });

  const originalName = archived.replace(/^[0-9]+_/, '');
  const destPath = path.join(process.cwd(), 'policy-packs', originalName);
  try {
    // if dest exists, backup
    if (fs.existsSync(destPath)) backupIfExists(destPath);
    try {
      fs.renameSync(resolved, destPath);
    } catch (e) {
      fs.copyFileSync(resolved, destPath);
      fs.unlinkSync(resolved);
    }
    return res.json({ ok: true, restoredTo: `policy-packs/${originalName}` });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to restore', details: String(err) });
  }
});

app.get('/api/ui/bootstrap', (req, res) => {
  const findingsPath = safeResolveFindingsPath(req.query.findings);
  if (!findingsPath || !fs.existsSync(findingsPath)) {
    return res.status(404).json({ error: 'Findings file not found', file: findingsPath });
  }

  const findings = readJsonFileSafe(findingsPath) || {};
  const findingsSummary = buildFindingsSummary(findings);
  const prFindings = readJsonFileSafe(safeResolveWorkspacePath(null, 'tmp/findings_pr.json')) || { violations: [] };
  const prSummary = readJsonFileSafe(safeResolveWorkspacePath(null, 'tmp/findings_pr_summary.json')) || {};
  const sbom = readJsonFileSafe(safeResolveWorkspacePath(null, 'tmp/sbom_risk.json'))
    || readJsonFileSafe(safeResolveWorkspacePath(null, 'tmp/sbom_risk_pr.json'))
    || { entries: [] };
  const trends = readJsonFileSafe(safeResolveWorkspacePath(null, 'analytics/trends_history.json')) || { history: [] };
  const remediationStorePath = path.join(process.cwd(), 'config', 'remediation-tracker.json');
  const remediationStore = normalizeRemediationStore(readJsonFileSafe(remediationStorePath) || {});

  // optionally include persisted UI config (ciUrl)
  const uiConfigPath = path.join(process.cwd(), 'config', 'ui-config.json');
  const uiConfig = readJsonFileSafe(uiConfigPath) || {};

  return res.json({
    ok: true,
    context: {
      repository: process.env.GITHUB_REPOSITORY || null,
      actionsUrl: process.env.GITHUB_REPOSITORY ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions` : null,
      ciUrl: uiConfig?.ciUrl || null,
      jiraBaseUrl: uiConfig?.jiraBaseUrl || process.env.JIRA_BASE_URL || null,
      saveEnabled: isSaveEnabled(),
      githubActionsEnabled: process.env.POLICY_UI_ENABLE_GITHUB === '1',
    },
    findings: {
      file: findingsPath,
      raw: findings,
      summary: findingsSummary,
      remediationTracker: remediationStore.entries,
    },
    pr: {
      totalViolations: Array.isArray(prFindings.violations) ? prFindings.violations.length : 0,
      bySeverity: prSummary.remainingBySeverity || buildFindingsSummary(prFindings).bySeverity,
      topViolations: Array.isArray(prFindings.violations) ? prFindings.violations.slice(0, 10) : [],
    },
    sbom: {
      totalAtRiskPackages: sbom.totalAtRiskPackages || 0,
      criticalPackages: sbom.criticalPackages || 0,
      entries: Array.isArray(sbom.entries) ? sbom.entries : [],
    },
    trends: {
      history: Array.isArray(trends.history) ? trends.history : [],
    },
  });
});

app.get('/api/ui/capabilities', (req, res) => {
  return res.json({
    ok: true,
    capabilities: {
      saveRule: isSaveEnabled(),
      githubActions: process.env.POLICY_UI_ENABLE_GITHUB === '1',
      githubProfile: true,
    },
  });
});

app.get('/api/ui/ci-url', (req, res) => {
  const uiConfigPath = path.join(process.cwd(), 'config', 'ui-config.json');
  const uiConfig = readJsonFileSafe(uiConfigPath) || {};
  return res.json({ ok: true, ciUrl: uiConfig.ciUrl || null, file: uiConfigPath });
});

app.post('/api/ui/ci-url', (req, res) => {
  const uiConfigPath = path.join(process.cwd(), 'config', 'ui-config.json');
  const raw = readJsonFileSafe(uiConfigPath) || {};
  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'ciUrl')) {
    const ciUrl = typeof req.body?.ciUrl === 'string' ? String(req.body.ciUrl).trim() : '';
    raw.ciUrl = ciUrl || null;
  }
  try {
    writeJsonWithBackup(uiConfigPath, raw);
    return res.json({ ok: true, ciUrl: raw.ciUrl, file: uiConfigPath });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'failed to write ui config', details: String(err) });
  }
});

app.post('/api/ui/github-username', (req, res) => {
  const uiConfigPath = path.join(process.cwd(), 'config', 'ui-config.json');
  const raw = readJsonFileSafe(uiConfigPath) || {};
  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'githubUsername')) {
    const username = typeof req.body?.githubUsername === 'string' ? String(req.body.githubUsername).trim() : '';
    raw.githubProfileUsername = username || null;
  }
  try {
    writeJsonWithBackup(uiConfigPath, raw);
    return res.json({ ok: true, githubProfileUsername: raw.githubProfileUsername, file: uiConfigPath });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'failed to write ui config', details: String(err) });
  }
});

app.get('/api/ui/jira-url', (req, res) => {
  const uiConfigPath = path.join(process.cwd(), 'config', 'ui-config.json');
  const uiConfig = readJsonFileSafe(uiConfigPath) || {};
  return res.json({ ok: true, jiraBaseUrl: uiConfig.jiraBaseUrl || process.env.JIRA_BASE_URL || null, file: uiConfigPath });
});

app.post('/api/ui/jira-url', (req, res) => {
  const uiConfigPath = path.join(process.cwd(), 'config', 'ui-config.json');
  const raw = readJsonFileSafe(uiConfigPath) || {};
  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'jiraBaseUrl')) {
    const jiraBaseUrl = typeof req.body?.jiraBaseUrl === 'string' ? String(req.body.jiraBaseUrl).trim() : '';
    raw.jiraBaseUrl = jiraBaseUrl || null;
  }
  try {
    writeJsonWithBackup(uiConfigPath, raw);
    return res.json({ ok: true, jiraBaseUrl: raw.jiraBaseUrl, file: uiConfigPath });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'failed to write ui config', details: String(err) });
  }
});

app.post('/api/actions/run-analysis', (req, res) => {
  const outDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `findings_ui_action_${Date.now()}.json`);

  const resolvedPolicy = resolveAnalysisPolicyFile(req.body?.file || req.body?.policyFile);
  if (!resolvedPolicy.ok) {
    return res.status(resolvedPolicy.status || 400).json({ ok: false, error: resolvedPolicy.error });
  }

  runAnalysisToFile(outFile, resolvedPolicy.relativePath, (error, findings) => {
    if (error || !findings) {
      return res.status(500).json({ ok: false, error: 'Failed to run analysis', details: String(error) });
    }

    return res.json({
      ok: true,
      outFile,
      policyFile: resolvedPolicy.relativePath,
      summary: buildFindingsSummary(findings),
    });
  });
});

app.post('/api/actions/assign-finding', (req, res) => {
  const finding = req.body?.finding;
  const owner = String(req.body?.owner || '').trim();
  const patternInput = String(req.body?.pattern || '').trim();
  if (!finding || !owner) {
    return res.status(400).json({ ok: false, error: 'Missing finding or owner' });
  }

  const inferredPattern = patternInput
    || String(finding.moduleId || finding.area || finding.from || '').trim();
  if (!inferredPattern) {
    return res.status(400).json({ ok: false, error: 'Could not infer ownership pattern for finding' });
  }

  const ownershipPath = path.join(process.cwd(), 'config', 'ownership-map.json');
  const raw = readJsonFileSafe(ownershipPath) || {};
  const normalized = normalizeOwnerMap(raw);

  const existing = normalized.owners.find((item) => item?.pattern === inferredPattern);
  if (existing) {
    existing.owner = owner;
  } else {
    normalized.owners.push({ pattern: inferredPattern, owner });
  }

  writeJsonWithBackup(ownershipPath, normalized);
  const remediationStorePath = path.join(process.cwd(), 'config', 'remediation-tracker.json');
  const remediation = upsertRemediationEntry(remediationStorePath, {
    finding,
    assignee: owner,
    status: 'in-progress',
    source: 'assign-finding',
    note: `Assigned ownership pattern ${inferredPattern}`,
  });

  return res.json({ ok: true, ownershipPath, pattern: inferredPattern, owner, remediation });
});

app.post('/api/actions/ignore-finding', (req, res) => {
  const finding = req.body?.finding;
  const reason = String(req.body?.reason || '').trim() || 'Ignored via UI action';
  const owner = String(req.body?.owner || '').trim() || 'unowned';
  const expiresAt = String(req.body?.expiresAt || '').trim() || null;
  if (!finding) {
    return res.status(400).json({ ok: false, error: 'Missing finding' });
  }

  const baselinePath = path.join(process.cwd(), 'config', 'archguard-baseline.json');
  const raw = readJsonFileSafe(baselinePath) || {};
  const normalized = normalizeBaselineConfig(raw);

  const entry = {
    ruleId: finding.ruleId || finding.rule || finding.id || undefined,
    type: finding.type || undefined,
    moduleId: finding.moduleId || finding.area || undefined,
    from: finding.from || undefined,
    to: finding.to || undefined,
    severity: finding.severity ? String(finding.severity).toLowerCase() : undefined,
    messageContains: finding.message || undefined,
    reason,
    owner,
    ...(expiresAt ? { expiresAt } : {}),
  };

  const dedupeKey = JSON.stringify({
    ruleId: entry.ruleId,
    type: entry.type,
    moduleId: entry.moduleId,
    from: entry.from,
    to: entry.to,
    severity: entry.severity,
    messageContains: entry.messageContains,
  });

  const exists = normalized.ignoredViolations.some((item) => {
    const key = JSON.stringify({
      ruleId: item.ruleId,
      type: item.type,
      moduleId: item.moduleId,
      from: item.from,
      to: item.to,
      severity: item.severity,
      messageContains: item.messageContains,
    });
    return key === dedupeKey;
  });

  if (!exists) normalized.ignoredViolations.push(entry);
  writeJsonWithBackup(baselinePath, normalized);
  const remediationStorePath = path.join(process.cwd(), 'config', 'remediation-tracker.json');
  const remediation = upsertRemediationEntry(remediationStorePath, {
    finding,
    assignee: owner,
    dueDate: expiresAt || '',
    status: 'done',
    source: 'ignore-finding',
    note: reason,
  });

  return res.json({ ok: true, baselinePath, ignoredViolations: normalized.ignoredViolations.length, existed: exists, remediation });
});

app.get('/api/actions/remediation-tracker', (req, res) => {
  const remediationStorePath = path.join(process.cwd(), 'config', 'remediation-tracker.json');
  const normalized = normalizeRemediationStore(readJsonFileSafe(remediationStorePath) || {});
  return res.json({ ok: true, storePath: remediationStorePath, entries: normalized.entries });
});

app.post('/api/actions/remediation-plan', (req, res) => {
  const finding = req.body?.finding;
  if (!finding || typeof finding !== 'object') {
    return res.status(400).json({ ok: false, error: 'Missing finding object' });
  }

  const statusRaw = String(req.body?.status || 'open').trim().toLowerCase();
  const status = ['open', 'in-progress', 'done'].includes(statusRaw) ? statusRaw : 'open';
  const assignee = String(req.body?.assignee || '').trim();
  const dueDate = String(req.body?.dueDate || '').trim();
  const confidenceRaw = String(req.body?.confidence || 'low').trim().toLowerCase();
  const confidence = ['high', 'medium', 'low'].includes(confidenceRaw) ? confidenceRaw : 'low';
  const note = String(req.body?.note || '').trim();

  const remediationStorePath = path.join(process.cwd(), 'config', 'remediation-tracker.json');
  const remediation = upsertRemediationEntry(remediationStorePath, {
    finding,
    status,
    assignee,
    dueDate,
    confidence,
    source: 'remediation-plan',
    note,
  });

  return res.json({ ok: true, remediation, storePath: remediationStorePath });
});

app.post('/api/actions/create-issue-link', (req, res) => {
  const finding = req.body?.finding;
  if (!finding || typeof finding !== 'object') {
    return res.status(400).json({ ok: false, error: 'Missing finding object' });
  }

  const targetRaw = String(req.body?.target || 'auto').trim().toLowerCase();
  const target = ['auto', 'github', 'jira'].includes(targetRaw) ? targetRaw : 'auto';
  const assignee = String(req.body?.assignee || '').trim();
  const dueDate = String(req.body?.dueDate || '').trim();
  const statusRaw = String(req.body?.status || 'in-progress').trim().toLowerCase();
  const status = ['open', 'in-progress', 'done'].includes(statusRaw) ? statusRaw : 'in-progress';
  const confidenceRaw = String(req.body?.confidence || 'medium').trim().toLowerCase();
  const confidence = ['high', 'medium', 'low'].includes(confidenceRaw) ? confidenceRaw : 'medium';

  const issueTargets = buildIssueTargetsForFinding(finding, {
    repository: req.body?.repository,
    jiraBaseUrl: req.body?.jiraBaseUrl,
  });

  const selectedUrl =
    target === 'github' ? issueTargets.githubUrl :
    target === 'jira' ? issueTargets.jiraUrl :
    (issueTargets.githubUrl || issueTargets.jiraUrl || null);

  if (!selectedUrl) {
    return res.status(400).json({ ok: false, error: 'No issue target available (missing repository and Jira base URL)' });
  }

  const issuePayload = {
    target: target === 'auto' ? (issueTargets.githubUrl ? 'github' : 'jira') : target,
    url: selectedUrl,
    title: issueTargets.title,
    openedAt: new Date().toISOString(),
  };

  const remediationStorePath = path.join(process.cwd(), 'config', 'remediation-tracker.json');
  const remediation = upsertRemediationEntry(remediationStorePath, {
    finding,
    status,
    assignee,
    dueDate,
    confidence,
    issue: issuePayload,
    source: 'create-issue-link',
    note: `Issue prepared: ${selectedUrl}`,
  });

  return res.json({
    ok: true,
    issue: issuePayload,
    links: {
      githubUrl: issueTargets.githubUrl,
      jiraUrl: issueTargets.jiraUrl,
    },
    remediation,
    storePath: remediationStorePath,
  });
});

app.post('/api/actions/save-rule', (req, res) => {
  if (!isSaveEnabled()) {
    return res.status(403).json({ ok: false, error: 'Saving disabled. Set POLICY_UI_ENABLE_SAVE=1 in production.' });
  }

  const rule = req.body?.rule;
  if (!rule || typeof rule !== 'object') {
    return res.status(400).json({ ok: false, error: 'Missing rule object' });
  }

  const policyPath = path.join(process.cwd(), 'examples', 'policy.yaml');
  if (!fs.existsSync(policyPath)) {
    return res.status(404).json({ ok: false, error: 'Policy file not found' });
  }

  try {
    const raw = fs.readFileSync(policyPath, 'utf8');
    const policy = yaml.parse(raw) || {};
    policy.rules = Array.isArray(policy.rules) ? policy.rules : [];

    const normalizedRule = {
      ...rule,
      id: String(rule.id || defaultRuleId()),
      type: String(rule.type || 'forbidden_dependency'),
    };

    const idx = policy.rules.findIndex((item) => String(item?.id || '') === normalizedRule.id);
    if (idx >= 0) policy.rules[idx] = normalizedRule;
    else policy.rules.push(normalizedRule);

    const valid = validatePolicy(policy);
    if (!valid) {
      return res.status(400).json({ ok: false, error: 'Policy validation failed', details: validatePolicy.errors });
    }

    backupIfExists(policyPath);
    fs.writeFileSync(policyPath, yaml.stringify(policy), 'utf8');
    return res.json({ ok: true, policyPath, ruleId: normalizedRule.id, updated: idx >= 0 });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Failed to save rule', details: String(error) });
  }
});

app.post('/api/actions/mark-removal', (req, res) => {
  const packageName = String(req.body?.packageName || '').trim();
  if (!packageName) {
    return res.status(400).json({ ok: false, error: 'Missing packageName' });
  }

  const requestsDir = path.join(process.cwd(), 'tmp', 'removal_requests');
  const requestFile = path.join(requestsDir, `${safeSlug(packageName)}.${Date.now()}.json`);
  const payload = {
    packageName,
    requestedAt: new Date().toISOString(),
    requestedBy: req.body?.requestedBy || 'ui-user',
    status: 'queued',
    note: 'Generated from ARCHGUARD UI Mark for Removal action',
  };
  writeJsonWithBackup(requestFile, payload);

  if (process.env.POLICY_UI_ENABLE_GITHUB !== '1') {
    return res.json({
      ok: true,
      queued: true,
      triggeredWorkflow: false,
      requestFile,
      message: 'Removal request queued locally. Enable POLICY_UI_ENABLE_GITHUB=1 to auto-trigger migration PR workflow.',
    });
  }

  const cmd = `gh workflow run auto-migration-pr.yml`;
  exec(cmd, { cwd: process.cwd(), env: process.env }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({
        ok: false,
        queued: true,
        triggeredWorkflow: false,
        requestFile,
        error: 'Failed to trigger auto-migration workflow',
        details: stderr || String(error),
      });
    }

    return res.json({
      ok: true,
      queued: true,
      triggeredWorkflow: true,
      requestFile,
      stdout,
      stderr,
      message: 'Auto-migration workflow dispatched. Check GitHub Actions for PR creation progress.',
    });
  });
});

app.get('/figma-ui/*', (req, res, next) => {
  if (!fs.existsSync(figmaUiDistDir)) return next();
  const indexPath = path.join(figmaUiDistDir, 'index.html');
  if (!fs.existsSync(indexPath)) return next();
  return res.sendFile(indexPath);
});

app.get('/favicon.ico', (req, res) => {
  const distIcon = path.join(figmaUiDistDir, 'favicon.ico');
  if (fs.existsSync(distIcon)) {
    return res.sendFile(distIcon);
  }
  return res.status(204).end();
});

app.get('/api/policy', (req, res) => {
  const requestedFile = String(req.query?.file || '').trim();
  const resolved = resolveAnalysisPolicyFile(requestedFile || 'examples/policy.yaml');
  if (!resolved.ok) {
    return res.status(resolved.status || 400).json({ ok: false, error: resolved.error });
  }

  const txt = fs.readFileSync(resolved.absPath, 'utf8');
  try {
    const parsed = yaml.parse(txt);
    return res.json({ ok: true, policy: parsed, raw: txt, file: resolved.relativePath });
  } catch (err) {
    return res.status(500).json({ error: 'failed to parse policy', details: String(err) });
  }
});

app.get('/api/policy/history', (req, res) => {
  try {
    const entries = getPolicyHistoryEntries();
    return res.json({ ok: true, entries, count: entries.length });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'failed to list policy history', details: String(error) });
  }
});

app.post('/api/policy/history/restore', (req, res) => {
  if (!isSaveEnabled()) {
    return res.status(403).json({ ok: false, error: 'Saving disabled on this server' });
  }

  const backupFile = typeof req.body?.backupFile === 'string' ? String(req.body.backupFile).trim() : '';
  if (!backupFile) {
    return res.status(400).json({ ok: false, error: 'Missing backupFile' });
  }

  if (!/^policy\.ya?ml\.[0-9]+\.bak$/i.test(backupFile)) {
    return res.status(400).json({ ok: false, error: 'Invalid backup filename' });
  }

  const examplesDir = path.join(process.cwd(), 'examples');
  const backupPath = path.join(examplesDir, backupFile);
  const policyPath = path.join(examplesDir, 'policy.yaml');
  const resolvedBackup = path.resolve(backupPath);
  const resolvedExamples = path.resolve(examplesDir);
  if (!resolvedBackup.startsWith(resolvedExamples)) {
    return res.status(400).json({ ok: false, error: 'Invalid backup path' });
  }
  if (!fs.existsSync(resolvedBackup)) {
    return res.status(404).json({ ok: false, error: 'Backup not found' });
  }

  try {
    const raw = fs.readFileSync(resolvedBackup, 'utf8');
    const parsed = yaml.parse(raw);
    const valid = validatePolicy(parsed);
    if (!valid) {
      return res.status(400).json({ ok: false, error: 'Backup policy validation failed', details: validatePolicy.errors });
    }

    if (fs.existsSync(policyPath)) {
      backupIfExists(policyPath);
    }
    fs.writeFileSync(policyPath, raw, 'utf8');

    return res.json({
      ok: true,
      restoredFrom: backupFile,
      activeFile: 'examples/policy.yaml',
      savedTo: policyPath,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'failed to restore policy backup', details: String(error) });
  }
});

// Save edited policy (requires enabling via env var POLICY_UI_ENABLE_SAVE=1)
app.post('/api/policy', (req, res) => {
  if (!isSaveEnabled()) {
    return res.status(403).json({ error: 'Saving disabled on this server' });
  }

  const { raw } = req.body || {};
  if (!raw || typeof raw !== 'string') return res.status(400).json({ error: 'Missing raw policy content' });

  // validate raw YAML against schema before saving
  let parsed;
  try {
    parsed = yaml.parse(raw);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid YAML', details: String(e) });
  }
  const valid = validatePolicy(parsed);
  if (!valid) return res.status(400).json({ error: 'Policy validation failed', details: validatePolicy.errors });

  const policyPath = path.join(process.cwd(), 'examples', 'policy.yaml');
  try {
    // backup existing
    if (fs.existsSync(policyPath)) {
      const bak = `${policyPath}.${Date.now()}.bak`;
      fs.copyFileSync(policyPath, bak);
    }
    fs.writeFileSync(policyPath, raw, 'utf8');
    return res.json({ ok: true, savedTo: policyPath });
  } catch (err) {
    return res.status(500).json({ error: 'failed to save', details: String(err) });
  }
});

// Evaluate policy by running the CLI. Enabled only when POLICY_UI_ENABLE_EVAL=1
app.post('/api/evaluate', (req, res) => {
  if (process.env.POLICY_UI_ENABLE_EVAL !== '1') {
    return res.status(403).json({ error: 'Evaluation disabled on this server' });
  }

  const outDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `findings_ui_${Date.now()}.json`);

  const cmd = `node ./src/cli.js --policy examples/policy.yaml --out ${outFile} --fail-on critical`;

  exec(cmd, { cwd: process.cwd(), env: process.env }, (err, stdout, stderr) => {
    if (err) {
      // CLI may exit with non-zero when violations found; still attempt to read output
    }
    if (!fs.existsSync(outFile)) {
      return res.status(500).json({ error: 'Analysis failed', stdout, stderr });
    }
    try {
      const txt = fs.readFileSync(outFile, 'utf8');
      const j = JSON.parse(txt);
      return res.json({ ok: true, findings: j });
    } catch (e) {
      return res.status(500).json({ error: 'failed to read findings', details: String(e) });
    }
  });
});

// Convert structured policy JSON -> YAML (no save)
app.post('/api/policy/convert', (req, res) => {
  const { policy } = req.body || {};
  if (!policy) return res.status(400).json({ error: 'Missing policy object' });
  try {
    const raw = yaml.stringify(policy);
    return res.json({ ok: true, raw });
  } catch (err) {
    return res.status(500).json({ error: 'conversion failed', details: String(err) });
  }
});

// Add schema and validation using Ajv
const ajv = new Ajv({ allErrors: true });
const policySchema = {
  type: 'object',
  properties: {
    rules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['forbidden_dependency','max_fan_in','max_fan_out','no_cycles','layer_matrix'] },
          from: { type: 'string' },
          to: { type: 'string' },
          threshold: { type: 'number' },
          allowSameLayer: { type: 'boolean' }
        },
        required: ['type'],
        additionalProperties: true
      }
    }
  },
  additionalProperties: true
};
const validatePolicy = ajv.compile(policySchema);

// Save edited policy and create branch + PR using gh (requires POLICY_UI_ENABLE_GITHUB=1)
app.post('/api/save_and_pr', (req, res) => {
  if (process.env.POLICY_UI_ENABLE_GITHUB !== '1') {
    return res.status(403).json({ error: 'GitHub flow disabled on this server' });
  }
  const { raw, branch, title, body } = req.body || {};
  if (!raw || !branch || !title) return res.status(400).json({ error: 'Missing raw, branch or title' });

  const policyPath = path.join(process.cwd(), 'examples', 'policy.yaml');
  const backup = `${policyPath}.${Date.now()}.bak`;
  try {
    if (fs.existsSync(policyPath)) fs.copyFileSync(policyPath, backup);
    fs.writeFileSync(policyPath, raw, 'utf8');
  } catch (err) {
    return res.status(500).json({ error: 'failed to write policy', details: String(err) });
  }

  // validate saved policy
  try {
    const parsed = yaml.parse(raw);
    const ok = validatePolicy(parsed);
    if (!ok) return res.status(400).json({ error: 'Policy validation failed', details: validatePolicy.errors });
  } catch (e) {
    return res.status(400).json({ error: 'Invalid YAML', details: String(e) });
  }

  // Simple guarded git + gh flow
  const safeBranch = branch.replace(/[^a-zA-Z0-9_\-\/]/g, '-');
  const commitMsg = `chore(policy): update via Policy UI`;
  const cmds = [
    `git checkout -b ${safeBranch}`,
    `git add ${policyPath}`,
    `git commit -m "${commitMsg}" || true`,
    `git push -u origin ${safeBranch}`,
    `gh pr create --title "${title.replace(/"/g, '\\"')}" --body "${(body||'').replace(/"/g, '\\"')}" --base main --head ${safeBranch} --fill`
  ].join(' && ');

  exec(cmds, { cwd: process.cwd(), env: process.env, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: 'git/gh flow failed', details: stderr || String(err) });
    }
    // try to extract PR url from stdout
    const match = stdout.match(/https:\/\/github.com\/[^\s]+\/pull\/\d+/);
    const prUrl = match ? match[0] : null;
    return res.json({ ok: true, stdout, stderr, prUrl });
  });
});

app.listen(port, () => {
  console.log(`Policy UI running at http://localhost:${port}/`);
  console.log(`Findings dashboard at http://localhost:${port}/findings-ui/`);
  if (fs.existsSync(figmaUiDistDir)) {
    console.log(`Figma UI at http://localhost:${port}/figma-ui/`);
  } else {
    console.log('Figma UI build not found. Run: npm --prefix FigmaUI install && npm --prefix FigmaUI run build');
  }
});
