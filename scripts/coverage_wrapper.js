import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function runVitest() {
  const res = spawnSync('npx', ['vitest', 'run', '--no-isolate', '--no-file-parallelism', '--maxWorkers=1'], {
    stdio: 'inherit',
    shell: false,
  });
  return res.status;
}

async function runCoverageRunner() {
  // import the ESM module dynamically (use URL.href on Windows)
  await import(new URL('./coverage_runner.js', import.meta.url).href);
}

(async () => {
  const status = runVitest();
  try {
    await runCoverageRunner();
  } catch (e) {
    console.error('coverage_wrapper: runner failed', e);
    process.exit(1);
  }
  process.exit(status ?? 0);
})();
