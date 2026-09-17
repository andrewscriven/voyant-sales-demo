#!/usr/bin/env node
import { execSync, spawnSync } from 'node:child_process';

const computed = execSync('node scripts/compute-version.mjs', { encoding: 'utf8' }).trim();
if (!/^\d+\.\d+\.\d+$/.test(computed)) {
  console.error(`compute-version produced an invalid version: "${computed}"`);
  process.exit(1);
}

const result = spawnSync('node', ['scripts/bump-version.js', computed, ...process.argv.slice(2)], {
  stdio: 'inherit',
});
process.exit(result.status || 0);
