#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function safeReadJson(filePath) {
  if (!filePath) return null;
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) return null;
  try {
    return JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch {
    return null;
  }
}

function normalizePkgName(dep) {
  if (!dep || typeof dep !== 'object') return null;
  return dep.name || dep.package || dep.id || null;
}

function asSeverity(score) {
  if (score >= 9) return 'critical';
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function normalizeSeverityText(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'critical' || v === 'high' || v === 'medium' || v === 'low') {
    return v;
  }
  return 'low';
}

function riskWeight(severity) {
  if (severity === 'critical') return 5;
  if (severity === 'high') return 3;
  if (severity === 'medium') return 2;
  return 1;
}

function collectCycloneDxVulns(sbom) {
  const components = Array.isArray(sbom.components) ? sbom.components : [];
  const vulnerabilities = Array.isArray(sbom.vulnerabilities) ? sbom.vulnerabilities : [];

  const componentSet = new Set();
  for (const c of components) {
    if (!c || typeof c !== 'object') continue;
    if (c.type && c.type !== 'library') continue;
    if (c.name) componentSet.add(c.name);
  }

  const vulnByPkg = new Map();
  for (const vuln of vulnerabilities) {
    const affects = Array.isArray(vuln.affects) ? vuln.affects : [];
    const ratings = Array.isArray(vuln.ratings) ? vuln.ratings : [];
    const firstScore = ratings[0]?.score;
    const numericScore = typeof firstScore === 'number' ? firstScore : Number(firstScore || 0);
    const sev = asSeverity(Number.isFinite(numericScore) ? numericScore : 0);

    for (const aff of affects) {
      const pkg = normalizePkgName(aff?.ref ? { name: aff.ref.split('/').pop() } : aff);
      if (!pkg) continue;
      if (componentSet.size > 0 && !componentSet.has(pkg)) continue;
      if (!vulnByPkg.has(pkg)) vulnByPkg.set(pkg, []);
      vulnByPkg.get(pkg).push({
        id: vuln.id || vuln.bomRef || 'UNKNOWN',
        severity: sev,
        score: Number.isFinite(numericScore) ? numericScore : 0,
      });
    }
  }
  return vulnByPkg;
}

function collectNpmAuditVulns(auditJson) {
  const vulnByPkg = new Map();
  const vulnerabilities = auditJson && typeof auditJson.vulnerabilities === 'object'
    ? auditJson.vulnerabilities
    : null;

  if (!vulnerabilities) return vulnByPkg;

  for (const [pkg, details] of Object.entries(vulnerabilities)) {
    const via = Array.isArray(details?.via) ? details.via : [];
    const directSeverity = normalizeSeverityText(details?.severity);
    const entries = [];

    if (via.length === 0) {
      entries.push({ id: `npm-audit:${pkg}`, severity: directSeverity, score: 0 });
    }

    for (const item of via) {
      if (typeof item === 'string') {
        entries.push({ id: `npm-audit:${item}`, severity: directSeverity, score: 0 });
        continue;
      }
      const id = item?.source || item?.name || `npm-audit:${pkg}`;
      const severity = normalizeSeverityText(item?.severity || details?.severity);
      entries.push({ id: String(id), severity, score: 0 });
    }

    if (entries.length > 0) {
      vulnByPkg.set(pkg, entries);
    }
  }

  return vulnByPkg;
}

function run() {
  const args = parseArgs(process.argv);
  const sbomPath = args.sbom;
  const usagePath = args.usage;
  const outPath = args.out || 'sbom_risk.json';

  if (!sbomPath || !usagePath) {
    console.error('Usage: node scripts/correlate_sbom_risk.js --sbom <sbom.json> --usage <dependency_usage.json> [--out sbom_risk.json]');
    process.exit(2);
  }

  const sbom = safeReadJson(sbomPath);
  const usage = safeReadJson(usagePath);

  if (!usage) {
    console.error('Usage input could not be parsed.');
    process.exit(2);
  }

  const sbomInput = sbom || {};

  const usageMap = usage && typeof usage === 'object' ? usage : {};
  const hasCycloneDx = Array.isArray(sbomInput.components) || Array.isArray(sbomInput.vulnerabilities);
  const vulnByPkg = hasCycloneDx ? collectCycloneDxVulns(sbomInput) : collectNpmAuditVulns(sbomInput);

  const rows = [];
  for (const [pkg, vulns] of vulnByPkg.entries()) {
    const usedBy = Array.isArray(usageMap[pkg]) ? usageMap[pkg] : [];
    const weight = vulns.reduce((acc, item) => acc + riskWeight(item.severity), 0);
    const exposure = usedBy.length || 0;
    const score = weight * (exposure > 0 ? 2 : 1);

    rows.push({
      package: pkg,
      vulnerabilities: vulns,
      usedBy,
      exposure,
      riskScore: score,
    });
  }

  rows.sort((a, b) => b.riskScore - a.riskScore || b.vulnerabilities.length - a.vulnerabilities.length);

  const output = {
    generatedAt: new Date().toISOString(),
    totalAtRiskPackages: rows.length,
    criticalPackages: rows.filter((row) => row.vulnerabilities.some((v) => v.severity === 'critical')).length,
    entries: rows,
  };

  fs.writeFileSync(path.resolve(outPath), JSON.stringify(output, null, 2));
  console.log(`Wrote SBOM risk correlation to ${outPath}`);
}

run();
