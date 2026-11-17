# BestByTest.io site — agent guide

A one-page static site: `index.html` plus CSS in `css/`. No build step. The
only JavaScript is the theme switch (`js/theme.js`, plus a one-line inline
script in `<head>` that applies a stored choice before first paint); the page
must work fully without it. The CSS follows CUBE CSS (Composition, Utility, Block,
Exception) with Every Layout compositions.

## Setup and checks

- Install the check tools once: `npm install` (in `site/`).
- Run every check: `npm run check` (or `sh tools/check.sh`). All must pass
  before you commit a change under `site/`.
- Pre-commit hook, once per clone, from the repository root:
  `ln -s ../../site/tools/pre-commit .git/hooks/pre-commit`
- Preview: open `index.html` in a browser; check widths 1280px and 360px.

What the checks enforce:

| Check | Catches |
|---|---|
| `stylelint` (`.stylelintrc.json`) | hex or named colours and `px` outside `tokens.css`; physical properties (`margin-left`, `width`, `top`…); BEM-style class names; IDs in selectors; `!important`; in blocks: layout (`display: flex/grid`, `position`, `flex-wrap`, grid templates) and any non-zero margin |
| `tools/cube-check.mjs` | layer order; a stylesheet not imported, or imported without a layer; a block without a header; a block reading a property that is not its own; header docs out of step with the properties a block reads; a class in the HTML that no stylesheet defines |
| `tools/contrast.mjs` | a colour role pair below WCAG contrast, in light or dark |
| `html-validate`, `tools/axe.mjs` | invalid HTML; accessibility violations |

A machine cannot judge whether something should be a composition or a
block. The rules below cover that; follow them even where no check fails.

## CUBE rules

- **Layers** are fixed in `css/main.css`: `reset, globals, compositions,
  utilities, blocks, exceptions`. Import each new file there, in its layer.
- **Tokens.** Every value comes from `css/tokens.css`: palette
  (`--palette-*`) → roles (`--color-*`, `light-dark()` for both schemes) →
  component properties (`--button-bg`). Add a new colour as a palette value
  plus a role, and add its pairs to `tools/contrast.mjs`. Never branch on
  the scheme in a block: `light-dark()` in the role does it, and
  `[data-theme]` on `<html>` (set by the theme switch) pins `color-scheme`.
- **Globals do most of the work.** Element rules target `:not([class])`.
  Links stay unclassed so they keep the global link style; to add structure
  inside a link, put a classed `<span>` inside it (see `with-icon`).
- **Compositions own layout** (`css/compositions.css`: flow, wrapper,
  center, cluster, switcher, region, bar, with-icon). Need a new layout? Add a
  composition there, configured by custom properties, not a block.
- **Blocks are small and own no layout or outside spacing.** A block
  configures the compositions it sits on by setting their custom properties
  on itself (children inherit them); it does not reach into a composition
  with a descendant selector.
- **A block's API** is the custom properties it reads with a fallback:
  `var(--button-bg, var(--color-check-green))`. Name them `--<block>-*`.
- **Block header.** Each `css/blocks/*.css` opens with a comment: purpose;
  `Custom properties` with one line per property (`--name  default …
  purpose`); `Exceptions:` (or `Exceptions: none.`).
- **Exceptions** are data attributes (`data-state`, `data-variant`,
  `data-ink`, `data-theme`) or ARIA state (`aria-checked`) that only
  reassign custom properties. No BEM modifiers.
  Hover and active use `filter` on filled blocks, so they work on any
  colour; a block whose state changes colour (the theme switch) reassigns its own properties.
- **Utilities** sit in `css/utilities.css` inside `:where()`.
- **Logical properties and fluid sizes**: `margin-block-start`,
  `inline-size`, `max-inline-size`; `clamp()` tokens for type and space;
  `ch` for measure; `px` only for hairlines (with a reasoned
  `stylelint-disable` comment).

## Content rules

- The words on the page are Dean's. Do not write or change copy unless he
  asks. A `✍️` comment or `data-slot` marks text he still has to write.
- Voice: a system-design doctor with good bedside manner. Calm, diagnostic;
  never blame the client's team.
- The `<head>` repeats the title, description and headline in the Open
  Graph tags and the JSON-LD block. Change all of them together.
  `og-image.png` and `apple-touch-icon.png` are generated: after changing
  the headline, rerun `python -I ../brand/kit/share-image.py` (from `site/`).
  Update `sitemap.xml`'s `lastmod` when the page changes.
- Inline SVG icons: `aria-hidden="true" focusable="false"`; the link text
  carries the meaning.

## Commits

- Stage only the files you changed. Do not stage the repository's
  `.gitignore`, `.cursorignore`, `fonts/` or `logo/`.
- Never add a co-author line to a commit message.
