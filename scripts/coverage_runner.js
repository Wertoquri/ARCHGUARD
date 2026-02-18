import { computeStronglyConnectedComponents } from '../src/graph/analysis.js';
import { calculateMetrics } from '../src/metrics/metrics.js';
import { buildReport, writeReport } from '../src/report/report.js';

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
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
