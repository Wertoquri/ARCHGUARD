import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { evaluatePolicy } from '../src/policy/policyEngine.js';

class MockGraph {
  constructor(edges) {
    this.edges = Array.isArray(edges) ? edges : [];
  }

  getEdges() {
    return this.edges;
  }
}

function loadCases() {
  const casesDir = path.resolve('test', 'policy-cases');
  const files = fs
    .readdirSync(casesDir)
    .filter((name) => name.endsWith('.json'))
    .sort();

  return files.map((fileName) => {
    const fullPath = path.join(casesDir, fileName);
    const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    return { fileName, fullPath, ...parsed };
  });
}

describe('policy framework (fixture-driven)', () => {
  const cases = loadCases();

  it('loads at least one fixture', () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const testCase of cases) {
    it(`${testCase.fileName}: ${testCase.name}`, () => {
      const graph = new MockGraph(testCase.edges || []);
      const moduleMetrics = testCase.moduleMetrics || [];
      const inCycle = new Set(testCase.inCycle || []);

      const violations = evaluatePolicy(testCase.policy, graph, moduleMetrics, inCycle);
      const expected = testCase.expected || {};

      if (expected.violationCount !== undefined) {
        expect(violations.length).toBe(expected.violationCount);
      }

      if (Array.isArray(expected.ruleIds)) {
        const actual = violations.map((v) => v.ruleId).sort();
        const wanted = expected.ruleIds.slice().sort();
        expect(actual).toEqual(wanted);
      }

      if (Array.isArray(expected.severities)) {
        const actual = violations.map((v) => v.severity).sort();
        const wanted = expected.severities.slice().sort();
        expect(actual).toEqual(wanted);
      }
    });
  }
});
