const loadBtn = document.getElementById('load');
const downloadBtn = document.getElementById('download');
const saveBtn = document.getElementById('save');
const ta = document.getElementById('policy');

async function loadPolicy() {
  loadBtn.disabled = true;
  loadBtn.textContent = 'Loading...';
  try {
    const r = await fetch('/api/policy');
    if (!r.ok) throw new Error('Failed to fetch');
    const j = await r.json();
    ta.value = j.raw || JSON.stringify(j.policy, null, 2);
  } catch (err) {
    ta.value = `Error loading policy: ${err}`;
  } finally {
    loadBtn.disabled = false;
    loadBtn.textContent = 'Load policy';
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

// auto-load
loadPolicy();
