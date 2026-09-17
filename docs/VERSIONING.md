# Versioning

Same scheme as SWI Explorer and RESA Critical Power Solutions, trimmed for a
desktop-only hub. There is no public web product, so there is no `.w` suffix.

## Scheme

- `major.minor` live in `package.json` and change only with an explicit
  `npm run release:minor` / `release:major`.
- `patch` is computed at release time: commits since git tag `vbase-<major>.<minor>`.
- The MSI writes that computed `X.Y.N` into `package.json` before packaging.
- After upload, tag `electron-vX.Y.N` so desktop releases are searchable.

Starting line: **1.0.0**.

| Event | Command | Result |
| --- | --- | --- |
| First commit + anchor | `git tag vbase-1.0 && git push origin vbase-1.0` | counter starts |
| Local unsigned MSI | `npm run build:msi` | uses current `package.json` |
| Signed MSI + S3 | `npm run release:msi:upload` | version = computed `1.0.N` |
| Bump minor | `npm run release:minor -- --upload` | `1.1.0`, then move `vbase-1.1` |
| Check next number | `npm run version:compute` | prints `1.0.N` |

## Why not 0.1.0

`0.1.0` is a scaffold number. SWI is on `2.1.x` and RESA on `1.2.x` because those
are shipped product lines. This hub’s first customer MSI should be `1.0.0`.

## What we are not copying yet

- Web CI / `.w` display version (no hosted web app).
- RESA beta → `promote-release.js` (add when a test channel is needed).
- SWI content packs and auto-updater feed (this hub launches local EXEs).
- Electron builds in GitHub Actions (signing still needs the SafeNet token).
