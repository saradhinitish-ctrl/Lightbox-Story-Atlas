# Lightbox v64 — complete source and portable export

This download was exported from saved Lightbox version 64, source commit
8f6bc46112fdae3bd437b21a3d5b1c045e93eab6.

## What is included

- `index.html`, `styles.css`, `script.js`: a ready-to-run portable workspace.
  React, the editor, PDF generation, icons, the logo, and fonts are bundled.
  No CDN imports, build step, npm install, or server account is needed to use it.
  JavaScript is bundled without minification so its complete code remains readable.
- `original-source/`: all 241 tracked files of the original v64 application,
  byte for byte, including its React/TypeScript components, server routes,
  styles, assets, database schema/migrations, build configuration, and lockfile.
- `export-tools/`: the portable entry point, all five export overrides, and
  a rebuild script. The original source is unchanged.
- `THIRD_PARTY_LICENSES/`: licenses for bundled dependencies and fonts.
- `SOURCE_MANIFEST.json`: source provenance and SHA-256 checksums for every
  original source file.

## Open the portable workspace

1. Extract the ZIP.
2. Keep `index.html`, `styles.css`, and `script.js` together.
3. Open `index.html` in a current browser.

For more consistent browser storage behavior, serve the extracted folder locally:

```sh
python3 -m http.server --bind 127.0.0.1 8000
```

Then open http://localhost:8000/ . Keep the same browser and address to access
saved work. The three root files are the only application files needed for
static hosting; the other folders are development source and documentation.

## Portable behavior and limits

The three-file export is derived from the original v64 client interface, with
local storage substituted for the hosted API. It includes the Story Atlas,
screenplay editor, story development, profiles, visual boards, sequence tools,
and the existing import/export interfaces. Image/file imports are embedded in
the local workspace; individual imports retain the original 25 MB limit.
SVG uploads are rejected in the portable adapter; use raster reference images.

Changes save to this browser using IndexedDB, including revision checks between
local tabs. This version opens directly into a local workspace; it has no hosted
sign-in, cloud sync, shared accounts, or connection to your existing hosted
workspace. Clearing browser storage removes local work. Use the application's
backup/export commands for copies you want to keep outside the browser.
Old backups whose images refer to `/api/assets/...` still require those original
hosted files; those URLs cannot automatically become offline images.
External reference links and externally hosted media require an internet
connection. The legacy owner-only archive viewer remains disabled in portable
mode. Current cloud database contents and uploaded cloud files are not part
of a source-code export.

The complete hosted application cannot run from only three static files: its
sign-in, workspace API, and upload API need a compatible server environment,
D1 database, and R2 file storage. Their actual source is in `original-source/`.
Runtime credentials and cloud database contents are not included.

## Work on the original application

The original package specifies Node.js >=22.13.0 and pnpm 11.25.0. Its existing
scripts and configuration remain intact. Install dependencies in
`original-source/` and use its `dev` / `build` commands in a compatible
Vinext/Cloudflare development environment. Provision the runtime services and
secrets required by that code before deploying the hosted application.

## Rebuild the portable three files (optional)

This is only necessary after editing its source. The supplied root files are
already built.

```sh
cd original-source
pnpm install
cd ../export-tools
npm install
node build-portable.mjs
```

The rebuild script copies the original source into `export-tools/.work`, applies
the export overrides, and regenerates the three root files. It does not modify
the original source or publish a website.

## Verification performed

- Recovered source commit matches saved v64; all 241 original source files are
  included with byte-level checksum verification.
- JavaScript bundle passed Node's syntax check; CSS has no external asset URLs.
- Browser checks passed: application startup, new world creation, local save,
  world restoration after reload, screenplay editing, and screenplay restoration.
- Portable upload-response parsing, embedded-image sanitization, and unsafe-URL
  rejection checks passed.
- ZIP integrity checked. The hosted backend and every editor feature were not
  re-tested as part of this export.
