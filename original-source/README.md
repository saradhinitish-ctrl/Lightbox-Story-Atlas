# Lightbox — Filmmaking Workspace

A browser workspace for developing, visualising, and writing films, with a public homepage and individual signed-in workspaces. The earlier Session Vault and PDFs are preserved under `private-archive` and served through owner-authorized routes at their original URLs. `LIGHTBOX_ARCHIVE_OWNER_ID` is configured in the hosting environment.

## Application

- Blank screenplay, manuscript, and blank-project templates; no example stories or characters.
- Multiple projects with archive and restore.
- Hierarchical Binder with drag-and-drop, folder moves, duplicate, Trash, restore, and reversible structural changes.
- Linked Corkboard and Outliner; freeform cards with explicit commit; Scrivenings; split editor; composition mode.
- Separate rich text notes, character profiles, location profiles, and a structured Tiptap/ProseMirror screenplay editor. New documents inherit the folder's purpose; existing misclassified character/location documents are upgraded without replacing their writing.
- Screenplay editing uses self-hosted Courier Prime at 12 pt on Letter pages, element-specific margins, contextual Enter/Tab, element shortcuts, character/location suggestions, scene navigation, real undo/redo, and continuous full-Draft editing with writing routed back to its original documents.
- Inspector synopsis, document notes, bookmarks, labels, status, keywords, custom fields, word targets, snapshots, version comparison, comments and footnote notes.
- Manual collections, saved searches, text search, snapshot-protected literal replacement, Scratchpad, optional targets, net writing history.
- Private research uploads to R2; inline images and PDF/audio/video/image viewers.
- Compile to PDF, DOCX, FDX, Fountain, TXT, HTML and EPUB. PDF and HTML share a deterministic Letter/Courier 12 layout with page numbers, heading/cue grouping, and continued dialogue. PDF downloads directly and its preview uses the generated PDF. The PDF font supports Latin text; FDX and DOCX preserve non-Latin writing. Text formats do not preserve all rich-text styling.
- Imports TXT, Markdown as text, Fountain, FDX, basic DOCX document text, sanitized HTML, and research attachments.
- Previous Vault reader with optional copying into a user-created project. The old workspace remains at `/legacy/` and retains its original browser-local state key.

## Persistence

Authenticated stable Site user IDs own all writing and uploads. `/api/workspace` stores state in D1 with revision-based compare-and-swap. A unique per-write token conditions every chunk mutation, and D1 batch transactions keep each replacement atomic. Stale writes return 409 without replacing the saved state. UTF-16-safe chunking preserves emoji and multilingual text.

IndexedDB holds device recovery. Pending device writing is not overwritten while the recovery choice is open. If the saved cloud version changed, recovery creates separate projects with remapped document IDs. A conflict pauses saving and offers download/reload/recovery.

Workspace JSON is limited to 8 MB (text, metadata, and snapshots); each research upload to 25 MB. Downloaded JSON backups include writing and file references, not the original uploaded binary assets. Research remains in this Site's private storage. Native `.scriv` import/export is not implemented.

## Verification

`node_modules/.bin/tsc --noEmit`

`node scripts/verify-writing.cjs`

`node scripts/verify-screenplay.cjs`

`node /root/.codex/plugins/cache/openai-curated-remote/sites/1.0.0/scripts/build-site.mjs`

The writing verification exercises actual storage-route SQL against SQLite, owner isolation, conflict prevention, Unicode chunking and rollback on injected write failure, and the project model. The screenplay verification exercises the actual ProseMirror editor in a DOM environment, keyboard transitions, casing, undo/redo, serialization, folder migration, full-Draft routing, and pagination. Generated PDF pages were rendered and inspected, then independently checked for Letter dimensions, 12-point Courier, margins, and page bounds. Word exports are independently checked with Python zipfile/XML. Archive bytes are compared with the previous source version.

Browser interaction/visual QA was unavailable in this execution environment. Live page breaks use the editor's pagination extension; exported PDF page breaks use the deterministic export engine, so exact on-screen/export pagination parity has not been established. The app is a custom browser implementation, not a verified feature-for-feature replacement for native Scrivener or Final Draft.
