export function computeStronglyConnectedComponents(graph) {
  const adjacency = graph.getAdjacency();
  const indices = new Map();
  const lowLinks = new Map();
  const onStack = new Set();
  const stack = [];
  let index = 0;
  const components = [];
  const inCycle = new Set();

  const visit = (node) => {
    indices.set(node, index);
    lowLinks.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    const neighbors = adjacency.get(node) ?? new Set();
    for (const neighbor of neighbors) {
      if (!indices.has(neighbor)) {
        visit(neighbor);
        lowLinks.set(node, Math.min(lowLinks.get(node) ?? 0, lowLinks.get(neighbor) ?? 0));
      } else if (onStack.has(neighbor)) {
        lowLinks.set(node, Math.min(lowLinks.get(node) ?? 0, indices.get(neighbor) ?? 0));
      }
    }

    if (lowLinks.get(node) === indices.get(node)) {
      const component = [];
      let current;
      do {
        current = stack.pop();
        if (current) {
          onStack.delete(current);
          component.push(current);
        }
      } while (current && current !== node);

      if (component.length > 0) {
        components.push(component);
        if (component.length > 1) {
          for (const member of component) {
            inCycle.add(member);
          }
        }
      }
    }
  };

  for (const node of adjacency.keys()) {
    if (!indices.has(node)) {
      visit(node);
    }
  }

  return { components, inCycle };
}

export function hasSelfLoop(graph, node) {
  const adjacency = graph.getAdjacency();
  const neighbors = adjacency.get(node);
  return neighbors ? neighbors.has(node) : false;
}
