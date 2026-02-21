/**
 * ARCHGUARD — Evaluator Module
 *
 * Responsibilities:
 *   - Transform raw policy violations into structured findings
 *   - Compute deterministic impactScore per finding
 *   - Produce a stable, competition-ready JSON array
 *
 * Finding shape:
 *   { ruleId, type, severity, module, message, impactScore }
 *
 * impactScore ∈ [0, 100] = severityWeight × max(changeRiskScore of involved modules)
 */

const SEVERITY_WEIGHT = {
  critical: 1.0,
  high: 0.8,
  medium: 0.5,
  low: 0.2,
};

/**
 * Build structured findings from raw violation objects.
 *
 * @param {object[]} violations  — from policyEngine.evaluatePolicy
 * @param {object[]} moduleMetrics — per-module metrics (id, changeRiskScore, …)
 * @returns {object[]} findings — sorted by impactScore descending
 */
export function buildFindings(violations, moduleMetrics) {
  const riskMap = new Map();
  for (const m of moduleMetrics) {
    riskMap.set(m.id, m.changeRiskScore ?? 0);
  }

  const findings = violations.map((v) => {
    const mod = v.moduleId ?? v.from ?? '';
    const target = v.to ?? '';
    const modRisk = riskMap.get(mod) ?? 0;
    const targetRisk = riskMap.get(target) ?? 0;
    const maxRisk = Math.max(modRisk, targetRisk);
    const sevWeight = SEVERITY_WEIGHT[v.severity] ?? SEVERITY_WEIGHT.medium;
    const impactScore = Math.round(sevWeight * maxRisk);

    return {
      ruleId: v.ruleId,
      type: v.type,
      severity: v.severity,
      module: mod,
      target: target || undefined,
      message: v.message,
      impactScore,
    };
  });

  // Deterministic sort: highest impact first, then by module name
  findings.sort((a, b) => b.impactScore - a.impactScore || a.module.localeCompare(b.module));

  return findings;
}

export { SEVERITY_WEIGHT };
