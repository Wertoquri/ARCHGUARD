import fs from 'node:fs';
import ts from 'typescript';
import { countLoc, toModuleId, tryResolveImport } from '../utils/fs.js';

export function parseSourceFiles(rootDir, filePaths) {
  const nodes = [];
  const edges = [];
  const nodeSeen = new Map();

  for (const filePath of filePaths) {
    const content = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    const moduleId = toModuleId(rootDir, filePath);

    if (!nodeSeen.has(moduleId)) {
      nodeSeen.set(moduleId, {
        id: moduleId,
        filePath,
        loc: countLoc(filePath),
      });
      nodes.push(nodeSeen.get(moduleId));
    }

    sourceFile.forEachChild((child) => {
      if (ts.isImportDeclaration(child) && child.moduleSpecifier) {
        const specifier = child.moduleSpecifier.getText(sourceFile).replace(/['"]/g, '');
        if (specifier.startsWith('.')) {
          const resolved = tryResolveImport(filePath, specifier);
          if (resolved) {
            edges.push({ from: moduleId, to: toModuleId(rootDir, resolved) });
          }
        }
      }

      if (ts.isExportDeclaration(child) && child.moduleSpecifier) {
        const specifier = child.moduleSpecifier.getText(sourceFile).replace(/['"]/g, '');
        if (specifier.startsWith('.')) {
          const resolved = tryResolveImport(filePath, specifier);
          if (resolved) {
            edges.push({ from: moduleId, to: toModuleId(rootDir, resolved) });
          }
        }
      }
    });
  }

  return { nodes, edges };
}
