# Lightbox — Acid Paper

The redesign uses warm paper, exposed ink structure, lime actions and small lavender accents. The Atlas is the most graphic screen. Writing areas deliberately have quieter boundaries and retain the existing editor behavior.

## Palette

| Role | Colour |
| --- | --- |
| Workspace | `#EFEDE6` |
| Cards | `#F9F8F3` |
| Writing surface | `#FFFDF8` |
| Ink | `#181916` |
| Secondary text | `#53564D` |
| Muted / placeholder text | `#66685E` |
| Internal separators | `#CECEC3` |
| Form boundaries | `#8A8D7E` |
| Primary action | `#C6FF00` with ink labels |
| Supporting accent | `#B9A7FF` |
| Supporting surface | `#EBE5FF` |
| Destructive text | `#B4233D` |

Calculated WCAG contrast ratios: ink on writing paper 17.37:1; muted text on cards 5.33:1; secondary text on workspace 6.39:1; ink on lime 14.88:1; destructive text on cards 6.08:1; form boundaries against cards 3.19:1. These checks cover the named tokens, not every possible user-supplied rich-text colour or photograph.

## Interaction and layout

- Cards use compact corners and solid offset shadows. The screenplay card anchors the Atlas with an ink surface; the actual writing page remains paper.
- Editable profile and development cards use a black left-edge focus marker on their outer boundary. They do not add a second outline around the nested textarea.
- Keyboard controls retain visible focus indicators. Reduced motion and Windows forced-colour focus states have explicit treatments.
- Screenplay Courier metrics, indents and pagination are not changed.
- On phones the Atlas becomes one column, the writing page fills its available width, and the six workspace destinations live in a two-column dialog. Director tools retain draft/tools controls without duplicating cramped navigation tabs.
- A separate dark-reference-canvas preference changes the visual board surround. It does not change scene data or recolour uploaded references.

## Implementation and validation

`studio-design.css` loads last. `studio-design.js` supplies the reference-canvas toggle and the appearance description in Settings. Both are plain static files. The existing portable application bundle and its data adapter are unchanged.

Browser checks used a disposable project on the local preview origin: desktop Atlas, development fields, screenplay typing and automatic paragraph formatting, save/reload restoration, visual-reference editing, canvas preference, beat edits, export dialog and appearance settings. Phone layouts were inspected at 320px and 390px, including the navigation dialog and the writing, development, visual and beat views. No preview sample data is shipped.

Static checks cover JavaScript syntax, CSS delimiter balance, linked asset existence, manifest JSON and whitespace errors. Full assistive-technology testing, every export format and every existing application feature were not re-tested.
