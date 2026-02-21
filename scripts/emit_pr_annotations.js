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

function normalizePathLike(value) {
  if (!value || typeof value !== 'string') return null;
  return value.replace(/\\/g, '/');
}

function asSeverity(value) {
  if (value === 'critical') return 'error';
  if (value === 'high') return 'warning';
  return 'notice';
}

function emitAnnotation(filePath, severity, message) {
  const safeMessage = String(message || '').replace(/\r?\n/g, ' ');
  process.stdout.write(`::${severity} file=${filePath},line=1,col=1::${safeMessage}\n`);
}

function run() {
  const args = parseArgs(process.argv);
  const findingsPath = args.findings;
  const changedPath = args.changed;
  const max = Number(args.max || 25);

  if (!findingsPath || !changedPath) {
    console.error('Usage: node scripts/emit_pr_annotations.js --findings <findings.json> --changed <changed_files.json> [--max 25]');
    process.exit(2);
  }

  const findings = JSON.parse(fs.readFileSync(path.resolve(findingsPath), 'utf8'));
  const changedRaw = JSON.parse(fs.readFileSync(path.resolve(changedPath), 'utf8'));

  const changedFiles = new Set(
    (Array.isArray(changedRaw) ? changedRaw : [])
      .map((item) => normalizePathLike(item))
      .filter(Boolean)
  );

  const violations = Array.isArray(findings.violations) ? findings.violations : [];
  const actionable = [];

  for (const v of violations) {
    const candidates = [v.moduleId, v.from, v.to]
      .map((item) => normalizePathLike(item))
      .filter(Boolean);

    const match = candidates.find((candidate) => changedFiles.has(candidate));
    if (!match) continue;

    actionable.push({
      file: match,
      severity: asSeverity(v.severity),
      message: `[${v.ruleId || v.type || 'rule'}] ${v.message || 'Violation detected'}`,
    });
  }

  const unique = [];
  const seen = new Set();
  for (const item of actionable) {
    const key = `${item.file}|${item.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  const limited = unique.slice(0, Number.isFinite(max) && max > 0 ? max : 25);
  for (const item of limited) {
    emitAnnotation(item.file, item.severity, item.message);
  }

  console.log(`Emitted ${limited.length} PR inline annotations.`);
}

run();
