#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function countBySeverity(violations) {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const v of violations) {
    if (counts[v.severity] !== undefined) {
      counts[v.severity] += 1;
    }
  }
  return counts;
}

function buildSnapshot(findings, env) {
  const violations = Array.isArray(findings.violations) ? findings.violations : [];
  const modules = Array.isArray(findings.moduleMetrics) ? findings.moduleMetrics : [];

  const topRiskModules = modules
    .slice()
    .sort((a, b) => (b.changeRiskScore || 0) - (a.changeRiskScore || 0))
    .slice(0, 5)
    .map((m) => ({ id: m.id, changeRiskScore: m.changeRiskScore || 0, owner: m.owner || 'unowned' }));

  return {
    capturedAt: new Date().toISOString(),
    findingsGeneratedAt: findings.generatedAt || null,
    branch: env.GITHUB_REF_NAME || env.BRANCH_NAME || null,
    commit: env.GITHUB_SHA || null,
    runId: env.GITHUB_RUN_ID || null,
    globalMetrics: findings.globalMetrics || {},
    riskSummary: findings.riskSummary || {},
    violationCount: violations.length,
    bySeverity: countBySeverity(violations),
    ownershipSummary: findings.ownership?.violationOwnerSummary || [],
    topRiskModules,
  };
}

function run() {
  const args = parseArgs(process.argv);
  const inputPath = args.in;
  const outPath = args.out || 'tmp/trend_snapshot.json';
  const historyPath = args.history || 'analytics/trends_history.json';
  const maxItems = Number(args.max || 200);

  if (!inputPath) {
    console.error('Usage: node scripts/snapshot_trends.js --in <findings.json> [--out tmp/trend_snapshot.json] [--history analytics/trends_history.json] [--max 200]');
    process.exit(2);
  }

  if (!Number.isFinite(maxItems) || maxItems <= 0) {
    console.error('Invalid --max value; must be a positive number.');
    process.exit(2);
  }

  const findings = readJson(path.resolve(inputPath), null);
  if (!findings) {
    console.error(`Findings file not found: ${inputPath}`);
    process.exit(2);
  }

  const snapshot = buildSnapshot(findings, process.env);
  ensureDir(path.resolve(outPath));
  fs.writeFileSync(path.resolve(outPath), JSON.stringify(snapshot, null, 2), 'utf8');

  const historyAbs = path.resolve(historyPath);
  const history = readJson(historyAbs, []);
  const normalizedHistory = Array.isArray(history) ? history : [];
  normalizedHistory.push(snapshot);

  const trimmed = normalizedHistory.slice(-maxItems);
  ensureDir(historyAbs);
  fs.writeFileSync(historyAbs, JSON.stringify(trimmed, null, 2), 'utf8');

  console.log(`Trend snapshot written: ${path.resolve(outPath)}`);
  console.log(`Trend history updated: ${historyAbs} (${trimmed.length} entries)`);
}

run();
