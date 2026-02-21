#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { analyzeProject, SEVERITY_LEVELS } from '../src/index.js';

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

function countBySeverity(violations) {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const violation of violations) {
    if (counts[violation.severity] !== undefined) {
      counts[violation.severity] += 1;
    }
  }
  return counts;
}

function normalizePolicyList(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolvePolicyPath(value, cwd) {
  if (value.endsWith('.yaml') || value.endsWith('.yml')) {
    return path.resolve(cwd, value);
  }
  return path.resolve(cwd, 'policy-packs', `${value}.yaml`);
}

function severityIndex(severity) {
  const idx = SEVERITY_LEVELS.indexOf(severity);
  return idx === -1 ? 0 : idx;
}

async function runScenario({ name, projectRoot, policyPath, failOn, tempDir }) {
  const outPath = path.join(tempDir, `${name.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`);
  const report = await analyzeProject({
    projectRoot,
    policyPath,
    outputPath: outPath,
    failOn,
    aiSummaryPath: undefined,
  });

  return {
    name,
    policyPath,
    outPath,
    violationCount: Array.isArray(report.violations) ? report.violations.length : 0,
    bySeverity: countBySeverity(Array.isArray(report.violations) ? report.violations : []),
  };
}

async function run() {
  const args = parseArgs(process.argv);
  const cwd = process.cwd();

  const projectRoot = path.resolve(cwd, args.project || '.');
  const basePolicy = path.resolve(cwd, args.base || 'examples/policy.yaml');
  const failOn = args['fail-on'] || 'high';
  const outPath = path.resolve(cwd, args.out || 'tmp/policy_simulation.json');
  const scenariosRaw = normalizePolicyList(args.scenarios || args.policies || 'strict,legacy-safe,frontend-heavy');

  if (!SEVERITY_LEVELS.includes(failOn)) {
    console.error('Invalid --fail-on value. Use low, medium, high, or critical.');
    process.exit(2);
  }

  if (scenariosRaw.length === 0) {
    console.error('No scenarios provided. Use --scenarios strict,legacy-safe or explicit yaml paths.');
    process.exit(2);
  }

  const tempDir = path.resolve(cwd, 'tmp', 'policy_sim');
  fs.mkdirSync(tempDir, { recursive: true });

  const base = await runScenario({
    name: 'base',
    projectRoot,
    policyPath: basePolicy,
    failOn,
    tempDir,
  });

  const scenarios = [];
  for (const entry of scenariosRaw) {
    const policyPath = resolvePolicyPath(entry, cwd);
    if (!fs.existsSync(policyPath)) {
      console.warn(`Skipping missing policy scenario: ${entry} -> ${policyPath}`);
      continue;
    }
    const result = await runScenario({
      name: entry,
      projectRoot,
      policyPath,
      failOn,
      tempDir,
    });
    scenarios.push({
      ...result,
      deltaVsBase: {
        total: result.violationCount - base.violationCount,
        low: result.bySeverity.low - base.bySeverity.low,
        medium: result.bySeverity.medium - base.bySeverity.medium,
        high: result.bySeverity.high - base.bySeverity.high,
        critical: result.bySeverity.critical - base.bySeverity.critical,
      },
      worstSeverityIndex: Math.max(
        severityIndex(result.bySeverity.critical > 0 ? 'critical' : 'low'),
        result.bySeverity.high > 0 ? severityIndex('high') : 0,
        result.bySeverity.medium > 0 ? severityIndex('medium') : 0,
        result.bySeverity.low > 0 ? severityIndex('low') : 0
      ),
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    projectRoot,
    failOn,
    base,
    scenarios,
    recommendation:
      scenarios.length === 0
        ? null
        : scenarios.slice().sort((a, b) => a.violationCount - b.violationCount)[0].name,
  };

  ensureDir(outPath);
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log(`Base policy violations: ${base.violationCount}`);
  for (const scenario of scenarios) {
    console.log(`${scenario.name}: ${scenario.violationCount} (delta ${scenario.deltaVsBase.total >= 0 ? '+' : ''}${scenario.deltaVsBase.total})`);
  }
  console.log(`Simulation report written: ${outPath}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(2);
});
