# Voyant Sales Demo

Standalone Electron hub for Voyant sales conversations. The table of contents uses the same page scale-and-slide animation as SWI Explorer. Local customer EXEs are launched from this app; if an EXE is already running, it is brought to the foreground.

## Run

```powershell
cd "e:\NewCo\.sales-demo"
npm install
npm start
```

Web-only preview (no EXE launching):

```powershell
npm run dev
```

## Demo paths

Default install paths come from the sales-demo spec PowerPoint. Overrides are stored in the Electron userData file `demo-paths.json`.

If a tile says **Missing**, install that demo on the machine or update the path override.

## Assets

Images, fonts, and videos are local under `public/`. `public/videos/` is gitignored and must be present on the machine. The only network opens are intentional browser links (Cytiva Figurate, GE Multilin Selector, and the Analytics Demo).
