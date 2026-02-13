import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';

const DEFAULT_PATTERNS = ['**/*.{ts,tsx,js,jsx}'];

export async function collectSourceFiles(rootDir, patterns = DEFAULT_PATTERNS) {
  return fg(patterns, {
    cwd: rootDir,
    absolute: true,
    onlyFiles: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/coverage/**'],
  });
}

export function countLoc(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content) {
    return 0;
  }
  return content.split(/\r?\n/).length;
}

export function toModuleId(rootDir, filePath) {
  const relativePath = path.relative(rootDir, filePath);
  return relativePath.split(path.sep).join('/');
}

export function tryResolveImport(sourceFile, importPath) {
  const baseDir = path.dirname(sourceFile);
  const candidates = [
    importPath,
    `${importPath}.ts`,
    `${importPath}.tsx`,
    `${importPath}.js`,
    `${importPath}.jsx`,
    path.join(importPath, 'index.ts'),
    path.join(importPath, 'index.tsx'),
    path.join(importPath, 'index.js'),
    path.join(importPath, 'index.jsx'),
  ];

  for (const candidate of candidates) {
    const resolved = path.resolve(baseDir, candidate);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      return resolved;
    }
  }

  return null;
}
