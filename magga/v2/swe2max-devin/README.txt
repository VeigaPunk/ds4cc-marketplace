ARMOR ARCADE — CODEX EDITION 1.0

Seven self-contained browser games. No account, API key or CDN is needed.

Start a local static HTTP server from this folder, for example:

  python3 -m http.server 4173 --bind 127.0.0.1

Then open http://127.0.0.1:4173 in Chromium or Firefox.
Do not launch index.html directly through file://; the six bundled module apps
need HTTP. Hardest also retains its standalone source version in the
development repository.

Progress is stored in the browser. Use the same hostname and port each time.
The seven game folders can also be hosted beneath an HTTP subdirectory.

LAN play (Block Siege only): run the bundled zero-dependency relay —

  node lan-relay.mjs

from this folder (Node 22+, no install). It serves the whole collection and
pairs one host with one guest over the LAN. Host opens the printed URL and
picks LAN → HOST; the second player opens the printed URL with ?join=auto.
Solo and local co-op/deathmatch need no server beyond the static files.

Original commercial assets and exact frame-for-frame historical parity
are not claimed.

The source repository contains build scripts, tests, design references and
verification/RELEASE.md. Chromium and Firefox were verified on Linux; touch
was emulated. Physical Android/iOS devices and Safari remain unverified.
