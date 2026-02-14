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

function normalizeBaseline(raw) {
  if (!raw || typeof raw !== 'object') return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.ignoredViolations)) return raw.ignoredViolations;
  return [];
}

function parseIsoDate(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function splitBaselineByExpiry(entries, now = new Date()) {
  const activeEntries = [];
  const expiredEntries = [];
  const invalidExpiryEntries = [];

  for (const entry of entries) {
    const expiresAtRaw = entry?.expiresAt;
    if (expiresAtRaw === undefined) {
      activeEntries.push(entry);
      continue;
    }

    const expiresAt = parseIsoDate(expiresAtRaw);
    if (!expiresAt) {
      invalidExpiryEntries.push(entry);
      continue;
    }

    if (expiresAt.getTime() < now.getTime()) {
      expiredEntries.push(entry);
    } else {
      activeEntries.push(entry);
    }
  }

  return { activeEntries, expiredEntries, invalidExpiryEntries };
}

function matchesBaseline(violation, entry) {
  if (!entry || typeof entry !== 'object') return false;

  const fields = ['ruleId', 'type', 'moduleId', 'from', 'to', 'severity'];
  for (const field of fields) {
    if (entry[field] !== undefined && entry[field] !== violation[field]) {
      return false;
    }
  }

  if (
    entry.messageContains !== undefined &&
    typeof violation.message === 'string' &&
    !violation.message.includes(entry.messageContains)
  ) {
    return false;
  }

  if (entry.messageContains !== undefined && typeof violation.message !== 'string') {
    return false;
  }

  return true;
}

function shouldFail(violations, failOn) {
  const thresholdIndex = SEVERITY_LEVELS.indexOf(failOn);
  return violations.some((violation) => {
    const index = SEVERITY_LEVELS.indexOf(violation.severity);
    return index >= thresholdIndex;
  });
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function countBySeverity(violations) {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const violation of violations) {
    if (counts[violation.severity] !== undefined) {
      counts[violation.severity] += 1;
    }
  }
  return counts;
}

function run() {
  const args = parseArgs(process.argv);
  const inputPath = args.in;
  const outputPath = args.out;
  const baselinePath = args.baseline;
  const failOn = args['fail-on'] || 'high';
  const summaryPath = args.summary;
  const failOnExpired = args['fail-on-expired'] === undefined ? true : args['fail-on-expired'] !== 'false';

  if (!inputPath || !outputPath || !baselinePath) {
    console.error('Usage: node scripts/apply_baseline.js --in <findings.json> --out <filtered.json> --baseline <baseline.json> [--fail-on high] [--summary <summary.json>] [--fail-on-expired true|false]');
    process.exit(2);
  }

  if (!SEVERITY_LEVELS.includes(failOn)) {
    console.error('Invalid --fail-on value. Use low, medium, high, or critical.');
    process.exit(2);
  }

  const report = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const baselineRaw = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const baseline = normalizeBaseline(baselineRaw);
  const { activeEntries, expiredEntries, invalidExpiryEntries } = splitBaselineByExpiry(baseline);

  const originalViolations = Array.isArray(report.violations) ? report.violations : [];
  const filteredViolations = originalViolations.filter(
    (violation) => !activeEntries.some((entry) => matchesBaseline(violation, entry))
  );

  const filteredReport = {
    ...report,
    violations: filteredViolations,
    baseline: {
      baselineEntries: baseline.length,
      activeEntries: activeEntries.length,
      expiredEntries: expiredEntries.length,
      invalidExpiryEntries: invalidExpiryEntries.length,
      ignoredViolations: originalViolations.length - filteredViolations.length,
      remainingViolations: filteredViolations.length,
    },
  };

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, JSON.stringify(filteredReport, null, 2), 'utf8');

  const summary = {
    generatedAt: new Date().toISOString(),
    failOn,
    failOnExpired,
    totalViolations: originalViolations.length,
    ignoredByBaseline: originalViolations.length - filteredViolations.length,
    remainingViolations: filteredViolations.length,
    remainingBySeverity: countBySeverity(filteredViolations),
    baselineEntries: baseline.length,
    activeBaselineEntries: activeEntries.length,
    expiredBaselineEntries: expiredEntries.length,
    invalidExpiryEntries: invalidExpiryEntries.length,
    shouldFail: shouldFail(filteredViolations, failOn),
  };

  if (summaryPath) {
    ensureDir(summaryPath);
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  }

  console.log(`Baseline entries: ${baseline.length}`);
  console.log(`Active baseline entries: ${activeEntries.length}`);
  console.log(`Expired baseline entries: ${expiredEntries.length}`);
  console.log(`Invalid-expiry baseline entries: ${invalidExpiryEntries.length}`);
  console.log(`Violations before baseline: ${originalViolations.length}`);
  console.log(`Violations ignored by baseline: ${summary.ignoredByBaseline}`);
  console.log(`Violations after baseline: ${filteredViolations.length}`);

  if (invalidExpiryEntries.length > 0) {
    console.error('Some baseline entries have invalid expiresAt format. Use ISO date format, for example: 2026-03-01T00:00:00.000Z');
    process.exit(1);
  }

  if (failOnExpired && expiredEntries.length > 0) {
    console.error('Baseline contains expired exemptions. Remove or renew expired entries.');
    process.exit(1);
  }

  if (summary.shouldFail) {
    console.error(`Policy violations exceed configured threshold after baseline filtering (--fail-on ${failOn}).`);
    process.exit(1);
  }
}

run();