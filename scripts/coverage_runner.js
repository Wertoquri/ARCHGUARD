import { computeStronglyConnectedComponents } from '../src/graph/analysis.js';
import { calculateMetrics } from '../src/metrics/metrics.js';
import { buildReport, writeReport } from '../src/report/report.js';
import { countLoc, toModuleId } from '../src/utils/fs.js';
import { applyBundle, rollbackBundle } from '../src/migration/runner.js';
import fs from 'node:fs';
import path from 'node:path';

export async function main() {
  const nodes = [
    { id: 'a', loc: 10 },
    { id: 'b', loc: 20 },
    { id: 'c', loc: 5 },
  ];

  const adjacency = new Map();
  adjacency.set('a', new Set(['b']));
  adjacency.set('b', new Set(['c']));
  adjacency.set('c', new Set(['a']));

  const edges = [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
    { from: 'c', to: 'a' },
  ];

  const fanMetrics = new Map();
  fanMetrics.set('a', { fanIn: 1, fanOut: 1 });
  fanMetrics.set('b', { fanIn: 1, fanOut: 1 });
  fanMetrics.set('c', { fanIn: 1, fanOut: 1 });

  const graph = {
    getAdjacency: () => adjacency,
    getFanInOut: () => fanMetrics,
    getNodes: () => nodes,
    getEdges: () => edges,
  };

  const { inCycle } = computeStronglyConnectedComponents(graph);
  const metrics = calculateMetrics(graph, inCycle);
  const report = buildReport(metrics.global, metrics.riskSummary, metrics.modules, []);
  writeReport(report, 'tmp/coverage_report.json');
  // console output to make sure this script ran
  console.log('coverage_runner: wrote tmp/coverage_report.json');

  // exercise small fs helpers
  try {
    const here = path.resolve('.');
    const pkg = path.resolve('package.json');
    if (fs.existsSync(pkg)) {
      console.log('countLoc(package.json)=', countLoc(pkg));
    }
    console.log('toModuleId sample=', toModuleId(here, __filename));
  } catch (e) {
    console.warn('fs helpers failed:', e && e.message);
  }

  // exercise migration runner safely using a temporary bundle
  try {
    const bundleDir = path.resolve('tmp', 'test-bundle');
    fs.mkdirSync(bundleDir, { recursive: true });
    const sampleRel = 'tmp/test-bundle/sample.txt';
    const sampleSrc = path.resolve(bundleDir, 'sample.txt');
    fs.writeFileSync(sampleSrc, 'bundle-content', 'utf8');
    const manifest = [ { file: sampleRel } ];
    const applied = applyBundle(path.resolve('.'), bundleDir, manifest);
    console.log('applyBundle result length=', Array.isArray(applied) ? applied.length : 0);
    // rollback to clean up
    rollbackBundle(path.resolve('.'), manifest);
  } catch (e) {
    console.warn('migration runner helpers failed:', e && e.message);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
