#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'];

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
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function normalizeSeverityThreshold(value) {
  if (!value) return 'high';
  if (!SEVERITY_LEVELS.includes(value)) {
    throw new Error(`Invalid --min-severity value: ${value}`);
  }
  return value;
}

function severityAtLeast(severity, minSeverity) {
  const idx = SEVERITY_LEVELS.indexOf(severity);
  const minIdx = SEVERITY_LEVELS.indexOf(minSeverity);
  if (idx === -1) return false;
  return idx >= minIdx;
}

function defaultExpiresAt(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function normalizeBaseline(raw) {
  if (!raw || typeof raw !== 'object') return { ignoredViolations: [] };
  if (Array.isArray(raw)) return { ignoredViolations: raw };
  if (!Array.isArray(raw.ignoredViolations)) return { ignoredViolations: [] };
  return { ...raw, ignoredViolations: raw.ignoredViolations };
}

function signature(entry) {
  return [entry.ruleId, entry.type, entry.moduleId, entry.from, entry.to, entry.severity, entry.messageContains]
    .map((v) => (v === undefined ? '' : String(v)))
    .join('|');
}

function run() {
  const args = parseArgs(process.argv);
  const inputPath = args.in;
  const outputPath = args.out || 'tmp/baseline_suggestions.json';
  const mergePath = args.merge;
  const minSeverity = normalizeSeverityThreshold(args['min-severity']);
  const maxItems = Number(args.max || 20);
  const expiryDays = Number(args['expiry-days'] || 30);

  if (!inputPath) {
    console.error('Usage: node scripts/suggest_baseline.js --in <findings.json> [--out tmp/baseline_suggestions.json] [--merge config/archguard-baseline.json] [--min-severity high] [--max 20] [--expiry-days 30]');
    process.exit(2);
  }

  if (!Number.isFinite(maxItems) || maxItems <= 0) {
    console.error('Invalid --max value. Must be a positive number.');
    process.exit(2);
  }

  if (!Number.isFinite(expiryDays) || expiryDays <= 0) {
    console.error('Invalid --expiry-days value. Must be a positive number.');
    process.exit(2);
  }

  const findings = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const violations = Array.isArray(findings.violations) ? findings.violations : [];

  const selected = violations
    .filter((v) => severityAtLeast(v.severity, minSeverity))
    .slice(0, maxItems)
    .map((v) => ({
      ruleId: v.ruleId,
      type: v.type,
      moduleId: v.moduleId,
      from: v.from,
      to: v.to,
      severity: v.severity,
      messageContains: typeof v.message === 'string' ? v.message.slice(0, 120) : undefined,
      reason: 'temporary-legacy-exemption',
      expiresAt: defaultExpiresAt(expiryDays),
      owner: 'team-unknown',
    }));

  const cleaned = selected.map((entry) => {
    const out = {};
    for (const [k, v] of Object.entries(entry)) {
      if (v !== undefined && v !== null && String(v) !== '') {
        out[k] = v;
      }
    }
    return out;
  });

  let result = { ignoredViolations: cleaned };

  if (mergePath) {
    const existingRaw = fs.existsSync(mergePath)
      ? JSON.parse(fs.readFileSync(mergePath, 'utf8'))
      : { ignoredViolations: [] };
    const existing = normalizeBaseline(existingRaw);

    const seen = new Set(existing.ignoredViolations.map(signature));
    const merged = [...existing.ignoredViolations];
    for (const suggestion of cleaned) {
      const sig = signature(suggestion);
      if (!seen.has(sig)) {
        merged.push(suggestion);
        seen.add(sig);
      }
    }
    result = { ...existing, ignoredViolations: merged };
  }

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');

  console.log(`Input violations: ${violations.length}`);
  console.log(`Suggested entries: ${cleaned.length}`);
  console.log(`Output written: ${outputPath}`);
  if (mergePath) {
    console.log(`Merged with baseline: ${mergePath}`);
    console.log(`Final ignoredViolations count: ${result.ignoredViolations.length}`);
  }
}

run();
