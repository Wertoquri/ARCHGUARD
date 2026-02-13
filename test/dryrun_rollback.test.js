import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { describe, it, expect } from 'vitest';
import { applyBundle, rollbackBundle } from '../src/migration/runner.js';

function mkdtemp(prefix = 'archguard-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe('migration dry-run and rollback', () => {
  it('applies bundle, creates backups, and rolls back', () => {
    const proj = mkdtemp();
    const bundle = mkdtemp('bundle-');

    // prepare original project file
    const rel = path.join('src', 'foo.js');
    const projFile = path.join(proj, rel);
    fs.mkdirSync(path.dirname(projFile), { recursive: true });
    fs.writeFileSync(projFile, 'original', 'utf8');

    // create bundle file
    const bundleFile = path.join(bundle, rel);
    fs.mkdirSync(path.dirname(bundleFile), { recursive: true });
    fs.writeFileSync(bundleFile, 'migrated', 'utf8');

    const manifest = [{ file: rel }];

    const applied = applyBundle(proj, bundle, manifest);
    expect(applied.length).toBe(1);
    expect(fs.existsSync(projFile + '.bak')).toBe(true);
    expect(fs.readFileSync(projFile, 'utf8')).toBe('migrated');

    rollbackBundle(proj, manifest);
    expect(fs.existsSync(projFile + '.bak')).toBe(false);
    expect(fs.readFileSync(projFile, 'utf8')).toBe('original');

    // cleanup
    fs.rmSync(proj, { recursive: true, force: true });
    fs.rmSync(bundle, { recursive: true, force: true });
  });
});
