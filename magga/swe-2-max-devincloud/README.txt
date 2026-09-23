ARMOR ARCADE — SWE-2-MAX-DEVINCLOUD EDITION 1.0.1

Seven self-contained browser games on one hub. This edition is a
continuity/re-verification run: SWE-2 MAX on Devin Cloud picked up the
makearmor-games-great-again checkpoint, re-ran every recorded gate, and
shipped only the repairs the records called for — no redesign.
No account, API key, CDN, or build step is needed to play — every game
page is the finished artifact, and the whole arcade also opens directly
via file:// (verified in-run).

Open index.html — or serve the folder from any static server — and play.
Progress is stored in the browser (localStorage); use the same origin
each time to keep saves.

Contents: boxhead (endless arena survival, solo/co-op/deathmatch),
impossible (five rhythm tracks + practice), burger-tycoon (four-pane
satire economy), chicken-invaders (ten-chapter solar arc), cluck-horizon
(original-IP shooter on the same engine), swords-and-sandals (gladiator
RPG ladder), hardest (114 autopilot-proven mazes).

Re-verification results this run: node test suites 32/32, hardest
validator 114/114, ship rebuild clean, burger economy sims unchanged,
static audit PASS, a new zero-dependency CDP browser gate PASS on the
portal and all 7 games. Repairs carried by this edition: a malformed
shmup save no longer unlocks every chapter, two drifted test suites were
modernized, and impossible's page — which had silently regressed to
rendering a dead stretched canvas with the real stage below the fold —
was fixed and visually re-verified.

Covers are actual game footage captured from the shipped pages. The
presentation follows the furoshiki tradition: the games are the
contents, the page is the wrapping cloth, one knot per package.

This is a private remake collection. The repository's per-title
rights-clearance requirement applies before public redistribution.
Original commercial assets and exact frame-for-frame historical parity
are not claimed.

Source, ship records and verification evidence:
https://github.com/VeigaPunk/MAKEARMORGAMESGREATAGAIN-devincloud
Checkpoint (untouched): https://github.com/VeigaPunk/MAKEARMORGAMESGREATAGAIN
One-shot prompt: https://raw.githubusercontent.com/VeigaPunk/1shot/main/magga/one-shot-prompt.md
