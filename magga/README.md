# MAGGA collection landing page

A responsive, static collection page for `https://ds4cc.com/magga/`. Its visual identity is the operator's Plazir-15 Fan Codex signature — domed-utopia dark palette, leaf/teal accents, JetBrains Mono NL Nerd Font Mono throughout (self-hosted woff2 under `assets/fonts/`). The editions: **K3-max(K2.8s-max) | kimi-code** (`./kimi-k3max/`, seven games), **Codex** (`./codex/`, eight games), **Zai 5.3max-zcode-vanilla** (`./zai-5.3max-zcode-vanilla/`, seven games), **astra-codex-vanilla-v2** (`./astra-codex-vanilla-v2/`, six games), **zai-glm5.3-max-omp** (`./zai-glm5.3-max-omp/`, seven games), **grok47-high-on-cursor-cloud** (`./grok47-high-on-cursor-cloud/`, seven games) and **devin-swe2max** (`./devin-swe2max/`, seven games). There are no placeholder editions or performance claims.

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

All seven edition portals (`kimi-k3max/`, `codex/`, `zai-5.3max-zcode-vanilla/`, `astra-codex-vanilla-v2/`, `zai-glm5.3-max-omp/`, `grok47-high-on-cursor-cloud/`, `devin-swe2max/`) render in this same signature styling — shared JetBrains Mono NL set via `assets/fonts/`, ebony-teal palette, matching card and header chrome. So does the v2 teaser catalog at `./v2/`. Inside the portals, each game keeps its own authored art direction; the unification covers every front-end page (catalog, portals, teaser pages), not the games' canvases.

## Adding a new entry — standing rule

Every new edition is published the same way and keeps the same design principle:

1. Stage the payload under `magga/<edition-slug>/`: the verified game build (nothing operator-side — no tooling, logs or private traces), an `index.html` portal in the Plazir-15 signature (self-hosted fonts from `../assets/fonts/`, domed-utopia palette, unified header/footer chrome), an original `favicon.svg`, three real gameplay screenshots as `covers/{boxhead,chicken-invaders,hardest}.png` captured from the shipped payload with real input, a player-facing `README.txt`, and a `release.json` SHA-256 inventory.
2. Add exactly one card to the catalog — an `<article class="edition-card">` with the shared preview/heading/features/game-list markup and the standard button row (`.card-actions` → primary `.btn.btn-primary` PLAY + ghost `.btn.btn-ghost` PROMPT or SOURCE). Newest edition takes the first slot and the next edition number; earlier entries keep their numbers.
3. Keep every front-end page under `/magga/` on the catalog's design system: same fonts, palette tokens, card chrome, button component and breakpoints. Games themselves keep their authored identity; pages never fork the signature.
4. DLCs launch and are catalogued under the same pages (see "THE DLC SHELF" on the catalog), each as its own card where the editions live.
5. Ship nothing player-facing that carries internal markers; verify the staged payload (serve + click-through, zero console errors, zero external requests) before pushing to the Pages branch. The working-copy game repositories are never pushed by the publish step.

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

## devin-swe2max [oneshotprompt(magga)]

The sixth edition lives at `/magga/devin-swe2max/`. It contains the six roster
remakes plus Cluck Horizon (seven games) from a Devin CLI run on SWE-2 Max —
zero-dependency canvas builds that open straight from `file://`, each carrying
a deterministic validator plus a real-input browser proof.
`devin-swe2max/release.json` records the edition inventory. Its portal was
later unified into the Plazir-15 signature (it originally shipped a bespoke
canvas marquee); game payloads are unchanged.
The `[oneshotprompt(magga)]` label links directly to the raw source prompt at
`https://raw.githubusercontent.com/VeigaPunk/1shot/main/magga/one-shot-prompt.md`.

## kimi-k3max [oneshotprompt(magga)]

The seventh edition lives at `/magga/kimi-k3max/` and opens the catalog. It
contains the six roster remakes plus Cluck Horizon (seven games) from a single
run of K3-max (K2.8s-max) on the Kimi Code CLI, presented as the FLASHBACK
ARCADE hub: Crateheads, Impossible Run, Burger Tycoon, Chicken Storm, Cluck
Horizon, Arena of Bonks and The Cruel Maze (114 mazes). The six `games/`
builds are ES-module builds served over http; `hardest/` also opens directly
via `file://`. `kimi-k3max/release.json` records the edition inventory and
SHA-256 of every payload file.

Before staging, the run stripped its internal no-public-ship markers (badge
banners and title-screen strings) from the payload; the operator's publish of
this edition is the clearance those markers awaited. The source working copy
was committed locally (`6f43ead`) and deliberately not pushed upstream.
The catalog previews under `kimi-k3max/covers/` are actual game footage
captured from the staged payload with real input. The edition favicon is an
original mark.
The `[oneshotprompt(magga)]` label links directly to the raw source prompt at
`https://raw.githubusercontent.com/VeigaPunk/1shot/main/magga/one-shot-prompt.md`.

## v2 teaser catalog

`/magga/v2/` holds a hint-only landing page for MAGGA v2: a locked seven-game
checkpoint, one prompt, one command, three run variants (vanilla, godspeed,
ufo). It announces that first runs are coming and that DLCs — starting with
"EVERYTHING IS PC x Make Love Not Warcraft" (SOON(TM)) — will be launched and
catalogued under the same pages. It exposes no launcher, repository or
operational detail, and follows the same Plazir-15 signature as the catalog.


## MAGGA v2 — Second Wind Arcade

The first accepted v2 edition lives at `/magga/v2/codex-work-vanilla-adapted/`
and is listed on both MAGGA catalogs. Its seven games are Crown & Sand,
Deadlock Rooms, Starfall Flock, Cluck Horizon, Vector Vault, Pulsebound and
Burger Tycoon. The locked payload is preserved in the submissions repository;
only the allowed root launcher overlay adopts the catalog signature.

The shipped `release.json` is part of the immutable game distribution and is
preserved. The separate `catalog-release.json` records publication hashes,
the original lock digest, the permitted launcher overlay and the catalog
previews. Verification evidence and browser/tooling dependencies remain out
of the website payload. The prompt label points to the pinned v2 prompt.
