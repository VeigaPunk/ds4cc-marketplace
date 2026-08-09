#!/usr/bin/env node
/**
 * fnm/Node build — no bun.
 * Bundles src/index.ts → build/aaron.js with node shebang.
 */
import * as esbuild from "esbuild";
import { chmodSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outfile = join(root, "build", "aaron.js");

mkdirSync(join(root, "build"), { recursive: true });

await esbuild.build({
  entryPoints: [join(root, "src", "index.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile,
  banner: {
    js: "#!/usr/bin/env node",
  },
  packages: "bundle",
  logLevel: "info",
});

chmodSync(outfile, 0o755);
console.error(`built ${outfile}`);
