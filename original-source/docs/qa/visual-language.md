# Visual Language redesign

Scene-first boards replace the former mixed moodboard. Existing references retain their assets, rich notes, profile links, and legacy scene ownership. References can be shared across explicit scene IDs. Visual intentions are stored per scene, separately from the Film Direction foundation.

Validation: verify-visual-language.cjs covers migration, assignment, draft copying, scene trash/restore, recovery remapping, serialization, validation, and media URL handling. verify-visual-language-ui.cjs mounts the real Studio and checks Atlas entry, scene isolation, shared edits, reassignment, server acknowledgement, reload, screenplay-to-board routing, and failed saves. Existing verify-director-tools.cjs passed.

Browser QA used disposable example content and checked the Atlas card, desktop scene board, multi-scene reference editing, and a 390px phone-width board and editor. The screenplay-to-board route was checked with the third scene in a three-scene document. No example content, QA route, or sample image is included in production. The accompanying screenshot uses example material.
