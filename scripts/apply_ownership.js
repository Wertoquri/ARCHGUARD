#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import * as minimatchPkg from 'minimatch';

const minimatch = minimatchPkg?.default ?? minimatchPkg?.minimatch ?? minimatchPkg;

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

function normalizeOwners(raw) {
  if (!raw || typeof raw !== 'object') return { owners: [], defaultOwner: 'unowned' };
  const owners = Array.isArray(raw.owners) ? raw.owners : [];
  const defaultOwner = typeof raw.defaultOwner === 'string' && raw.defaultOwner.trim() !== ''
    ? raw.defaultOwner
    : 'unowned';
  return { owners, defaultOwner };
}

function ownerForModule(moduleId, owners, defaultOwner) {
  if (!moduleId) return defaultOwner;
  for (const entry of owners) {
    if (!entry?.pattern || !entry?.owner) continue;
    if (minimatch(moduleId, entry.pattern, { dot: true })) {
      return entry.owner;
    }
  }
  return defaultOwner;
}

function mergeOwners(fromOwner, toOwner, defaultOwner) {
  if (fromOwner === toOwner) return fromOwner;
  if (fromOwner === defaultOwner && toOwner === defaultOwner) return defaultOwner;
  return `${fromOwner}->${toOwner}`;
}

function buildOwnerSummary(violations) {
  const byOwner = {};
  for (const violation of violations) {
    const key = violation.owner || 'unowned';
    byOwner[key] = (byOwner[key] || 0) + 1;
  }
  return Object.entries(byOwner)
    .map(([owner, count]) => ({ owner, count }))
    .sort((a, b) => b.count - a.count || a.owner.localeCompare(b.owner));
}

function run() {
  const args = parseArgs(process.argv);
  const inputPath = args.in;
  const outputPath = args.out;
  const ownersPath = args.owners;
  const summaryPath = args.summary;

  if (!inputPath || !outputPath || !ownersPath) {
    console.error('Usage: node scripts/apply_ownership.js --in <findings.json> --out <findings.json> --owners <ownership-map.json> [--summary <summary.json>]');
    process.exit(2);
  }

  const report = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const ownersRaw = JSON.parse(fs.readFileSync(ownersPath, 'utf8'));
  const { owners, defaultOwner } = normalizeOwners(ownersRaw);

  const moduleMetrics = Array.isArray(report.moduleMetrics)
    ? report.moduleMetrics.map((moduleItem) => ({
        ...moduleItem,
        owner: ownerForModule(moduleItem.id, owners, defaultOwner),
      }))
    : [];

  const violations = Array.isArray(report.violations)
    ? report.violations.map((violation) => {
        if (violation.moduleId) {
          return {
            ...violation,
            owner: ownerForModule(violation.moduleId, owners, defaultOwner),
          };
        }

        const fromOwner = ownerForModule(violation.from, owners, defaultOwner);
        const toOwner = ownerForModule(violation.to, owners, defaultOwner);
        return {
          ...violation,
          owner: mergeOwners(fromOwner, toOwner, defaultOwner),
        };
      })
    : [];

  const enriched = {
    ...report,
    moduleMetrics,
    violations,
    ownership: {
      defaultOwner,
      ownerRules: owners.length,
      violationOwnerSummary: buildOwnerSummary(violations),
    },
  };

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, JSON.stringify(enriched, null, 2), 'utf8');

  if (summaryPath) {
    ensureDir(summaryPath);
    fs.writeFileSync(
      summaryPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          defaultOwner,
          ownerRules: owners.length,
          violationOwnerSummary: enriched.ownership.violationOwnerSummary,
        },
        null,
        2
      ),
      'utf8'
    );
  }

  console.log(`Ownership rules: ${owners.length}`);
  console.log(`Violations tagged: ${violations.length}`);
}

run();
