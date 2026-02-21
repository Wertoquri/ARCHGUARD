/**
 * ARCHGUARD — Metrics Engine
 *
 * Explicit formulas (no magic numbers without explanation):
 *
 *   Instability  I = fanOut / (fanIn + fanOut)            — Martin metric
 *   Change Risk  R = fanIn × instability × centrality     — normalised 0–100
 *   Arch. Debt   D = f(cycles, layerViolations, instabilityVariance)
 *
 * All thresholds are configurable via the optional `thresholds` argument.
 */

import { hasSelfLoop } from '../graph/analysis.js';

const DEFAULT_THRESHOLDS = {
  coreFanIn: 5,
  coreInstability: 0.3,
  // changeRisk weights (must sum to 1.0)
  wFanIn: 0.35,
  wInstability: 0.25,
  wCentrality: 0.25,
  wCycle: 0.15,
};

/**
 * Compute per-module metrics and global aggregates.
 *
 * @param {import('../graph/graph.js').DependencyGraph} graph
 * @param {Set<string>} inCycle  — set of module IDs in dependency cycles
 * @param {Map<string, number>} centrality — betweenness centrality per module
 * @param {object} [thresholds]  — optional overrides for DEFAULT_THRESHOLDS
 * @returns {{ modules, global, riskSummary }}
 */
export function calculateMetrics(graph, inCycle, centrality = new Map(), thresholds = {}) {
  const T = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const fanMetrics = graph.getFanInOut();
  const nodes = graph.getNodes();

  const maxFanIn = Math.max(0, ...Array.from(fanMetrics.values()).map((m) => m.fanIn));
  const maxCentrality = Math.max(0, ...Array.from(centrality.values()));

  const modules = nodes.map((node) => {
    const fan = fanMetrics.get(node.id) ?? { fanIn: 0, fanOut: 0 };

    // Martin instability: I = Ce / (Ca + Ce)
    const denom = fan.fanIn + fan.fanOut;
    const instability = denom === 0 ? 0 : fan.fanOut / denom;

    const cycleFlag = inCycle.has(node.id) || hasSelfLoop(graph, node.id);
    const cent = centrality.get(node.id) ?? 0;

    // --- Change Risk Score (0–100) ---
    // Normalised sub-scores
    const fanInNorm = maxFanIn === 0 ? 0 : fan.fanIn / maxFanIn;
    const centNorm = maxCentrality === 0 ? 0 : cent / maxCentrality;
    const cycleScore = cycleFlag ? 1 : 0;

    const changeRiskScore = Math.round(
      (fanInNorm * T.wFanIn +
        instability * T.wInstability +
        centNorm * T.wCentrality +
        cycleScore * T.wCycle) *
        100
    );

    const isCoreModule = fan.fanIn >= T.coreFanIn && instability <= T.coreInstability;

    return {
      id: node.id,
      loc: node.loc,
      fanIn: fan.fanIn,
      fanOut: fan.fanOut,
      instability: Number(instability.toFixed(4)),
      centrality: Number(cent.toFixed(6)),
      inCycle: cycleFlag,
      changeRiskScore,
      isCoreModule,
    };
  });

  // --- Global aggregates ---
  const avgInstability =
    modules.length === 0 ? 0 : modules.reduce((s, m) => s + m.instability, 0) / modules.length;

  // Instability variance (used in Architectural Debt)
  const instVar =
    modules.length === 0
      ? 0
      : modules.reduce((s, m) => s + (m.instability - avgInstability) ** 2, 0) / modules.length;

  const cycleCount = modules.filter((m) => m.inCycle).length;

  const global = {
    totalModules: modules.length,
    totalEdges: graph.getEdges().length,
    totalLoc: modules.reduce((s, m) => s + m.loc, 0),
    avgInstability: Number(avgInstability.toFixed(4)),
    instabilityVariance: Number(instVar.toFixed(6)),
    cycleCount,
    coreModules: modules.filter((m) => m.isCoreModule).length,
  };

  const riskSummary = {
    highRiskModules: modules.filter((m) => m.changeRiskScore >= 70).length,
    mediumRiskModules: modules.filter((m) => m.changeRiskScore >= 40 && m.changeRiskScore < 70)
      .length,
    lowRiskModules: modules.filter((m) => m.changeRiskScore < 40).length,
  };

  return {
    modules: modules.sort((a, b) => a.id.localeCompare(b.id)),
    global,
    riskSummary,
  };
}

export { DEFAULT_THRESHOLDS };
