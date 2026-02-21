/**
 * ARCHGUARD — Scanner Module
 *
 * Responsibilities:
 *   - Recursive file-system scanning
 *   - Include / exclude pattern matching
 *   - Deterministic file ordering (sorted)
 *   - Ignore node_modules, dist, build, .git, coverage by default
 *
 * Input:  rootDir (string), options? ({include?, exclude?})
 * Output: string[] — sorted absolute file paths
 */

import fg from 'fast-glob';
import path from 'node:path';

const DEFAULT_INCLUDE = ['**/*.{ts,tsx,js,jsx,mjs,cjs}'];

const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/coverage/**',
  '**/__snapshots__/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/*.d.ts',
];

/**
 * Scan a project directory for source files.
 *
 * @param {string} rootDir  Absolute path to the project root.
 * @param {object} [opts]
 * @param {string[]} [opts.include]  Glob patterns for files to include.
 * @param {string[]} [opts.exclude]  Glob patterns for files to exclude.
 * @returns {Promise<string[]>}  Sorted absolute file paths.
 */
export async function scan(rootDir, opts = {}) {
  const root = path.resolve(rootDir);
  const include = opts.include?.length ? opts.include : DEFAULT_INCLUDE;
  const exclude = opts.exclude?.length ? [...DEFAULT_EXCLUDE, ...opts.exclude] : DEFAULT_EXCLUDE;

  const files = await fg(include, {
    cwd: root,
    absolute: true,
    onlyFiles: true,
    dot: false,
    ignore: exclude,
  });

  // Deterministic ordering — always sorted lexicographically by the
  // normalised relative path so results are stable across OS / locale.
  files.sort((a, b) => {
    const ra = path.relative(root, a);
    const rb = path.relative(root, b);
    return ra.localeCompare(rb, 'en');
  });

  return files;
}

export { DEFAULT_INCLUDE, DEFAULT_EXCLUDE };
