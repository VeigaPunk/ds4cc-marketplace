# MAGGA collection landing page

A responsive, static collection page for `https://ds4cc.com/magga/`. It shares the arcade's charcoal, cream and gold visual identity. The sole available edition is **Codex**, linking to `./codex/` and listing its eight shipped games. There are no placeholder editions or performance claims.

Deploy this directory's `index.html` and `style.css` directly at `/magga/`, with the Codex arcade build beneath `/magga/codex/`. The page uses the edition's existing `favicon.svg` and three gameplay images through relative `./codex/` paths. It needs no JavaScript, framework, font service or build step.

The project link points to the dedicated [Codex repository](https://github.com/VeigaPunk/MAKEARMORGAMESGREATAGAIN-codex). Its shared baseline is `322a5e4`; this provenance stays in documentation rather than gameplay navigation.

Expected sibling paths:

- `codex/index.html`
- `codex/favicon.svg`
- `codex/covers/boxhead.png`
- `codex/covers/chicken-invaders.png`
- `codex/covers/clashbound.png`

The card and navigation work without JavaScript. Keyboard users have a skip link and visible focus indicators, decorative previews are hidden from assistive technology, and reduced-motion preferences disable hover transitions.


Verified in Chromium at widths 1440, 1024, 768, 390 and 320 pixels: no horizontal overflow, all preview images load, one edition card lists exactly eight games, the keyboard skip link receives focus, and the card resolves to `/magga/codex/`. A local request-routing harness served the existing arcade at that nested path and confirmed its eight game links render after navigation. Desktop and phone screenshots were visually reviewed. No deployment was performed by this task.
