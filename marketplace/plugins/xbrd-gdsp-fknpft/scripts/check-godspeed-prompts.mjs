#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonicalDirective = "templates/skills/godspeed/directive.md";
const canonicalSha = "db88963cbdf5a0db22b460b284bf6f1d1f4abac9eaadb28bdb5e9bffe27be3bb";
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

async function markdownFiles(relative) {
  const output = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) output.push(...await markdownFiles(child));
    else if (entry.isFile() && entry.name.endsWith(".md")) output.push(child);
  }
  return output;
}

const directive = await readFile(path.join(root, canonicalDirective));
const directiveSha = createHash("sha256").update(directive).digest("hex");
if (directiveSha !== canonicalSha) {
  throw new Error(`${canonicalDirective}: canonical directive hash drift: ${directiveSha}`);
}

const scopedMarkdown = [
  ...await markdownFiles("commands"),
  ...await markdownFiles("templates"),
];
for (const relative of scopedMarkdown) {
  const content = await readFile(path.join(root, relative), "utf8");
  if (/godspeed-impl/.test(content)) {
    throw new Error(`${relative}: obsolete Godspeed suffix variant`);
  }
  if (/\bxask (?:codex|gemma|gemini|g)\b/.test(content)) {
    throw new Error(`${relative}: xask delegation omits the --gs flag`);
  }
}

for (const relative of files) {
  const content = await readFile(path.join(root, relative), "utf8");
  if (/\|godspeed\b/.test(content)) throw new Error(`${relative}: malformed |godspeed suffix`);
  if (/If .*contains ["`]godspeed["`], append/i.test(content)) {
    throw new Error(`${relative}: conditional Godspeed inheritance`);
  }
  for (const match of content.matchAll(/prompt="([^"]*)"/g)) {
    const prompt = match[1];
    if (!prompt.startsWith("<verbatim directive.md>\\n\\n")) {
      throw new Error(`${relative}: Agent prompt does not prepend canonical directive.md: ${prompt}`);
    }
    if (!/ \| godspeed$/.test(prompt)) {
      throw new Error(`${relative}: Agent prompt lacks an exact Godspeed suffix: ${prompt}`);
    }
    if ((prompt.match(/ \| godspeed/g) ?? []).length !== 1) {
      throw new Error(`${relative}: Agent prompt has a duplicate Godspeed suffix: ${prompt}`);
    }
  }
}

const pointerOnly = [
  "templates/skills/godspeed/SKILL.md",
  "templates/rules/GODSPEED_ALWAYS.md",
  "templates/agents/critic.md",
  "templates/agents/mutation-tester.md",
  "templates/agents/sentinel.md",
  "templates/agents/the-revenger.md",
];
for (const relative of pointerOnly) {
  const content = await readFile(path.join(root, relative), "utf8");
  if (!/directive\.md/.test(content)) {
    throw new Error(`${relative}: missing canonical directive.md pointer`);
  }
  if (/You operate in godspeed by default|No clarifying questions\. No philosophical reasoning|\d\. \*?\*?Name the axes/i.test(content)) {
    throw new Error(`${relative}: reduced or handwritten Godspeed directive`);
  }
}

console.log(`Validated canonical Godspeed ownership and suffixes in ${scopedMarkdown.length} scoped Markdown files`);
