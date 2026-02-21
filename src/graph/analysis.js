/**
 * ARCHGUARD — Graph Analysis Module
 *
 * Responsibilities:
 *   - Iterative Tarjan SCC (safe for large graphs, no stack overflow)
 *   - Self-loop detection
 *   - Betweenness centrality (Brandes algorithm for unweighted DAGs)
 *
 * All algorithms are deterministic.
 */

/**
 * Iterative Tarjan's algorithm for Strongly Connected Components.
 *
 * Returns { components: string[][], inCycle: Set<string> }
 *   - components: all SCCs (including single-node ones)
 *   - inCycle: node IDs that belong to a multi-node SCC *or* have a self-loop
 */
export function computeStronglyConnectedComponents(graph) {
  const adjacency = graph.getAdjacency();
  const indices = new Map();
  const lowLinks = new Map();
  const onStack = new Set();
  const stack = [];
  let index = 0;
  const components = [];
  const inCycle = new Set();

  // Iterative DFS using an explicit call-stack
  for (const startNode of adjacency.keys()) {
    if (indices.has(startNode)) continue;

    // Each frame: [node, neighborIterator, phase]
    //   phase 0 = first visit (pre-order)
    //   phase 1 = returning from child (post-order)
    const callStack = [];
    callStack.push({ node: startNode, neighbors: null, phase: 0, childIter: null });

    while (callStack.length > 0) {
      const frame = callStack[callStack.length - 1];

      if (frame.phase === 0) {
        // --- pre-order: assign index & lowlink, push to SCC stack ---
        indices.set(frame.node, index);
        lowLinks.set(frame.node, index);
        index += 1;
        stack.push(frame.node);
        onStack.add(frame.node);

        frame.neighbors = (adjacency.get(frame.node) ?? new Set()).values();
        frame.phase = 1;
      }

      // --- iterate over neighbours ---
      let pushed = false;
      for (const neighbor of frame.neighbors) {
        if (!indices.has(neighbor)) {
          // Tree edge — recurse (push new frame)
          callStack.push({ node: neighbor, neighbors: null, phase: 0 });
          pushed = true;
          break; // process child first; will return here via the outer while
        } else if (onStack.has(neighbor)) {
          lowLinks.set(frame.node, Math.min(lowLinks.get(frame.node), indices.get(neighbor)));
        }
      }

      if (pushed) continue;

      // --- post-order: all neighbours processed ---
      if (lowLinks.get(frame.node) === indices.get(frame.node)) {
        const component = [];
        let current;
        do {
          current = stack.pop();
          onStack.delete(current);
          component.push(current);
        } while (current !== frame.node);

        components.push(component);
        if (component.length > 1) {
          for (const member of component) {
            inCycle.add(member);
          }
        }
      }

      callStack.pop();

      // Propagate lowlink to parent frame
      if (callStack.length > 0) {
        const parent = callStack[callStack.length - 1];
        lowLinks.set(parent.node, Math.min(lowLinks.get(parent.node), lowLinks.get(frame.node)));
      }
    }
  }

  // Also mark self-loops
  for (const [node, neighbors] of adjacency) {
    if (neighbors.has(node)) {
      inCycle.add(node);
    }
  }

  return { components, inCycle };
}

/**
 * Check if a specific node has a self-loop in the graph.
 */
export function hasSelfLoop(graph, node) {
  const adjacency = graph.getAdjacency();
  const neighbors = adjacency.get(node);
  return neighbors ? neighbors.has(node) : false;
}

/**
 * Brandes betweenness centrality for an unweighted directed graph.
 *
 * Returns Map<string, number> — normalised centrality [0, 1].
 * For small graphs (≤2 nodes), all values are 0.
 */
export function computeBetweennessCentrality(graph) {
  const adjacency = graph.getAdjacency();
  const nodes = Array.from(adjacency.keys());
  const n = nodes.length;
  const CB = new Map();
  for (const v of nodes) CB.set(v, 0);

  for (const s of nodes) {
    // BFS from s
    const S = []; // stack of nodes in order of non-decreasing distance
    const P = new Map(); // predecessors on shortest paths
    const sigma = new Map(); // number of shortest paths
    const d = new Map(); // distance from s
    const delta = new Map();

    for (const v of nodes) {
      P.set(v, []);
      sigma.set(v, 0);
      d.set(v, -1);
      delta.set(v, 0);
    }
    sigma.set(s, 1);
    d.set(s, 0);

    const Q = [s]; // BFS queue
    while (Q.length > 0) {
      const v = Q.shift();
      S.push(v);
      const neighbors = adjacency.get(v) ?? new Set();
      for (const w of neighbors) {
        if (d.get(w) < 0) {
          Q.push(w);
          d.set(w, d.get(v) + 1);
        }
        if (d.get(w) === d.get(v) + 1) {
          sigma.set(w, sigma.get(w) + sigma.get(v));
          P.get(w).push(v);
        }
      }
    }

    // Back-propagation
    while (S.length > 0) {
      const w = S.pop();
      for (const v of P.get(w)) {
        const contribution = (sigma.get(v) / sigma.get(w)) * (1 + delta.get(w));
        delta.set(v, delta.get(v) + contribution);
      }
      if (w !== s) {
        CB.set(w, CB.get(w) + delta.get(w));
      }
    }
  }

  // Normalise: divide by (n-1)(n-2) for directed graphs
  const norm = n > 2 ? (n - 1) * (n - 2) : 1;
  for (const [v, val] of CB) {
    CB.set(v, Number((val / norm).toFixed(6)));
  }

  return CB;
}
