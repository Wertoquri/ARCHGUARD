import fs from "node:fs";
import path from "node:path";

export function buildReport(globalMetrics, riskSummary, moduleMetrics, violations) {
  return {
    generatedAt: new Date().toISOString(),
    globalMetrics,
    riskSummary,
    moduleMetrics,
    violations
  };
}

export function writeReport(report, outputPath) {
  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");
}
