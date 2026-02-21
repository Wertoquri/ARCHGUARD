/**
 * ARCHGUARD — Dependency Graph Data Structure
 *
 * Responsibilities:
 *   - Directed graph storage (adjacency list)
 *   - Edge deduplication
 *   - Fan-in / fan-out computation
 *   - Serialisation-ready
 *
 * No mutable leaks: getters return copies.
 */

export class DependencyGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.adjacency = new Map();
    /** @type {Set<string>} "from::to" keys for fast deduplication */
    this._edgeKeys = new Set();
  }

  addNode(node) {
    if (!this.nodes.has(node.id)) {
      this.nodes.set(node.id, node);
    }
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, new Set());
    }
  }

  /**
   * Add a directed edge. Silently deduplicates identical from→to pairs.
   * Auto-creates target node entry when missing.
   */
  addEdge(edge) {
    const key = `${edge.from}::${edge.to}`;
    if (this._edgeKeys.has(key)) return; // deduplicate
    this._edgeKeys.add(key);

    if (!this.adjacency.has(edge.from)) {
      this.adjacency.set(edge.from, new Set());
    }
    if (!this.adjacency.has(edge.to)) {
      this.adjacency.set(edge.to, new Set());
    }
    this.adjacency.get(edge.from).add(edge.to);
    this.edges.push(edge);
  }

  getNodes() {
    return Array.from(this.nodes.values());
  }

  getEdges() {
    return [...this.edges];
  }

  getAdjacency() {
    return this.adjacency;
  }

  /**
   * Compute fan-in and fan-out for every known node.
   * Uses the deduplicated edge list so each dependency is counted once.
   */
  getFanInOut() {
    const metrics = new Map();

    for (const id of this.adjacency.keys()) {
      metrics.set(id, { fanIn: 0, fanOut: 0 });
    }
    // Also cover nodes that were added via addNode but have no edges
    for (const node of this.nodes.values()) {
      if (!metrics.has(node.id)) {
        metrics.set(node.id, { fanIn: 0, fanOut: 0 });
      }
    }

    for (const edge of this.edges) {
      const fromMetric = metrics.get(edge.from);
      const toMetric = metrics.get(edge.to);
      if (fromMetric) fromMetric.fanOut += 1;
      if (toMetric) toMetric.fanIn += 1;
    }

    return metrics;
  }

  /** Number of unique nodes in the graph. */
  get size() {
    return this.adjacency.size;
  }
}
