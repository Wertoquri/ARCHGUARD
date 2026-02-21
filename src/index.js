/**
 * ARCHGUARD — Core Pipeline Orchestrator
 *
 * Pipeline:
 *   scan → parse → buildGraph → computeMetrics → loadPolicy →
 *   evaluate → computeRisk → generateReport → (optional) AI explain
 *
 * Every step has explicit input/output. No hidden global state.
 */

import path from 'node:path';
import { scan } from './scanner/index.js';
import { parseSourceFiles } from './parser/astParser.js';
import { DependencyGraph } from './graph/graph.js';
import {
  computeStronglyConnectedComponents,
  computeBetweennessCentrality,
} from './graph/analysis.js';
import { calculateMetrics } from './metrics/metrics.js';
import { loadPolicy, evaluatePolicy } from './policy/policyEngine.js';
import { buildFindings } from './evaluator/index.js';
import { computeRisk } from './risk/index.js';
import { buildReport, writeReport, writeLegacyReport } from './reporter/index.js';
import { writeAiSummary } from './ai/explain.js';

export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'];

/**
 * Full analysis pipeline.
 *
 * @param {object} options
 * @param {string} options.projectRoot
 * @param {string} options.policyPath
 * @param {string} options.outputPath       — legacy single-file output
 * @param {string} [options.outputDir]       — new multi-file output directory
 * @param {string} [options.failOn]
 * @param {string} [options.aiSummaryPath]
 * @param {string[]} [options.include]
 * @param {string[]} [options.exclude]
 * @returns {Promise<object>}  The full report.
 */
export async function analyzeProject(options) {
  const projectRoot = path.resolve(options.projectRoot);

  // 1. SCAN
  const files = await scan(projectRoot, {
    include: options.include,
    exclude: options.exclude,
  });

  // 2. PARSE
  const parsed = parseSourceFiles(projectRoot, files);

  // 3. BUILD GRAPH
  const graph = new DependencyGraph();
  for (const node of parsed.nodes) graph.addNode(node);
  for (const edge of parsed.edges) graph.addEdge(edge);

  // 4. COMPUTE SCC + CENTRALITY
  const { inCycle } = computeStronglyConnectedComponents(graph);
  const centrality = computeBetweennessCentrality(graph);

  // 5. COMPUTE METRICS
  const metrics = calculateMetrics(graph, inCycle, centrality);

  // 6. LOAD POLICY
  const policy = loadPolicy(options.policyPath);

  // 7. EVALUATE (raw violations)
  const violations = evaluatePolicy(policy, graph, metrics.modules, inCycle);

  // 8. BUILD FINDINGS (structured, with impactScore)
  const findings = buildFindings(violations, metrics.modules);

  // 9. COMPUTE RISK
  const riskAssessment = computeRisk({
    graph,
    moduleMetrics: metrics.modules,
    globalMetrics: metrics.global,
    findings,
    inCycle,
  });

  // 10. GENERATE REPORT
  const report = buildReport({
    globalMetrics: metrics.global,
    riskSummary: metrics.riskSummary,
    moduleMetrics: metrics.modules,
    findings,
    riskAssessment,
  });

  // Write outputs
  if (options.outputDir) {
    writeReport(report, options.outputDir);
  }
  if (options.outputPath) {
    writeLegacyReport(report, options.outputPath);
  }

  // Optional AI summary
  if (options.aiSummaryPath) {
    writeAiSummary(report, options.aiSummaryPath);
  }

  return report;
}

export function shouldFail(report, failOn) {
  const thresholdIndex = SEVERITY_LEVELS.indexOf(failOn);
  if (thresholdIndex < 0) return false;
  return (report.findings || report.violations || []).some(
    (v) => SEVERITY_LEVELS.indexOf(v.severity) >= thresholdIndex
  );
}
