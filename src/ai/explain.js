import fs from "node:fs";

export function generateAiSummary(report) {
  const { globalMetrics, riskSummary, violations } = report;
  const lines = [];

  lines.push("ARCHGUARD AI summary (structured findings only)");
  lines.push(`Modules: ${globalMetrics.totalModules}, Edges: ${globalMetrics.totalEdges}`);
  lines.push(`Core modules: ${globalMetrics.coreModules}, Cycles: ${globalMetrics.cycleCount}`);
  lines.push(
    `Risk distribution: high ${riskSummary.highRiskModules}, medium ${riskSummary.mediumRiskModules}, low ${riskSummary.lowRiskModules}`
  );

  if (violations.length === 0) {
    lines.push("No policy violations detected.");
  } else {
    const top = violations.slice(0, 5);
    lines.push(`Top violations: ${top.length}`);
    for (const violation of top) {
      lines.push(`- [${violation.severity}] ${violation.message}`);
    }
  }

  lines.push("Note: This summary is derived exclusively from findings.json data.");
  return lines.join("\n");
}

export function writeAiSummary(report, outputPath) {
  const content = generateAiSummary(report);
  fs.writeFileSync(outputPath, content, "utf8");
}
