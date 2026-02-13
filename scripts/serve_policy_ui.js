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

// Convert structured policy JSON -> YAML (no save)
app.post('/api/policy/convert', (req, res) => {
  const { policy } = req.body || {};
  if (!policy) return res.status(400).json({ error: 'Missing policy object' });
  try {
    const raw = yaml.stringify(policy);
    return res.json({ ok: true, raw });
  } catch (err) {
    return res.status(500).json({ error: 'conversion failed', details: String(err) });
  }
});

// Save edited policy and create branch + PR using gh (requires POLICY_UI_ENABLE_GITHUB=1)
app.post('/api/save_and_pr', (req, res) => {
  if (process.env.POLICY_UI_ENABLE_GITHUB !== '1') {
    return res.status(403).json({ error: 'GitHub flow disabled on this server' });
  }
  const { raw, branch, title, body } = req.body || {};
  if (!raw || !branch || !title) return res.status(400).json({ error: 'Missing raw, branch or title' });

  const policyPath = path.join(process.cwd(), 'examples', 'policy.yaml');
  const backup = `${policyPath}.${Date.now()}.bak`;
  try {
    if (fs.existsSync(policyPath)) fs.copyFileSync(policyPath, backup);
    fs.writeFileSync(policyPath, raw, 'utf8');
  } catch (err) {
    return res.status(500).json({ error: 'failed to write policy', details: String(err) });
  }

  // Simple guarded git + gh flow
  const safeBranch = branch.replace(/[^a-zA-Z0-9_\-\/]/g, '-');
  const commitMsg = `chore(policy): update via Policy UI`;
  const cmds = [
    `git checkout -b ${safeBranch}`,
    `git add ${policyPath}`,
    `git commit -m "${commitMsg}" || true`,
    `git push -u origin ${safeBranch}`,
    `gh pr create --title "${title.replace(/"/g, '\\"')}" --body "${(body||'').replace(/"/g, '\\"')}" --base main --head ${safeBranch} --fill`
  ].join(' && ');

  exec(cmds, { cwd: process.cwd(), env: process.env, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: 'git/gh flow failed', details: stderr || String(err) });
    }
    // try to extract PR url from stdout
    const match = stdout.match(/https:\/\/github.com\/[^\s]+\/pull\/\d+/);
    const prUrl = match ? match[0] : null;
    return res.json({ ok: true, stdout, stderr, prUrl });
  });
});

app.listen(port, () => {
  console.log(`Policy UI running at http://localhost:${port}/`);
});
