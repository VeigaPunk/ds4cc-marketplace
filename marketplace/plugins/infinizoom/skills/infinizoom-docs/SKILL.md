---
name: infinizoom-docs
description: Run Infinizoom QA checks and start the visualization server.
---

Infinizoom is a fractal-zoom visualization with QA screenshot validation.

## Run QA zoom validation

```bash
node qa-zoom.mjs
```

## Start the visualization server

```bash
bun run server.ts
# or
node --loader ts-node/esm server.ts
```

## Open the UI locally

```bash
xdg-open http://localhost:3000  # Linux
open http://localhost:3000       # macOS
```

## Check render output

```bash
node qa-zoom.mjs --screenshot --output /tmp/zoom-check.png
```
