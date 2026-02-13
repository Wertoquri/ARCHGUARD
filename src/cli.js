#!/usr/bin/env node
import { Command } from 'commander';
import { analyzeProject, shouldFail, SEVERITY_LEVELS } from './index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const program = new Command();

program
  .name('archguard')
  .description('ARCHGUARD - Architectural Policy & Risk Engine')
  .option('-p, --project <path>', 'Project root directory', '.')
  .requiredOption('-r, --policy <file>', 'Policy YAML file')
  .option('-o, --out <file>', 'Output findings.json path', 'findings.json')
  .option('--ai-summary <file>', 'Write AI summary to a text file')
  .option('--fail-on <severity>', 'Fail on severity (low|medium|high|critical)', 'high')
  .option('--dry-run', 'Generate migration bundle from docs/pr_diffs (no changes)')
  .option('--patch-out <dir>', 'Directory to write migration bundle', 'migration_bundle')
  .option('--apply-patch', 'Apply migration files to the target project (creates .bak backups)')
  .parse(process.argv);

const options = program.opts();
const failOn = options.failOn;

if (!SEVERITY_LEVELS.includes(failOn)) {
  console.error('Invalid --fail-on value. Use low, medium, high, or critical.');
  process.exit(2);
}

/* eslint-disable no-console */

try {
  const report = await analyzeProject({
    projectRoot: options.project,
    policyPath: options.policy,
    outputPath: options.out,
    failOn,
    aiSummaryPath: options.aiSummary,
  });

  // Migration bundle generation / apply
  if (options.dryRun || options.applyPatch) {
    const repoRoot = path.dirname(fileURLToPath(import.meta.url));
    // repoRoot points to src; move up one
    const workspaceRoot = path.resolve(repoRoot, '..');
    const diffsDir = path.join(workspaceRoot, 'docs', 'pr_diffs');
    const outDir = path.resolve(options.patchOut || 'migration_bundle');
    const files = [];
    if (fs.existsSync(diffsDir)) {
      const entries = fs.readdirSync(diffsDir);
      for (const e of entries) {
        if (!e.endsWith('.patch')) continue;
        const content = fs.readFileSync(path.join(diffsDir, e), 'utf8');
        // find all lines like: *** Update File: src/...
        const re = /\*\*\*\s+(?:Update|Add) File:\s+(.+)$/gm;
        let m;
        while ((m = re.exec(content)) !== null) {
          let fp = m[1].trim();
          // strip leading a/ from Add File entries
          if (fp.startsWith('a/')) fp = fp.slice(2);
          files.push(fp);
        }
      }
    }

    // create output bundle dir
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const manifest = [];
    for (const f of files) {
      const srcPath = path.join(workspaceRoot, f);
      const destPath = path.join(outDir, f);
      manifest.push({ file: f, src: srcPath, dest: destPath, exists: fs.existsSync(srcPath) });
      if (fs.existsSync(srcPath)) {
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(srcPath, destPath);
      }
    }
    fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`Migration bundle written to: ${outDir}`);

    if (options.applyPatch) {
      // apply by copying files into projectRoot (options.project)
      for (const item of manifest) {
        if (!item.exists) {
          console.warn(`Skipping missing source file: ${item.src}`);
          continue;
        }
        const targetPath = path.join(path.resolve(options.project), item.file);
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        // backup
        if (fs.existsSync(targetPath)) {
          fs.copyFileSync(targetPath, `${targetPath}.bak`);
        }
        fs.copyFileSync(item.src, targetPath);
        console.log(`Applied ${item.file} -> ${targetPath}`);
      }
    }
  }

  if (shouldFail(report, failOn)) {
    console.error('Policy violations exceed configured threshold.');
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(2);
}
