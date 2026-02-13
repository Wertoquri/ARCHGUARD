const loadBtn = document.getElementById('load');
const downloadBtn = document.getElementById('download');
const saveBtn = document.getElementById('save');
const ta = document.getElementById('policy');
const evalBtn = document.getElementById('eval');
const results = document.getElementById('results');
const violations = document.getElementById('violations');
const ruleEditor = document.getElementById('rule-editor');
const addRuleBtn = document.getElementById('add-rule');
const applyStructuredBtn = document.getElementById('apply-structured');
const savePrBtn = document.getElementById('save-pr');
const prBranchInput = document.getElementById('pr-branch');
const prTitleInput = document.getElementById('pr-title');

let currentStructuredPolicy = null;

async function loadPolicy() {
  loadBtn.disabled = true;
  loadBtn.textContent = 'Loading...';
  try {
    const r = await fetch('/api/policy');
    if (!r.ok) throw new Error('Failed to fetch');
    const j = await r.json();
    ta.value = j.raw || JSON.stringify(j.policy, null, 2);
    currentStructuredPolicy = j.policy || {};
    renderRuleEditor(currentStructuredPolicy);
  } catch (err) {
    ta.value = `Error loading policy: ${err}`;
  } finally {
    loadBtn.disabled = false;
    loadBtn.textContent = 'Load policy';
  }
}

function renderRuleEditor(policy) {
  ruleEditor.innerHTML = '';
  const rules = policy.rules || [];
  rules.forEach((r, idx) => {
    const wrapper = document.createElement('div');
    wrapper.id = `rule-${idx}`;
    wrapper.style = 'border:1px solid #ddd;padding:8px;margin:6px 0;';
    const idIn = document.createElement('input'); idIn.value = r.id || r.name || ''; idIn.placeholder = 'id (optional)';
    const type = document.createElement('input'); type.value = r.type || ''; type.placeholder = 'type';
    const from = document.createElement('input'); from.value = r.from || ''; from.placeholder = 'from (pattern)';
    const to = document.createElement('input'); to.value = r.to || ''; to.placeholder = 'to (pattern)';
    const threshold = document.createElement('input'); threshold.value = r.threshold || ''; threshold.placeholder = 'threshold (optional)';
    const remove = document.createElement('button'); remove.textContent = 'Remove';
    remove.onclick = () => { currentStructuredPolicy.rules.splice(idx,1); renderRuleEditor(currentStructuredPolicy); };
    wrapper.appendChild(document.createTextNode(`#${idx} `));
    wrapper.appendChild(idIn); wrapper.appendChild(type); wrapper.appendChild(from); wrapper.appendChild(to); wrapper.appendChild(threshold); wrapper.appendChild(remove);
    ruleEditor.appendChild(wrapper);
  });
  if (!rules.length) ruleEditor.textContent = 'No rules in policy.';
}

function addRule(rule) {
  if (!currentStructuredPolicy) currentStructuredPolicy = {};
  if (!currentStructuredPolicy.rules) currentStructuredPolicy.rules = [];
  currentStructuredPolicy.rules.push(rule);
  renderRuleEditor(currentStructuredPolicy);
}

async function applyStructuredToTextarea() {
  if (!currentStructuredPolicy) return alert('No structured policy loaded');
  const wrappers = Array.from(ruleEditor.querySelectorAll('[id^="rule-"]'));
  const newRules = wrappers.map(w => {
    const inputs = w.querySelectorAll('input');
    return {
      id: inputs[0].value || undefined,
      type: inputs[1].value || undefined,
      from: inputs[2].value || undefined,
      to: inputs[3].value || undefined,
      threshold: inputs[4].value ? Number(inputs[4].value) : undefined
    };
  });
  const outPolicy = { ...currentStructuredPolicy, rules: newRules };
  const r = await fetch('/api/policy/convert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ policy: outPolicy }) });
  const j = await r.json();
  if (!r.ok) return alert('Conversion failed: ' + (j.error||JSON.stringify(j)));
  ta.value = j.raw;
  currentStructuredPolicy = outPolicy;
}

async function saveAndCreatePR() {
  const raw = ta.value;
  const branch = prBranchInput.value || `policy-update-${Date.now()}`;
  const title = prTitleInput.value || `Update policy via UI ${new Date().toISOString()}`;
  if (!confirm(`This will create branch '${branch}' and open a PR titled '${title}'. Continue?`)) return;
  try {
    savePrBtn.disabled = true; savePrBtn.textContent = 'Saving & creating PR...';
    const r = await fetch('/api/save_and_pr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raw, branch, title, body: 'Updated via Policy UI' }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || JSON.stringify(j));
    alert('PR created: ' + (j.prUrl || 'See GitHub')); 
  } catch (err) {
    alert('Save+PR failed: ' + err);
  } finally {
    savePrBtn.disabled = false; savePrBtn.textContent = 'Save & Create PR';
  }
}

function downloadPolicy() {
  const blob = new Blob([ta.value], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'policy.yaml';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function savePolicy() {
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  try {
    const r = await fetch('/api/policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: ta.value }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || JSON.stringify(j));
    alert('Saved to repo: ' + j.savedTo);
  } catch (err) {
    alert('Save failed: ' + err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save to repo';
  }
}

loadBtn.addEventListener('click', loadPolicy);
downloadBtn.addEventListener('click', downloadPolicy);
saveBtn.addEventListener('click', savePolicy);
evalBtn.addEventListener('click', evaluatePolicy);
addRuleBtn.addEventListener('click', () => addRule({ type: 'forbidden_dependency', from: '', to: '' }));
applyStructuredBtn.addEventListener('click', applyStructuredToTextarea);
savePrBtn.addEventListener('click', saveAndCreatePR);

// auto-load
loadPolicy();

async function evaluatePolicy() {
  evalBtn.disabled = true;
  evalBtn.textContent = 'Evaluating...';
  results.textContent = 'Running analysis... (server must have POLICY_UI_ENABLE_EVAL=1)';
  try {
    const r = await fetch('/api/evaluate', { method: 'POST' });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || JSON.stringify(j));
    results.textContent = JSON.stringify(j.findings, null, 2);
  } catch (err) {
    results.textContent = 'Evaluation failed: ' + err;
  } finally {
    evalBtn.disabled = false;
    evalBtn.textContent = 'Evaluate policy';
  }
}

function renderViolations(findings) {
  violations.innerHTML = '';
  const list = findings.violations || [];
  if (!list.length) {
    violations.textContent = 'No violations.';
    return;
  }
  const ul = document.createElement('ul');
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = `${v.rule || 'rule'}: ${v.message || JSON.stringify(v)}`;
    a.onclick = (e) => { e.preventDefault(); focusRuleEditor(v.rule); };
    li.appendChild(a);
    ul.appendChild(li);
  }
  violations.appendChild(ul);
}

function focusRuleEditor(ruleId) {
  if (!currentStructuredPolicy || !currentStructuredPolicy.rules) return;
  const idx = currentStructuredPolicy.rules.findIndex(r => r.id === ruleId || r.name === ruleId);
  if (idx === -1) return;
  const el = document.getElementById(`rule-${idx}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
