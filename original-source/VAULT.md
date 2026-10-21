# Director’s Desk daily archive

The user wants all daily work in this Site's Vault. The visible archive has one expandable cover per day; opening it shows all that day's content, organised into Study, Writing, Korean and Other work. It is an assistant-maintained published archive, not an automatic transcript of chat messages. Do not redirect the user to Obsidian or create extra logging chores.

## Add actual work

1. Follow the normal existing-Site source-opening workflow before editing, so work saved in another conversation is preserved.
2. Read `dist/session-vault.json`. Keep existing entries, IDs and full content.
3. Add the actual piece with a stable unique `id`, `archiveDate` in `YYYY-MM-DD` form for the user's work day in Asia/Kolkata, its `month`, an appropriate `type`, clear `title`, and complete `content`. Useful types include Film study, Scene, Screenplay, Revision, Observation and Korean. The view groups every entry with that date into the same day automatically.
4. Set `status: "saved"` for actual submitted work. `ready` or `template` are setup spaces and do not count as produced work. When the user supplies the Day 2 analysis, update the existing `film-study-log` entry for Day 2 with the real full analysis, rather than maintaining one giant global study log across future days. Later days get their own study entry.
5. Keep original and revised work identifiable. Do not replace an original with a rewrite unless the user asks; meaningful versions can be separate entries within the same day, or clearly labelled sections of one entry. Never fabricate missing Day 1 content from checked task boxes.
6. Prepared empty dates may be added to `days`, but they are not required when entries exist. Day numbers are calculated from the training start, 11 October 2026; Day 1 is that date, Day 2 is 12 October. The user does not need to provide timestamps or manual metadata logs.
7. Validate the archive and existing plan checks, package and publish privately through Sites. Report a saved item only after successful publication.

Published archive content is available from the same private Site across devices. Browser-local legacy archive entries remain visible alongside published entries, deduplicated by ID with published entries taking precedence. The backup export includes both task state and the published archive; restoring a backup imports its archive snapshot into that browser without overwriting the live published source.
