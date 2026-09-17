#!/usr/bin/env node
/**
 * Print <major>.<minor>.<patch>
 * major.minor come from package.json (manual).
 * patch = commits since tag vbase-<major>.<minor>. Missing tag → 0.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const [major, minor] = pkg.version.split('.');
const baseTag = `vbase-${major}.${minor}`;

let patch = 0;
if (sh(`git tag --list "${baseTag}"`) === baseTag) {
  patch = parseInt(sh(`git rev-list --count ${baseTag}..HEAD`) || '0', 10);
}

process.stdout.write(`${major}.${minor}.${patch}`);
