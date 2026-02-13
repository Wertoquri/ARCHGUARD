import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

describe('CLI presence', () => {
  it('has `src/cli.js` file', () => {
    const p = path.resolve('src/cli.js');
    expect(fs.existsSync(p)).toBe(true);
  });

  it('has package.json test script for vitest', async () => {
    const pj = path.resolve('package.json');
    const src = await fs.promises.readFile(pj, 'utf8');
    expect(src.includes('vitest')).toBe(true);
  });
});
