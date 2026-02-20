import { describe, it, expect } from 'vitest'
import { computeStronglyConnectedComponents, hasSelfLoop } from '../src/graph/analysis.js'
import { calculateMetrics } from '../src/metrics/metrics.js'
import { buildReport } from '../src/report/report.js'
import { shouldFail } from '../src/index.js'

describe('coverage smoke', () => {
  it('computes SCC and metrics for a tiny graph', () => {
    // tiny graph with a cycle between a and b
    const adjacency = new Map()
    adjacency.set('a', new Set(['b']))
    adjacency.set('b', new Set(['a']))

    const nodes = [
      { id: 'a', loc: 10 },
      { id: 'b', loc: 20 },
      { id: 'c', loc: 5 },
    ]

    const edges = [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'a' },
      { from: 'c', to: 'a' },
    ]

    const fanMetrics = new Map()
    fanMetrics.set(nodes[0], { fanIn: 1, fanOut: 1 })

    const graph = {
      getAdjacency: () => adjacency,
      getNodes: () => nodes,
      getEdges: () => edges,
      getFanInOut: () => {
        // map by node.id expected by calculateMetrics
        const m = new Map()
        m.set('a', { fanIn: 1, fanOut: 1 })
        m.set('b', { fanIn: 1, fanOut: 1 })
        m.set('c', { fanIn: 0, fanOut: 1 })
        return m
      },
    }

    const { components, inCycle } = computeStronglyConnectedComponents(graph)
    expect(Array.isArray(components)).toBe(true)
    expect(inCycle.has('a')).toBe(true)

    const metrics = calculateMetrics(graph, inCycle)
    expect(metrics).toHaveProperty('modules')
    expect(metrics.global).toHaveProperty('totalModules')
  })

  it('builds a report and computes shouldFail', () => {
    const report = buildReport({ totalModules: 1 }, { highRiskModules: 0 }, [], [
      { severity: 'high' },
    ])
    expect(shouldFail(report, 'high')).toBe(true)
    expect(shouldFail(report, 'critical')).toBe(false)
  })
})
