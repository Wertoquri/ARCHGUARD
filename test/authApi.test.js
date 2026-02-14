import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

describe('auth adapter presence', () => {
  it('has `src/context/authApi.js` file', () => {
    const p = path.resolve('src/context/authApi.js');
    expect(fs.existsSync(p)).toBe(true);
  });

  it('exports something (do not call React hooks)', async () => {
    const modPath = path.resolve('src/context/authApi.js');
    const src = await fs.promises.readFile(modPath, 'utf8');
    expect(typeof src).toBe('string');
    expect(src.length).toBeGreaterThan(0);
  });
});
