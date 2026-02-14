#!/usr/bin/env node
import fg from 'fast-glob';
import fs from 'fs';
import path from 'path';

function loadTsconfig() {
  const cfgPath = path.resolve('tsconfig.json');
  if (!fs.existsSync(cfgPath)) return null;
  try {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    const compiler = cfg.compilerOptions || {};
    const baseUrl = compiler.baseUrl || '.';
    const paths = compiler.paths || {};
    return { baseUrl, paths };
  } catch (e) {
    return null;
  }
}

function resolveTsPath(tsconfig, importPath) {
  if (!tsconfig) return null;
  for (const [pattern, targets] of Object.entries(tsconfig.paths || {})) {
    const star = pattern.indexOf('*');
    if (star === -1) {
      if (pattern === importPath) {
        const t = targets[0].replace(/\*$/, '');
        return path.normalize(path.join(tsconfig.baseUrl, t)).replace(/\\/g, '/');
      }
    } else {
      const prefix = pattern.slice(0, star);
      if (importPath.startsWith(prefix)) {
        const rest = importPath.slice(prefix.length);
        const target = targets[0].replace('*', rest);
        return path.normalize(path.join(tsconfig.baseUrl, target)).replace(/\\/g, '/');
      }
    }
  }
  return null;
}

const root = process.cwd();
const srcGlobs = ['src/**/*.{js,jsx,ts,tsx}'];

function tryResolveImport(fromFile, importPath, tsconfig) {
  const fromDir = path.dirname(fromFile);
  // first try tsconfig path mapping for non-relative imports
  if (tsconfig && !importPath.startsWith('.')) {
    const resolved = resolveTsPath(tsconfig, importPath);
    if (resolved) {
      const candidates = [resolved, resolved + '.js', resolved + '.jsx', resolved + '.ts', resolved + '.tsx', path.join(resolved, 'index.js')];
      for (const c of candidates) {
        const abs = path.resolve(c);
        if (fs.existsSync(abs)) return path.relative(root, abs).replace(/\\/g, '/');
      }
    }
  }

  // local relative imports and normal package-local resolution
  const candidates = [
    importPath,
    importPath + '.js',
    importPath + '.jsx',
    importPath + '.ts',
    importPath + '.tsx',
    path.join(importPath, 'index.js'),
    path.join(importPath, 'index.jsx'),
    path.join(importPath, 'index.ts'),
    path.join(importPath, 'index.tsx'),
  ];
  for (const c of candidates) {
    const abs = path.resolve(fromDir, c);
    if (fs.existsSync(abs)) return path.relative(root, abs).replace(/\\/g, '/');
  }
  return null;
}

async function build() {
  const tsconfig = loadTsconfig();
  const entries = await fg(srcGlobs, { dot: false });
  const nodes = new Map();
  const edges = [];

  for (const file of entries) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    nodes.set(rel, { id: rel, label: path.basename(rel) });
    const src = await fs.promises.readFile(file, 'utf8');
    const importRegex = /import\s+(?:[^'"\n]+)\s+from\s+['"]([^'"]+)['"]/g;
    const importStarRegex = /import\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    let m;
    while ((m = importRegex.exec(src))) {
      const target = tryResolveImport(file, m[1], tsconfig);
      if (target) edges.push({ from: rel, to: target });
    }
    while ((m = importStarRegex.exec(src))) {
      const target = tryResolveImport(file, m[1], tsconfig);
      if (target) edges.push({ from: rel, to: target });
    }
    while ((m = requireRegex.exec(src))) {
      const target = tryResolveImport(file, m[1], tsconfig);
      if (target) edges.push({ from: rel, to: target });
    }
  }

  // compute fan-in / fan-out
  const fanIn = new Map();
  const fanOut = new Map();
  for (const n of nodes.keys()) {
    fanIn.set(n, 0);
    fanOut.set(n, 0);
  }
  for (const e of edges) {
    fanOut.set(e.from, (fanOut.get(e.from) || 0) + 1);
    fanIn.set(e.to, (fanIn.get(e.to) || 0) + 1);
  }

  function clusterOf(name) {
    const parts = name.split('/');
    if (parts.length <= 1) return 'root';
    return parts[0];
  }

  const nodesArr = Array.from(nodes.values()).map(n => {
    const id = n.id;
    const inCount = fanIn.get(id) || 0;
    const outCount = fanOut.get(id) || 0;
    const severity = Math.max(inCount, outCount);
    let color = '#9ACD32';
    if (severity >= 10) color = '#ff4d4f';
    else if (severity >= 4) color = '#ff9f1c';
    return Object.assign({}, n, {
      fanIn: inCount,
      fanOut: outCount,
      color,
      group: clusterOf(n.id),
      title: `${n.label}\nfanIn: ${inCount} fanOut: ${outCount}`
    });
  });

  const out = {
    nodes: nodesArr,
    edges,
  };

  const outPath = path.join(root, 'docs');
  if (!fs.existsSync(outPath)) fs.mkdirSync(outPath, { recursive: true });
  await fs.promises.writeFile(path.join(outPath, 'dep_graph.json'), JSON.stringify(out, null, 2));
  console.log('Wrote docs/dep_graph.json');
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
