import { hasSelfLoop } from '../graph/analysis.js';

const CORE_FAN_IN_THRESHOLD = 5;
const CORE_INSTABILITY_THRESHOLD = 0.3;

export function calculateMetrics(graph, inCycle) {
  const fanMetrics = graph.getFanInOut();
  const nodes = graph.getNodes();
  const maxFanIn = Math.max(0, ...Array.from(fanMetrics.values()).map((m) => m.fanIn));
  const maxLoc = Math.max(0, ...nodes.map((node) => node.loc));

  const modules = nodes.map((node) => {
    const fan = fanMetrics.get(node.id) ?? { fanIn: 0, fanOut: 0 };
    const denom = fan.fanIn + fan.fanOut;
    const instability = denom === 0 ? 0 : fan.fanOut / denom;
    const cycleFlag = inCycle.has(node.id) || hasSelfLoop(graph, node.id);

    const fanInScore = maxFanIn === 0 ? 0 : fan.fanIn / maxFanIn;
    const locScore = maxLoc === 0 ? 0 : node.loc / maxLoc;
    const cycleScore = cycleFlag ? 1 : 0;
    const changeRiskScore = Math.round(
      (fanInScore * 0.5 + locScore * 0.3 + cycleScore * 0.2) * 100
    );

    const isCoreModule =
      fan.fanIn >= CORE_FAN_IN_THRESHOLD && instability <= CORE_INSTABILITY_THRESHOLD;

    return {
      id: node.id,
      loc: node.loc,
      fanIn: fan.fanIn,
      fanOut: fan.fanOut,
      instability: Number(instability.toFixed(4)),
      inCycle: cycleFlag,
      changeRiskScore,
      isCoreModule,
    };
  });

  const avgInstability =
    modules.length === 0
      ? 0
      : modules.reduce((sum, mod) => sum + mod.instability, 0) / modules.length;

  const global = {
    totalModules: modules.length,
    totalEdges: graph.getEdges().length,
    avgInstability: Number(avgInstability.toFixed(4)),
    cycleCount: modules.filter((mod) => mod.inCycle).length,
    coreModules: modules.filter((mod) => mod.isCoreModule).length,
  };

  const riskSummary = {
    highRiskModules: modules.filter((mod) => mod.changeRiskScore >= 70).length,
    mediumRiskModules: modules.filter(
      (mod) => mod.changeRiskScore >= 40 && mod.changeRiskScore < 70
    ).length,
    lowRiskModules: modules.filter((mod) => mod.changeRiskScore < 40).length,
  };

  return {
    modules: modules.sort((a, b) => a.id.localeCompare(b.id)),
    global,
    riskSummary,
  };
}
