import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import knex from '../src/db/knex.js';

async function runMigrations() {
  const migrationsDir = path.join(process.cwd(), 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found.');
    return;
  }
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
    console.log('Applying', f);
    try {
      await knex.raw(sql);
      console.log('Applied', f);
    } catch (e) {
      console.error('Failed to apply', f, e && e.message);
      process.exit(1);
    }
  }
  console.log('Migrations complete');
  await knex.destroy();
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  runMigrations().catch(err => { console.error(err); process.exit(1); });
}
