/**
 * ARCHGUARD — Parser Module
 *
 * Responsibilities:
 *   - AST parsing for JS / TS / JSX / TSX via TypeScript compiler API
 *   - Extract: static imports, re-exports, dynamic import(), require()
 *   - Graceful error handling per file (never crashes the pipeline)
 *   - Edge deduplication per source file
 *
 * Input:  rootDir (string), filePaths (string[])
 * Output: { nodes: ParsedNode[], edges: ParsedEdge[] }
 */

import fs from 'node:fs';
import ts from 'typescript';
import { countLoc, toModuleId, tryResolveImport } from '../utils/fs.js';

/**
 * Walk the AST tree recursively to find all import specifiers.
 * Captures: import '…', export … from '…', import('…'), require('…').
 */
function extractSpecifiers(node, sourceFile) {
  const specifiers = [];

  // Static import declaration: import x from './foo'
  if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
    specifiers.push(node.moduleSpecifier.getText(sourceFile).replace(/['"]/g, ''));
  }

  // Re-export: export { x } from './foo'  /  export * from './foo'
  if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
    specifiers.push(node.moduleSpecifier.getText(sourceFile).replace(/['"]/g, ''));
  }

  // Dynamic import: import('./foo')
  if (ts.isCallExpression(node)) {
    const expr = node.expression;
    // import(…) — SyntaxKind 100 = ImportKeyword
    if (expr.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length > 0) {
      const arg = node.arguments[0];
      if (ts.isStringLiteral(arg)) {
        specifiers.push(arg.text);
      }
    }
    // require(…)
    if (ts.isIdentifier(expr) && expr.text === 'require' && node.arguments.length > 0) {
      const arg = node.arguments[0];
      if (ts.isStringLiteral(arg)) {
        specifiers.push(arg.text);
      }
    }
  }

  // Recurse into children to catch nested dynamic imports / requires
  ts.forEachChild(node, (child) => {
    specifiers.push(...extractSpecifiers(child, sourceFile));
  });

  return specifiers;
}

export function parseSourceFiles(rootDir, filePaths) {
  const nodes = [];
  const nodeSeen = new Map();
  const edgeSet = new Set(); // "from::to" — deduplication
  const edges = [];

  for (const filePath of filePaths) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      // Unreadable file (permissions, binary) — skip without crashing
      continue;
    }

    let sourceFile;
    try {
      sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    } catch {
      // Syntax error — skip gracefully
      continue;
    }

    const moduleId = toModuleId(rootDir, filePath);

    if (!nodeSeen.has(moduleId)) {
      nodeSeen.set(moduleId, {
        id: moduleId,
        filePath,
        loc: countLoc(filePath),
      });
      nodes.push(nodeSeen.get(moduleId));
    }

    // Collect ALL specifiers from the full AST
    const specifiers = extractSpecifiers(sourceFile, sourceFile);

    for (const specifier of specifiers) {
      // Only resolve relative imports (skip bare package specifiers)
      if (!specifier.startsWith('.')) continue;

      const resolved = tryResolveImport(filePath, specifier);
      if (!resolved) continue;

      const targetId = toModuleId(rootDir, resolved);
      const key = `${moduleId}::${targetId}`;
      if (edgeSet.has(key)) continue; // deduplicate
      edgeSet.add(key);
      edges.push({ from: moduleId, to: targetId });
    }
  }

  return { nodes, edges };
}
