/**
 * ARCHGUARD — Policy Engine
 *
 * Responsibilities:
 *   - Load and validate YAML policy files against JSON Schema (via ajv)
 *   - Evaluate 5 rule types: forbidden_dependency, max_fan_in, max_fan_out,
 *     no_cycles, layer_matrix
 *   - Support global and per-rule exemptions
 *   - Produce structured violations with deterministic severity
 *
 * Unknown rule types are rejected during schema validation.
 */

import fs from 'node:fs';
import Ajv from 'ajv';
import * as minimatchPkg from 'minimatch';
const minimatch = minimatchPkg?.default ?? minimatchPkg?.minimatch ?? minimatchPkg;
import YAML from 'yaml';

const DEFAULT_SEVERITY = {
  forbidden_dependency: 'high',
  max_fan_in: 'medium',
  max_fan_out: 'medium',
  no_cycles: 'high',
  layer_matrix: 'high',
};

// ---------- JSON Schema for policy YAML ----------
const RULE_TYPES = [
  'forbidden_dependency',
  'max_fan_in',
  'max_fan_out',
  'no_cycles',
  'layer_matrix',
];

const policySchema = {
  type: 'object',
  required: ['rules'],
  properties: {
    rules: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'type'],
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: RULE_TYPES },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          from: { type: 'string' },
          to: { type: 'string' },
          threshold: { type: 'number', minimum: 0 },
          message: { type: 'string' },
          exempt: { type: 'array', items: { type: 'string' } },
          layers: { type: 'object' },
          allow: { type: 'array' },
          allowSameLayer: { type: 'boolean' },
        },
        additionalProperties: true,
      },
    },
    exemptions: { type: 'array' },
  },
  additionalProperties: true,
};

const ajv = new Ajv({ allErrors: true });
const validateSchema = ajv.compile(policySchema);

export function loadPolicy(policyPath) {
  const content = fs.readFileSync(policyPath, 'utf8');
  const parsed = YAML.parse(content);
  if (!parsed || !Array.isArray(parsed.rules)) {
    throw new Error('Invalid policy file: rules not found');
  }

  // Validate against schema
  const valid = validateSchema(parsed);
  if (!valid) {
    const msgs = (validateSchema.errors || []).map((e) => `${e.instancePath} ${e.message}`);
    throw new Error(`Policy schema validation failed:\n  ${msgs.join('\n  ')}`);
  }

  return parsed;
}

function normalizePattern(pattern) {
  if (!pattern.includes('/') && !pattern.includes('*')) {
    return `${pattern}/**`;
  }
  return pattern;
}

function matches(pattern, moduleId) {
  return minimatch(moduleId, normalizePattern(pattern), { dot: true });
}

function findLayer(moduleId, layers) {
  const entries = Object.entries(layers || {});
  for (const [layer, pattern] of entries) {
    if (matches(pattern, moduleId)) {
      return layer;
    }
  }
  return null;
}

function normalizeAllowedPairs(allow = []) {
  const pairs = new Set();
  for (const entry of allow) {
    if (entry && entry.from && entry.to) {
      pairs.add(`${entry.from}=>${entry.to}`);
    }
  }
  return pairs;
}

export function evaluatePolicy(policy, graph, moduleMetrics, inCycle) {
  const violations = [];
  const edges = graph.getEdges();
  // normalize global exemptions: allow string or object entries
  const rawExemptions = policy.exemptions || [];
  const globalExemptions = rawExemptions
    .map((e) => {
      if (!e) return null;
      if (typeof e === 'string') return { pattern: e, reason: '' };
      return { pattern: e.pattern || e.module || '', reason: e.reason || e.comment || '' };
    })
    .filter(Boolean);

  for (const rule of policy.rules) {
    const matchesAny = (patterns, moduleId) => {
      if (!patterns || !Array.isArray(patterns)) return false;
      for (const p of patterns) {
        if (matches(p, moduleId)) return true;
      }
      return false;
    };

    const isExemptEdge = (rule, edge) => {
      for (const ex of globalExemptions) {
        const p = ex.pattern;
        if (!p) continue;
        if (p === `${edge.from}=>${edge.to}`) return true;
        if (matches(p, edge.from) || matches(p, edge.to)) return true;
      }
      if (rule.exempt) {
        if (matchesAny(rule.exempt, edge.from) || matchesAny(rule.exempt, edge.to)) return true;
        for (const p of rule.exempt) {
          if (p === `${edge.from}=>${edge.to}`) return true;
        }
      }
      return false;
    };

    const isExemptModule = (rule, moduleId) => {
      for (const ex of globalExemptions) {
        if (!ex.pattern) continue;
        if (matches(ex.pattern, moduleId)) return true;
      }
      if (rule.exempt) {
        return matchesAny(rule.exempt, moduleId);
      }
      return false;
    };

    if (rule.type === 'forbidden_dependency') {
      if (!rule.from || !rule.to) {
        continue;
      }
      for (const edge of edges) {
        if (matches(rule.from, edge.from) && matches(rule.to, edge.to)) {
          if (isExemptEdge(rule, edge)) continue;
          violations.push({
            ruleId: rule.id,
            type: rule.type,
            severity: rule.severity ?? DEFAULT_SEVERITY[rule.type],
            from: edge.from,
            to: edge.to,
            message: rule.message ?? `Dependency from ${edge.from} to ${edge.to} is forbidden`,
          });
        }
      }
    }
    // forbidden_dependency handled above with exemptions; skip duplicate handling

    if (rule.type === 'max_fan_in') {
      const threshold = rule.threshold ?? 0;
      for (const mod of moduleMetrics) {
        if (mod.fanIn > threshold) {
          if (isExemptModule(rule, mod.id)) continue;
          violations.push({
            ruleId: rule.id,
            type: rule.type,
            severity: rule.severity ?? DEFAULT_SEVERITY[rule.type],
            moduleId: mod.id,
            message: rule.message ?? `Fan-in ${mod.fanIn} exceeds threshold ${threshold}`,
          });
        }
      }
    }

    if (rule.type === 'max_fan_out') {
      const threshold = rule.threshold ?? 0;
      for (const mod of moduleMetrics) {
        if (mod.fanOut > threshold) {
          if (isExemptModule(rule, mod.id)) continue;
          violations.push({
            ruleId: rule.id,
            type: rule.type,
            severity: rule.severity ?? DEFAULT_SEVERITY[rule.type],
            moduleId: mod.id,
            message: rule.message ?? `Fan-out ${mod.fanOut} exceeds threshold ${threshold}`,
          });
        }
      }
    }

    if (rule.type === 'no_cycles') {
      if (inCycle.size > 0) {
        for (const moduleId of Array.from(inCycle).sort()) {
          if (isExemptModule(rule, moduleId)) continue;
          violations.push({
            ruleId: rule.id,
            type: rule.type,
            severity: rule.severity ?? DEFAULT_SEVERITY[rule.type],
            moduleId,
            message: rule.message ?? `Module ${moduleId} participates in a dependency cycle`,
          });
        }
      }
    }

    if (rule.type === 'layer_matrix') {
      const layers = rule.layers ?? {};
      const allowPairs = normalizeAllowedPairs(rule.allow);
      const allowSameLayer = rule.allowSameLayer ?? true;

      for (const edge of edges) {
        const fromLayer = findLayer(edge.from, layers);
        const toLayer = findLayer(edge.to, layers);
        if (!fromLayer || !toLayer) {
          continue;
        }
        if (isExemptEdge(rule, edge)) continue;
        if (fromLayer === toLayer && allowSameLayer) {
          continue;
        }
        if (!allowPairs.has(`${fromLayer}=>${toLayer}`)) {
          violations.push({
            ruleId: rule.id,
            type: rule.type,
            severity: rule.severity ?? DEFAULT_SEVERITY[rule.type],
            from: edge.from,
            to: edge.to,
            message:
              rule.message ??
              `Layer dependency ${fromLayer} -> ${toLayer} is not allowed for ${edge.from} -> ${edge.to}`,
          });
        }
      }
    }
  }

  return violations.sort((a, b) => {
    if (a.ruleId === b.ruleId) {
      return (a.moduleId ?? a.from ?? '').localeCompare(b.moduleId ?? b.from ?? '');
    }
    return a.ruleId.localeCompare(b.ruleId);
  });
}
