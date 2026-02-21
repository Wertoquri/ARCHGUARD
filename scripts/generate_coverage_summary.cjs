const fs = require('fs');
const p = 'coverage/lcov.info';
if (!fs.existsSync(p)) {
  console.error('no lcov');
  process.exit(0);
}
const s = fs.readFileSync(p, 'utf8');
const lines = s.split(/\r?\n/);
const out = {};
let cur = null;
for (const l of lines) {
  if (l.startsWith('SF:')) {
    cur = l.slice(3);
  } else if (l.startsWith('LH:') && cur) {
    out[cur] = Number(l.slice(3));
    cur = null;
  }
}
fs.mkdirSync('coverage', { recursive: true });
fs.writeFileSync('coverage/coverage_summary.json', JSON.stringify(out, null, 2));
console.log('Wrote coverage/coverage_summary.json with', Object.keys(out).length, 'entries');
