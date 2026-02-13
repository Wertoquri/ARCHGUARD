const loadBtn = document.getElementById('load');
const downloadBtn = document.getElementById('download');
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

loadBtn.addEventListener('click', loadPolicy);
downloadBtn.addEventListener('click', downloadPolicy);

// auto-load
loadPolicy();
