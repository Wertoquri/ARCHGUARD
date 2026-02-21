/**
 * ARCHGUARD — Reporter Module
 *
 * Responsibilities:
 *   - Generate three structured output files:
 *       findings.json  — policy violations with impact scores
 *       metrics.json   — per-module & global metrics
 *       summary.json   — architecture score, risk level, critical nodes
 *   - All output is deterministic and competition-ready
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Build the full report object (kept in memory for programmatic use).
 */
export function buildReport({
  globalMetrics,
  riskSummary,
  moduleMetrics,
  findings,
  riskAssessment,
}) {
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      architectureScore: riskAssessment.architectureScore,
      riskLevel: riskAssessment.riskLevel,
      penalties: riskAssessment.penalties,
      totalModules: globalMetrics.totalModules,
      totalEdges: globalMetrics.totalEdges,
      totalLoc: globalMetrics.totalLoc,
      avgInstability: globalMetrics.avgInstability,
      cycleCount: globalMetrics.cycleCount,
      coreModules: globalMetrics.coreModules,
      riskDistribution: riskSummary,
      criticalNodes: riskAssessment.criticalNodes.length,
      violationCount: findings.length,
    },
    findings,
    metrics: {
      global: globalMetrics,
      modules: moduleMetrics,
    },
    riskAssessment: {
      criticalNodes: riskAssessment.criticalNodes,
      blastRadii: riskAssessment.blastRadii,
    },
  };
}

/**
 * Write the report as three separate files into `outDir`:
 *   findings.json, metrics.json, summary.json
 *
 * Also writes the combined report to `outDir/report.json` for convenience.
 */
export function writeReport(report, outDir) {
  fs.mkdirSync(outDir, { recursive: true });

  // findings.json — violations only
  fs.writeFileSync(
    path.join(outDir, 'findings.json'),
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        violations: report.findings,
      },
      null,
      2
    ),
    'utf8'
  );

  // metrics.json — global + per-module metrics
  fs.writeFileSync(
    path.join(outDir, 'metrics.json'),
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        global: report.metrics.global,
        modules: report.metrics.modules,
      },
      null,
      2
    ),
    'utf8'
  );

  // summary.json — architecture score, risk, critical nodes, blast radii
  fs.writeFileSync(
    path.join(outDir, 'summary.json'),
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        ...report.summary,
        criticalNodes: report.riskAssessment.criticalNodes,
        blastRadii: report.riskAssessment.blastRadii,
      },
      null,
      2
    ),
    'utf8'
  );

  // Full combined report (backwards compatible)
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
}

/**
 * Write legacy single-file report (backward compatibility with existing CLI).
 */
export function writeLegacyReport(report, outputPath) {
  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
}
