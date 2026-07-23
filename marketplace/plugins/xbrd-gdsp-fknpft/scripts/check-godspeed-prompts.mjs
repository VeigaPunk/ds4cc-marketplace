#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "commands/references/xbreed-shared.md",
  "commands/xbreed.md",
  "commands/xbt.md",
  "commands/xgs.md",
  "commands/xbgst.md",
  "commands/xbgst-grok.md",
  "templates/skills/xbreed/SKILL.md",
  "templates/skills/xbreed-team/SKILL.md",
  "templates/skills/xbt/SKILL.md",
  "templates/skills/xgs/SKILL.md",
  "templates/skills/xbgst/SKILL.md",
];

for (const relative of files) {
  const content = await readFile(path.join(root, relative), "utf8");
  if (/\|godspeed\b/.test(content)) throw new Error(`${relative}: malformed |godspeed suffix`);
  if (/If .*contains ["`]godspeed["`], append/i.test(content)) {
    throw new Error(`${relative}: conditional Godspeed inheritance`);
  }
  for (const match of content.matchAll(/prompt="([^"]*)"/g)) {
    const prompt = match[1];
    if (!/ \| godspeed(?:-impl)?$/.test(prompt)) {
      throw new Error(`${relative}: Agent prompt lacks an exact Godspeed suffix: ${prompt}`);
    }
  }
}

console.log(`Validated Godspeed suffixes in ${files.length} active prompt-example files`);
