# Release pipeline

Copied from SWI Explorer and RESA, then simplified.

## How SWI / RESA ship

Two independent lineages:

1. **Web** — push `staging`/`main` → GitHub Actions → app S3 + CloudFront.
2. **Desktop MSI** — built on a Windows machine, signed with the SafeNet USB
   token via `signtool`, uploaded to `s3://voyantstudios.com/downloads/...`.
   No CI for Electron. The token prompt cannot run in GitHub Actions.

Download pages are static HTML on voyantstudios.com. They are not htpasswd.
The page posts username/password to
`https://analytics.voyantstudios.com/api/installer-access/<client>/public-download`.
Analytics checks a SHA-256 of `username|password`, reads a JSON manifest, and
returns a 5-minute S3 presigned URL. The MSI itself stays private.

| App | Page | S3 prefix |
| --- | --- | --- |
| SWI | `/downloads/swi-explorer.html` | `downloads/.pkg-swi-explorer/msi-content/` |
| RESA | `/downloads/resa-critical-power-solutions/latest.html` | `downloads/resa-critical-power-solutions/` |
| This hub | `/downloads/voyant-sales-demo.html` | `downloads/voyant-sales-demo/` |

RESA also has a beta-then-promote step. SWI publishes per-channel pages.
This hub starts with a single stable channel, like a first SWI release.

## This app

```powershell
cd E:\NewCo\.sales-demo
npm run icon                  # PNG → public/icon.ico
npm run build:msi             # local unsigned MSI
npm run release:msi:upload    # bump from git, sign, upload, invalidate CF
git tag electron-v1.0.N
git push origin electron-v1.0.N
```

Prereqs: Windows SDK (`signtool`), SafeNet token, AWS CLI, Analytics env
`VOYANT_SALES_DEMO_INSTALLER_PUBLIC_CREDENTIAL_HASH` (and the same hash in
SSM `/voyant-analytics/prod/app/INSTALLER_ACCESS_CHANNELS_JSON` if you add a
`voyant` channel there).

See `VERSIONING.md` for the number scheme.
