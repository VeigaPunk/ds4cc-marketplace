ARMOR ARCADE — CODEX EDITION 1.0

Eight self-contained browser games. No account, API key or CDN is needed.

Start a local static HTTP server from this folder, for example:

  python3 -m http.server 4173 --bind 127.0.0.1

Then open http://127.0.0.1:4173 in Chromium or Firefox.
Do not launch index.html directly through file://; the six bundled module apps
need HTTP. Hardest and Clashbound also retain standalone source versions in
the development repository.

Progress is stored in the browser. Use the same hostname and port each time.
The eight game folders can also be hosted beneath an HTTP subdirectory.

Original commercial assets and exact frame-for-frame historical parity
are not claimed.

The source repository contains build scripts, tests, design references and
verification/RELEASE.md. Chromium and Firefox were verified on Linux; touch
was emulated. Physical Android/iOS devices and Safari remain unverified.
