DUST & STEEL COLLECTION — DEVIN-SWE2MAX EDITION

Six self-contained browser games remade by Devin CLI (SWE-2 Max), zero
dependencies: classic scripts + Canvas 2D + synthesized WebAudio.

Games: The World's Toughest Game, Impossible Run, Fowl Assault +
Cluck Horizon (two shmup packs), Burger Baron, Box Riot: 2Play Rooms,
Dust & Steel: Arena of Champions.

Run: serve this folder (or any parent) with a static server and open
index.html — e.g.

  python3 -m http.server 4173 --bind 127.0.0.1

then http://127.0.0.1:4173/ — or open index.html directly via file://;
every page is file://-safe. Progress is stored in localStorage per game.
Keyboard, mouse and touch are all supported.

Every game is backed by a deterministic engine validator plus a
real-input (CDP) browser proof in the development repository —
13/13 suites green at ship time (6 validators + 6 browser proofs +
portal proof).

Original commercial assets and exact historical parity are not claimed;
titles and brands are original evocations.
