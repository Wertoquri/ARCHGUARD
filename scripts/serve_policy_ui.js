import express from 'express';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const app = express();
app.use(express.json({ limit: '1mb' }));
const port = process.env.PORT || 5174;

const uiDir = path.join(process.cwd(), 'policy-ui');

app.use(express.static(uiDir));

app.get('/api/policy', (req, res) => {
  const policyPath = path.join(process.cwd(), 'examples', 'policy.yaml');
  if (!fs.existsSync(policyPath)) return res.status(404).json({ error: 'policy not found' });
  const txt = fs.readFileSync(policyPath, 'utf8');
  try {
    const parsed = yaml.parse(txt);
    return res.json({ ok: true, policy: parsed, raw: txt });
  } catch (err) {
    return res.status(500).json({ error: 'failed to parse policy', details: String(err) });
  }
});

// Save edited policy (requires enabling via env var POLICY_UI_ENABLE_SAVE=1)
app.post('/api/policy', (req, res) => {
  if (process.env.POLICY_UI_ENABLE_SAVE !== '1') {
    return res.status(403).json({ error: 'Saving disabled on this server' });
  }

  const { raw } = req.body || {};
  if (!raw || typeof raw !== 'string') return res.status(400).json({ error: 'Missing raw policy content' });

  const policyPath = path.join(process.cwd(), 'examples', 'policy.yaml');
  try {
    // backup existing
    if (fs.existsSync(policyPath)) {
      const bak = `${policyPath}.${Date.now()}.bak`;
      fs.copyFileSync(policyPath, bak);
    }
    fs.writeFileSync(policyPath, raw, 'utf8');
    return res.json({ ok: true, savedTo: policyPath });
  } catch (err) {
    return res.status(500).json({ error: 'failed to save', details: String(err) });
  }
});

// Evaluate policy by running the CLI. Enabled only when POLICY_UI_ENABLE_EVAL=1
app.post('/api/evaluate', (req, res) => {
  if (process.env.POLICY_UI_ENABLE_EVAL !== '1') {
    return res.status(403).json({ error: 'Evaluation disabled on this server' });
  }

  const outDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `findings_ui_${Date.now()}.json`);

  const cmd = `node ./src/cli.js --policy examples/policy.yaml --out ${outFile} --fail-on critical`;

  exec(cmd, { cwd: process.cwd(), env: process.env }, (err, stdout, stderr) => {
    if (err) {
      // CLI may exit with non-zero when violations found; still attempt to read output
    }
    if (!fs.existsSync(outFile)) {
      return res.status(500).json({ error: 'Analysis failed', stdout, stderr });
    }
    try {
      const txt = fs.readFileSync(outFile, 'utf8');
      const j = JSON.parse(txt);
      return res.json({ ok: true, findings: j });
    } catch (e) {
      return res.status(500).json({ error: 'failed to read findings', details: String(e) });
    }
  });
});

app.listen(port, () => {
  console.log(`Policy UI running at http://localhost:${port}/`);
});
