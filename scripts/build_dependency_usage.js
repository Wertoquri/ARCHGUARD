#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';

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

function pkgFromSpecifier(spec) {
  if (!spec || spec.startsWith('.') || spec.startsWith('/')) return null;
  if (spec.startsWith('@')) {
    const parts = spec.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : spec;
  }
  return spec.split('/')[0];
}

function collectImports(content) {
  const results = [];
  const importRe = /(?:import\s+[^'"\n]+from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
  const requireRe = /require\(\s*['"]([^'"]+)['"]\s*\)/g;

  let match;
  while ((match = importRe.exec(content)) !== null) {
    results.push(match[1]);
  }
  while ((match = requireRe.exec(content)) !== null) {
    results.push(match[1]);
  }
  return results;
}

async function run() {
  const args = parseArgs(process.argv);
  const outPath = args.out || 'dependency_usage.json';
  const patterns = (args.patterns || 'src/**/*.{js,jsx,ts,tsx,mjs,cjs}')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const files = await fg(patterns, {
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/tmp/**',
      '**/.git/**',
    ],
    dot: false,
  });

  const usage = {};
  for (const rel of files) {
    const full = path.resolve(rel);
    const content = fs.readFileSync(full, 'utf8');
    const imports = collectImports(content);

    for (const spec of imports) {
      const pkg = pkgFromSpecifier(spec);
      if (!pkg) continue;
      if (!usage[pkg]) usage[pkg] = [];
      if (!usage[pkg].includes(rel)) usage[pkg].push(rel);
    }
  }

  // Ensure the output directory exists (CI may write into `tmp/`)
  const resolvedOut = path.resolve(outPath);
  const outDir = path.dirname(resolvedOut);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(resolvedOut, JSON.stringify(usage, null, 2));
  console.log(`Wrote dependency usage map to ${outPath}`);
}

run();
