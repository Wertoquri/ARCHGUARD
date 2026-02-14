import fs from 'fs';

(async () => {
  try {
    const fd = new FormData();
    const buf = fs.readFileSync('policy-packs/strict-security.yaml');
    const blob = new Blob([buf]);
    fd.append('file', blob, 'strict-security.yaml');

    const res = await fetch('http://localhost:5174/api/policy/packs/upload-with-version', { method: 'POST', body: fd });
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error('ERROR', e);
    process.exit(1);
  }
})();
