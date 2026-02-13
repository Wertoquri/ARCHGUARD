import fs from 'node:fs';
import path from 'node:path';

export function applyBundle(projectRoot, bundleDir, manifest) {
  // manifest: array of { file, src, dest }
  const applied = [];
  for (const item of manifest) {
    const rel = item.file;
    const srcPath = path.resolve(bundleDir, rel);
    const targetPath = path.resolve(projectRoot, rel);

    // ensure target dir
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // backup existing
    if (fs.existsSync(targetPath)) {
      fs.copyFileSync(targetPath, `${targetPath}.bak`);
    }

    // copy from bundle
    fs.copyFileSync(srcPath, targetPath);
    applied.push({ targetPath, backup: fs.existsSync(`${targetPath}.bak`) });
  }
  return applied;
}

export function rollbackBundle(projectRoot, manifest) {
  for (const item of manifest) {
    const rel = item.file;
    const targetPath = path.resolve(projectRoot, rel);
    const bakPath = `${targetPath}.bak`;
    if (fs.existsSync(bakPath)) {
      fs.copyFileSync(bakPath, targetPath);
      fs.unlinkSync(bakPath);
    } else {
      // no backup — remove the applied file
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
    }
  }
}
