/**
 * ARCHGUARD — AI Explainability Layer
 *
 * AI must NOT replace the rule engine or metrics.
 * AI = explanation only.
 *
 * Reads the full report and generates a human-readable summary
 * including architecture score, risk distribution, and top violations.
 */

import fs from 'node:fs';

export function generateAiSummary(report) {
  const { summary, findings = [] } = report;
  const globalMetrics = summary || report.globalMetrics || {};
  const riskSummary = globalMetrics.riskDistribution || report.riskSummary || {};
  const violations = findings.length ? findings : report.violations || [];

  const lines = [];

  lines.push('ARCHGUARD — Architecture Analysis Summary');
  lines.push('=========================================');
  lines.push('');

  // Architecture Score
  if (globalMetrics.architectureScore !== undefined) {
    lines.push(
      `Architecture Score: ${globalMetrics.architectureScore}/100  (${
        globalMetrics.riskLevel ?? 'n/a'
      })`
    );
  }

  lines.push(
    `Modules: ${globalMetrics.totalModules ?? '?'}, Edges: ${
      globalMetrics.totalEdges ?? '?'
    }, LOC: ${globalMetrics.totalLoc ?? '?'}`
  );
  lines.push(
    `Core modules: ${globalMetrics.coreModules ?? '?'}, Cycle-participating: ${
      globalMetrics.cycleCount ?? '?'
    }`
  );
  lines.push(`Avg instability: ${globalMetrics.avgInstability ?? 'n/a'}`);
  lines.push('');

  // Risk distribution
  lines.push('Risk Distribution:');
  lines.push(`  High:   ${riskSummary.highRiskModules ?? 0}`);
  lines.push(`  Medium: ${riskSummary.mediumRiskModules ?? 0}`);
  lines.push(`  Low:    ${riskSummary.lowRiskModules ?? 0}`);
  lines.push('');

  // Violations
  if (violations.length === 0) {
    lines.push('No policy violations detected.');
  } else {
    lines.push(`Policy Violations: ${violations.length}`);
    const top = violations.slice(0, 10);
    for (const v of top) {
      const impact = v.impactScore !== undefined ? ` [impact=${v.impactScore}]` : '';
      lines.push(`  - [${v.severity}] ${v.message}${impact}`);
    }
    if (violations.length > 10) {
      lines.push(`  … and ${violations.length - 10} more`);
    }
  }

  lines.push('');
  lines.push('Note: This summary is derived exclusively from deterministic analysis data.');
  lines.push('AI does not influence the architecture score or policy evaluation.');
  return lines.join('\n');
}

export function writeAiSummary(report, outputPath) {
  const content = generateAiSummary(report);
  fs.writeFileSync(outputPath, content, 'utf8');
}
