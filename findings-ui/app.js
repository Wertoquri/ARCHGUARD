const fileInput = document.getElementById('filePath');
const loadBtn = document.getElementById('loadBtn');
const statusEl = document.getElementById('status');
const globalMetricsEl = document.getElementById('globalMetrics');
const riskSummaryEl = document.getElementById('riskSummary');
const severityEl = document.getElementById('severity');
const topRiskRowsEl = document.getElementById('topRiskRows');
const violationRowsEl = document.getElementById('violationRows');

function renderList(el, entries) {
  el.innerHTML = '';
  for (const [label, value] of entries) {
    const li = document.createElement('li');
    li.textContent = `${label}: ${value}`;
    el.appendChild(li);
  }
}

function renderTopRisk(rows) {
  topRiskRowsEl.innerHTML = '';
  for (const row of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.id || ''}</td>
      <td>${row.changeRiskScore ?? 0}</td>
      <td>${row.loc ?? 0}</td>
      <td>${row.fanIn ?? 0}</td>
      <td>${row.fanOut ?? 0}</td>
      <td>${row.isCoreModule ? 'yes' : 'no'}</td>
    `;
    topRiskRowsEl.appendChild(tr);
  }
}

function renderViolations(violations) {
  violationRowsEl.innerHTML = '';
  for (const violation of violations) {
    const location = violation.moduleId || `${violation.from || ''}${violation.to ? ` -> ${violation.to}` : ''}`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${violation.severity || ''}</td>
      <td>${violation.ruleId || violation.type || ''}</td>
      <td>${location}</td>
      <td>${violation.message || ''}</td>
    `;
    violationRowsEl.appendChild(tr);
  }
}

async function loadFindings() {
  const file = fileInput.value.trim() || 'findings.json';
  statusEl.textContent = 'Loading...';

  try {
    const summaryResp = await fetch(`/api/findings/summary?file=${encodeURIComponent(file)}`);
    if (!summaryResp.ok) throw new Error(`Summary request failed: ${summaryResp.status}`);
    const summaryData = await summaryResp.json();

    const findingsResp = await fetch(`/api/findings?file=${encodeURIComponent(file)}`);
    if (!findingsResp.ok) throw new Error(`Findings request failed: ${findingsResp.status}`);
    const findingsData = await findingsResp.json();

    const global = summaryData.globalMetrics || {};
    renderList(globalMetricsEl, [
      ['generatedAt', summaryData.generatedAt || 'n/a'],
      ['totalModules', global.totalModules ?? 0],
      ['totalEdges', global.totalEdges ?? 0],
      ['avgInstability', global.avgInstability ?? 0],
      ['cycleCount', global.cycleCount ?? 0],
      ['coreModules', global.coreModules ?? 0],
    ]);

    const risk = summaryData.riskSummary || {};
    renderList(riskSummaryEl, [
      ['highRiskModules', risk.highRiskModules ?? 0],
      ['mediumRiskModules', risk.mediumRiskModules ?? 0],
      ['lowRiskModules', risk.lowRiskModules ?? 0],
    ]);

    const sev = summaryData.bySeverity || {};
    renderList(severityEl, [
      ['critical', sev.critical ?? 0],
      ['high', sev.high ?? 0],
      ['medium', sev.medium ?? 0],
      ['low', sev.low ?? 0],
    ]);

    renderTopRisk(summaryData.topRisk || []);
    renderViolations(findingsData.findings?.violations || []);

    statusEl.textContent = `Loaded ${file}`;
  } catch (err) {
    statusEl.textContent = `Error: ${String(err)}`;
  }
}

loadBtn.addEventListener('click', loadFindings);
loadFindings();
