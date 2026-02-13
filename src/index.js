import path from "node:path";
import { collectSourceFiles } from "./utils/fs.js";
import { parseSourceFiles } from "./parser/astParser.js";
import { DependencyGraph } from "./graph/graph.js";
import { computeStronglyConnectedComponents } from "./graph/analysis.js";
import { calculateMetrics } from "./metrics/metrics.js";
import { loadPolicy, evaluatePolicy } from "./policy/policyEngine.js";
import { buildReport, writeReport } from "./report/report.js";
import { writeAiSummary } from "./ai/explain.js";

export const SEVERITY_LEVELS = ["low", "medium", "high", "critical"];

export async function analyzeProject(options) {
  const projectRoot = path.resolve(options.projectRoot);
  const files = await collectSourceFiles(projectRoot);
  const parsed = parseSourceFiles(projectRoot, files);

  const graph = new DependencyGraph();
  for (const node of parsed.nodes) {
    graph.addNode(node);
  }
  for (const edge of parsed.edges) {
    graph.addEdge(edge);
  }

  const { inCycle } = computeStronglyConnectedComponents(graph);
  const metrics = calculateMetrics(graph, inCycle);
  const policy = loadPolicy(options.policyPath);
  const violations = evaluatePolicy(policy, graph, metrics.modules, inCycle);

  const report = buildReport(metrics.global, metrics.riskSummary, metrics.modules, violations);
  writeReport(report, options.outputPath);

  if (options.aiSummaryPath) {
    writeAiSummary(report, options.aiSummaryPath);
  }

  return report;
}

export function shouldFail(report, failOn) {
  const thresholdIndex = SEVERITY_LEVELS.indexOf(failOn);
  return report.violations.some((violation) => SEVERITY_LEVELS.indexOf(violation.severity) >= thresholdIndex);
}
