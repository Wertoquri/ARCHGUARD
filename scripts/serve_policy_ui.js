import express from 'express';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const app = express();
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

app.listen(port, () => {
  console.log(`Policy UI running at http://localhost:${port}/`);
});
