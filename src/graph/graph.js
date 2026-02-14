export class DependencyGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.adjacency = new Map();
  }

  addNode(node) {
    if (!this.nodes.has(node.id)) {
      this.nodes.set(node.id, node);
    }
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, new Set());
    }
  }

  addEdge(edge) {
    if (!this.adjacency.has(edge.from)) {
      this.adjacency.set(edge.from, new Set());
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

  getFanInOut() {
    const metrics = new Map();

    for (const node of this.nodes.values()) {
      metrics.set(node.id, { fanIn: 0, fanOut: 0 });
    }

    for (const edge of this.edges) {
      const fromMetric = metrics.get(edge.from);
      const toMetric = metrics.get(edge.to);
      if (fromMetric) {
        fromMetric.fanOut += 1;
      }
      if (toMetric) {
        toMetric.fanIn += 1;
      }
    }

    return metrics;
  }
}
