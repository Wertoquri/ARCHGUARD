#!/usr/bin/env node
import { Command } from 'commander';
import { analyzeProject, shouldFail, SEVERITY_LEVELS } from './index.js';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const program = new Command();

program
  .name('archguard')
  .description('ARCHGUARD - Architectural Policy & Risk Engine')
  .version('0.1.0')
  .option('-p, --project <path>', 'Project root directory', '.')
  .option('-r, --policy <file>', 'Policy YAML file')
  .option('-o, --out <file>', 'Output findings.json path', 'findings.json')
  .option('--output-dir <dir>', 'Output directory for findings.json, metrics.json, summary.json')
  .option('--ai-summary <file>', 'Write AI summary to a text file')
  .option('--fail-on <severity>', 'Fail on severity (low|medium|high|critical)', 'high')
  .option('--dry-run', 'Generate migration bundle from docs/pr_diffs (no changes)')
  .option('--patch-out <dir>', 'Directory to write migration bundle', 'migration_bundle')
  .option('--apply-patch', 'Apply migration files to the target project (creates .bak backups)')
  .option(
    '--init [pack]',
    'Initialize ARCHGUARD config files and policy from a policy pack (default: legacy-safe)'
  )
  .option('--force-init', 'Overwrite existing generated files when used with --init')
  .option('--doctor', 'Run local environment diagnostics for ARCHGUARD')
  .option('--explain <ruleId>', 'Explain a specific rule from the selected policy file')
  .parse(process.argv);

const options = program.opts();
const failOn = options.failOn;
const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(repoRoot, '..');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeIfMissingOrForced(filePath, content, force) {
  if (fs.existsSync(filePath) && !force) {
    return false;
  }
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function runDoctor(projectRoot) {
  const checks = [];
  const cwd = path.resolve(projectRoot || '.');
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  checks.push({ check: 'node-version', ok: nodeMajor >= 18, details: process.version });

  const gh = spawnSync('gh', ['--version'], { encoding: 'utf8' });
  checks.push({
    check: 'github-cli',
    ok: gh.status === 0,
    details:
      gh.status === 0 ? (gh.stdout || '').split('\n')[0] : (gh.stderr || 'gh not found').trim(),
  });

  const requiredPaths = [
    'examples/policy.yaml',
    'config/archguard-baseline.json',
    'config/ownership-map.json',
    '.github/workflows/ci.yml',
  ];

  for (const p of requiredPaths) {
    const abs = path.resolve(cwd, p);
    checks.push({ check: `file:${p}`, ok: fs.existsSync(abs), details: abs });
  }

  const failed = checks.filter((item) => !item.ok);
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), cwd, checks }, null, 2));
  if (failed.length > 0) {
    process.exit(1);
  }
}

function runInit(packValue, force) {
  const packName =
    typeof packValue === 'string' && packValue.trim() !== '' ? packValue.trim() : 'legacy-safe';
  const sourcePolicy = path.resolve(workspaceRoot, 'policy-packs', `${packName}.yaml`);
  const fallbackPolicy = path.resolve(workspaceRoot, 'examples', 'policy.yaml');
  const targetPolicy = path.resolve(workspaceRoot, 'examples', 'policy.yaml');
  const baselinePath = path.resolve(workspaceRoot, 'config', 'archguard-baseline.json');
  const ownershipPath = path.resolve(workspaceRoot, 'config', 'ownership-map.json');

  if (!fs.existsSync(sourcePolicy) && !fs.existsSync(fallbackPolicy)) {
    console.error('No policy source found. Expected policy pack or examples/policy.yaml.');
    process.exit(2);
  }

  ensureDir(path.dirname(targetPolicy));
  ensureDir(path.dirname(baselinePath));
  ensureDir(path.dirname(ownershipPath));

  const policySource = fs.existsSync(sourcePolicy) ? sourcePolicy : fallbackPolicy;
  const policyContent = fs.readFileSync(policySource, 'utf8');
  const baselineContent = fs.existsSync(baselinePath)
    ? fs.readFileSync(baselinePath, 'utf8')
    : '{\n  "ignoredViolations": []\n}\n';
  const ownershipContent = fs.existsSync(ownershipPath)
    ? fs.readFileSync(ownershipPath, 'utf8')
    : '{\n  "owners": [],\n  "defaultOwner": "unowned"\n}\n';

  const written = [];
  if (writeIfMissingOrForced(targetPolicy, policyContent, force)) written.push(targetPolicy);
  if (writeIfMissingOrForced(baselinePath, baselineContent, force)) written.push(baselinePath);
  if (writeIfMissingOrForced(ownershipPath, ownershipContent, force)) written.push(ownershipPath);

  console.log(`Initialized with policy pack: ${packName}`);
  if (written.length === 0) {
    console.log('No files changed (use --force-init to overwrite existing files).');
  } else {
    for (const filePath of written) {
      console.log(`Updated: ${filePath}`);
    }
  }
}

function runExplain(policyPath, ruleId) {
  if (!policyPath) {
    console.error('--explain requires --policy <file>.');
    process.exit(2);
  }
  const abs = path.resolve(policyPath);
  if (!fs.existsSync(abs)) {
    console.error(`Policy file not found: ${abs}`);
    process.exit(2);
  }

  const raw = fs.readFileSync(abs, 'utf8');
  const parsed = YAML.parse(raw);
  const rules = Array.isArray(parsed?.rules) ? parsed.rules : [];
  const rule = rules.find((item) => item?.id === ruleId);

  if (!rule) {
    console.error(`Rule not found: ${ruleId}`);
    process.exit(1);
  }

  console.log(JSON.stringify({ ruleId, policyPath: abs, rule }, null, 2));
}

if (!SEVERITY_LEVELS.includes(failOn)) {
  console.error('Invalid --fail-on value. Use low, medium, high, or critical.');
  process.exit(2);
}

if (options.init !== undefined) {
  runInit(options.init, Boolean(options.forceInit));
  process.exit(0);
}

if (options.doctor) {
  runDoctor(options.project);
  process.exit(0);
}

if (options.explain) {
  runExplain(options.policy, options.explain);
  process.exit(0);
}

if (!options.policy) {
  console.error('Missing required option: --policy <file>');
  process.exit(2);
}

try {
  const report = await analyzeProject({
    projectRoot: options.project,
    policyPath: options.policy,
    outputPath: options.out,
    outputDir: options.outputDir,
    failOn,
    aiSummaryPath: options.aiSummary,
  });

  // Migration bundle generation / apply
  if (options.dryRun || options.applyPatch) {
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
