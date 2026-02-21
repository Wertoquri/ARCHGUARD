/**
 * ARCHGUARD — Risk Engine
 *
 * Responsibilities:
 *   - Architecture Score (0–100) — higher = healthier
 *   - Critical Nodes — modules with extreme risk / centrality
 *   - Blast Radius — downstream impact of a single module change
 *   - System Risk Level — low | medium | high | critical
 *
 * Score penalises:
 *   – Cycles             (−3 pts per cycle-participating module)
 *   – Bottlenecks        (−4 pts per core module with instability > 0.6)
 *   – Instability spikes (−2 pts × instability-variance × 100)
 *   – Policy violations  (−1 pt per finding, −2 for critical/high)
 *
 * All formulas are explicit and deterministic.
 */

/**
 * BFS forward reachability from a node — gives blast radius.
 *
 * @param {Map<string, Set<string>>} adjacency
 * @param {string} startNode
 * @returns {Set<string>}  All transitively reachable nodes (excluding start).
 */
function bfsReachable(adjacency, startNode) {
  const visited = new Set();
  const queue = [startNode];
  while (queue.length > 0) {
    const node = queue.shift();
    const neighbors = adjacency.get(node) ?? new Set();
    for (const n of neighbors) {
      if (!visited.has(n) && n !== startNode) {
        visited.add(n);
        queue.push(n);
      }
    }
  }
  return visited;
}

/**
 * BFS *reverse* reachability — how many modules *depend on* this node.
 *
 * @param {Map<string, Set<string>>} reverseAdj
 * @param {string} startNode
 * @returns {number}
 */
function reverseReachCount(reverseAdj, startNode) {
  const visited = new Set();
  const queue = [startNode];
  while (queue.length > 0) {
    const node = queue.shift();
    const neighbors = reverseAdj.get(node) ?? new Set();
    for (const n of neighbors) {
      if (!visited.has(n) && n !== startNode) {
        visited.add(n);
        queue.push(n);
      }
    }
  }
  return visited.size;
}

/**
 * @param {object} params
 * @param {import('../graph/graph.js').DependencyGraph} params.graph
 * @param {object[]} params.moduleMetrics  — from calculateMetrics().modules
 * @param {object}   params.globalMetrics  — from calculateMetrics().global
 * @param {object[]} params.findings       — from evaluator buildFindings()
 * @param {Set<string>} params.inCycle
 * @returns {{ architectureScore, riskLevel, criticalNodes, blastRadii }}
 */
export function computeRisk({ graph, moduleMetrics, globalMetrics, findings, inCycle: _inCycle }) {
  const adjacency = graph.getAdjacency();

  // --- Build reverse adjacency for blast-radius computation ---
  const reverseAdj = new Map();
  for (const [node] of adjacency) {
    reverseAdj.set(node, new Set());
  }
  for (const edge of graph.getEdges()) {
    if (!reverseAdj.has(edge.to)) reverseAdj.set(edge.to, new Set());
    reverseAdj.get(edge.to).add(edge.from);
  }

  const totalModules = globalMetrics.totalModules || 1;

  // ------ Architecture Score (start at 100, subtract penalties) ------
  let score = 100;

  // Penalty: cycles — 3 pts per module in cycle
  const cyclePenalty = Math.min(30, (globalMetrics.cycleCount ?? 0) * 3);
  score -= cyclePenalty;

  // Penalty: bottlenecks — core modules with high instability
  const bottlenecks = moduleMetrics.filter((m) => m.isCoreModule && m.instability > 0.6);
  const bottleneckPenalty = Math.min(20, bottlenecks.length * 4);
  score -= bottleneckPenalty;

  // Penalty: instability variance
  const variancePenalty = Math.min(15, Math.round((globalMetrics.instabilityVariance ?? 0) * 200));
  score -= variancePenalty;

  // Penalty: policy violations
  const critFindings = findings.filter(
    (f) => f.severity === 'critical' || f.severity === 'high'
  ).length;
  const otherFindings = findings.length - critFindings;
  const violationPenalty = Math.min(25, critFindings * 2 + otherFindings);
  score -= violationPenalty;

  const architectureScore = Math.max(0, Math.min(100, score));

  // ------ Risk Level ------
  let riskLevel;
  if (architectureScore >= 80) riskLevel = 'low';
  else if (architectureScore >= 60) riskLevel = 'medium';
  else if (architectureScore >= 40) riskLevel = 'high';
  else riskLevel = 'critical';

  // ------ Critical Nodes ------
  // A node is critical when its changeRiskScore ≥ 70 OR it's a core module in a cycle
  const criticalNodes = moduleMetrics
    .filter((m) => m.changeRiskScore >= 70 || (m.isCoreModule && m.inCycle))
    .map((m) => ({
      id: m.id,
      changeRiskScore: m.changeRiskScore,
      fanIn: m.fanIn,
      instability: m.instability,
      inCycle: m.inCycle,
    }))
    .sort((a, b) => b.changeRiskScore - a.changeRiskScore);

  // ------ Blast Radii (top 10 by downstream reach) ------
  const radii = moduleMetrics.map((m) => {
    const downstream = bfsReachable(adjacency, m.id);
    const upstream = reverseReachCount(reverseAdj, m.id);
    return {
      id: m.id,
      downstreamCount: downstream.size,
      upstreamCount: upstream,
      blastPct: Number(((downstream.size / totalModules) * 100).toFixed(1)),
    };
  });
  radii.sort((a, b) => b.downstreamCount - a.downstreamCount);
  const blastRadii = radii.slice(0, 10);

  return {
    architectureScore,
    riskLevel,
    penalties: {
      cycles: cyclePenalty,
      bottlenecks: bottleneckPenalty,
      instabilityVariance: variancePenalty,
      violations: violationPenalty,
    },
    criticalNodes,
    blastRadii,
  };
}
