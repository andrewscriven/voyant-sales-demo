const fs = require('fs');
const path = require('path');

function parseVersion(version) {
  const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Invalid semver: ${version}`);
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function nextVersion(current, bumpType) {
  const parsed = parseVersion(current);
  if (bumpType === 'major') return `${parsed.major + 1}.0.0`;
  if (bumpType === 'minor') return `${parsed.major}.${parsed.minor + 1}.0`;
  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function main() {
  const bump = process.argv[2] || 'patch';
  const pkgPath = path.resolve(__dirname, '../package.json');
  const lockPath = path.resolve(__dirname, '../package-lock.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const next = /^\d+\.\d+\.\d+$/.test(bump) ? bump : nextVersion(pkg.version, bump);

  const oldVersion = pkg.version;
  pkg.version = next;
  if (pkg.build) pkg.build.buildVersion = next;
  writeJson(pkgPath, pkg);

  if (fs.existsSync(lockPath)) {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    lock.version = next;
    if (lock.packages?.['']) lock.packages[''].version = next;
    writeJson(lockPath, lock);
  }

  console.log(`Version ${oldVersion} -> ${next}`);

  const oldP = parseVersion(oldVersion);
  const newP = parseVersion(next);
  if (oldP.major !== newP.major || oldP.minor !== newP.minor) {
    const baseTag = `vbase-${newP.major}.${newP.minor}`;
    console.log(`\nMinor/major changed. After the first commit on this line:`);
    console.log(`  git tag ${baseTag}`);
    console.log(`  git push origin ${baseTag}`);
  }
}

main();
