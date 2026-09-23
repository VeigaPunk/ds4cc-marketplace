# MAGGA collection landing page

A responsive, static collection page for `https://ds4cc.com/magga/`. Its visual identity is the operator's Plazir-15 Fan Codex signature — domed-utopia dark palette, leaf/teal accents, JetBrains Mono NL Nerd Font Mono throughout (self-hosted woff2 under `assets/fonts/`). The editions: **Codex** (`./codex/`, eight games), **Zai 5.3max-zcode-vanilla** (`./zai-5.3max-zcode-vanilla/`, seven games), **astra-codex-vanilla-v2** (`./astra-codex-vanilla-v2/`, six games), **zai-glm5.3-max-omp** (`./zai-glm5.3-max-omp/`, seven games) and **grok47-high-on-cursor-cloud** (`./grok47-high-on-cursor-cloud/`, seven games) and **devin-swe2max** (`./devin-swe2max/`, seven games). There are no placeholder editions or performance claims.

Deploy this directory's `index.html` and `style.css` directly at `/magga/`, with each edition's arcade build beneath its own folder (`/magga/codex/`, `/magga/zai-5.3max-zcode-vanilla/`). The page uses the edition's existing `favicon.svg` and three gameplay images through relative `./codex/` paths. It needs no JavaScript, framework, font service or build step.

The project link points to the dedicated [Codex repository](https://github.com/VeigaPunk/MAKEARMORGAMESGREATAGAIN-codex). Its shared baseline is `322a5e4`; this provenance stays in documentation rather than gameplay navigation.

Expected sibling paths:

- `codex/index.html`
- `codex/favicon.svg`
- `codex/covers/boxhead.png`
- `codex/covers/chicken-invaders.png`
- `codex/covers/clashbound.png`

The card and navigation work without JavaScript. Keyboard users have a skip link and visible focus indicators, decorative previews are hidden from assistive technology, and reduced-motion preferences disable hover transitions.


Verified in Chromium at widths 1440, 1024, 768, 390 and 320 pixels: no horizontal overflow, all preview images load, one edition card lists exactly eight games, the keyboard skip link receives focus, and the card resolves to `/magga/codex/`. A local request-routing harness served the existing arcade at that nested path and confirmed its eight game links render after navigation. Desktop and phone screenshots were visually reviewed. No deployment was performed by this task.

All five edition arcades (`codex/`, `zai-5.3max-zcode-vanilla/`, `astra-codex-vanilla-v2/`, `zai-glm5.3-max-omp/`, `grok47-high-on-cursor-cloud/`) render in this same signature styling — shared JetBrains Mono NL set via `assets/fonts/`, ebony-teal palette, matching card and header chrome.

## astra-codex-vanilla-v2 [oneshotprompt(magga)]

The third edition lives at `/magga/astra-codex-vanilla-v2/`. It contains six
original-branded games, including Orbital Flock and Cluck Horizon in one shared
shooter engine. The 131 runtime files are copied byte-for-byte from the verified
release; `astra-codex-vanilla-v2/release.json` records their SHA-256 inventory.
The three catalog previews under `assets/astra-codex-vanilla-v2/` are screenshots
of this edition's own build. No checkpoint repository is modified or pushed.
No operator tooling, dependencies, old renditions or private verification traces
are included in this edition's public payload.
The `[oneshotprompt(magga)]` label links directly to the raw source prompt at
`https://raw.githubusercontent.com/VeigaPunk/1shot/main/magga/one-shot-prompt.md`.

## zai-glm5.3-max-omp [oneshotprompt(magga)]

The fourth edition lives at `/magga/zai-glm5.3-max-omp/`. It contains the six
roster remakes plus Cluck Horizon (seven games) from a single one-shot run of
glm-5.3 (max thinking) on the omp (Oh My Pi) CLI — source repository
[MAKEARMORGAMESGREATAGAIN-zai](https://github.com/VeigaPunk/MAKEARMORGAMESGREATAGAIN-zai),
final commit `d629e2e`, shared baseline `322a5e4`. Unlike earlier editions,
every game page is fully self-contained and the whole arcade opens directly
via `file://` (verified in-run, zero console errors on all seven pages).
`zai-glm5.3-max-omp/release.json` records the edition inventory.

The catalog previews under `zai-glm5.3-max-omp/covers/` are actual game
footage — screenshots captured from the shipped pages during live
verification (wave-1 arena combat, chapter-one formations, maze play). The
edition's presentation follows the furoshiki tradition: the games are the
contents, the arcade page is the wrapping cloth, one musubi knot per
package; the knot mark is the edition favicon.
The `[oneshotprompt(magga)]` label links directly to the raw source prompt at
`https://raw.githubusercontent.com/VeigaPunk/1shot/main/magga/one-shot-prompt.md`.

## grok47-high-on-cursor-cloud [oneshotprompt(magga)]

The fifth edition lives at `/magga/grok47-high-on-cursor-cloud/`. It contains the
six roster remakes plus Cluck Horizon (seven games) from a single run of
grok-4.7 on a Cursor cloud agent, identified as grok47-high-on-cursor-cloud.
Every game page is self-contained and the arcade opens from this folder,
including via `file://`. `grok47-high-on-cursor-cloud/release.json` records the
edition inventory and SHA-256 of each game page. The working-copy commit that
produced the pages is `577f7df`. The checkpoint repository was not pushed.

The catalog previews under `grok47-high-on-cursor-cloud/covers/` are footage
captured from this edition's shipped pages. The amber horizon mark is this
edition's favicon.
The `[oneshotprompt(magga)]` label links directly to the raw source prompt at
`https://raw.githubusercontent.com/VeigaPunk/1shot/main/magga/one-shot-prompt.md`.
