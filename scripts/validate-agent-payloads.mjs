#!/usr/bin/env node

import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_AGENTS = [
  "the-architect",
  "the-bootstrapper",
  "the-connector",
  "the-critic",
  "the-distiller",
  "the-executor",
  "the-judge",
  "the-labrat",
  "the-mutation-tester",
  "the-planner",
  "the-revenger",
  "the-reviewer",
  "the-scout",
  "the-sentinel",
  "the-scribe",
  "the-simplifier",
];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const GODSPEED_INVARIANTS = ["**Canonical Godspeed.**", "**Godspeed is inherited.**"];
const DELEGATION_INVARIANT = "**Delegation is transitive.**";
const PROHIBITED_PROFILE_TEXT = [
  "gpt55",
  "gpt-5.6-sol",
  "xask --spark codex",
  "xask --effort medium codex",
  "xask --effort high codex",
  "xask --effort xhigh codex",
  "xask gemini",
  "judge-injected; inline as fallback",
];

async function readJson(relativePath) {
  try {
    return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
  } catch (error) {
    errors.push(`${relativePath}: ${error.message}`);
    return null;
  }
}

function check(condition, message) {
  if (!condition) errors.push(message);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

check(
  !(await exists(path.join(root, ".github", "plugin", "marketplace.json"))),
  "removed marketplace catalog must not exist",
);

const agentsDir = path.join(root, "marketplace", "plugins", "myagents", "agents");
const files = (await readdir(agentsDir)).filter((name) => name.endsWith(".agent.md")).sort();
const actualAgents = files.map((name) => name.slice(0, -".agent.md".length));
check(files.length === 16, `expected 16 the-* agent payloads, found ${files.length}`);
check(
  actualAgents.length === EXPECTED_AGENTS.length && EXPECTED_AGENTS.every((name) => actualAgents.includes(name)),
  `stale or unexpected agent names: expected ${EXPECTED_AGENTS.join(", ")}; found ${actualAgents.join(", ")}`,
);

for (const filename of files) {
  const source = await readFile(path.join(agentsDir, filename), "utf8");
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatter) {
    errors.push(`${filename}: missing YAML frontmatter`);
    continue;
  }
  const nameLines = frontmatter[1].match(/^name:[ \t]*(.+)$/gm) || [];
  const descriptionLines = frontmatter[1].match(/^description:[ \t]*(.+)$/gm) || [];
  const expectedName = filename.slice(0, -".agent.md".length);
  check(nameLines.length === 1, `${filename}: expected exactly one name field`);
  check(descriptionLines.length === 1, `${filename}: expected exactly one non-empty description field`);
  if (nameLines.length === 1) {
    check(nameLines[0].replace(/^name:[ \t]*/, "") === expectedName, `${filename}: filename/frontmatter identity mismatch`);
  }
  if (descriptionLines.length === 1) {
    const description = descriptionLines[0].replace(/^description:[ \t]*/, "").trim();
    check(description.length >= 20 && description !== "|" && description !== ">", `${filename}: description is too short or unsupported`);
  }
  check(GODSPEED_INVARIANTS.some((invariant) => source.includes(invariant)), `${filename}: missing Godspeed inheritance invariant`);
  check(source.includes(DELEGATION_INVARIANT), `${filename}: missing transitive delegation invariant`);
  for (const prohibited of PROHIBITED_PROFILE_TEXT) {
    check(!source.includes(prohibited), `${filename}: prohibited stale delegation text: ${prohibited}`);
  }
  for (const invocation of source.match(/xask\s+[^`\n]*(?:codex|gemini)[^`\n]*/g) || []) {
    check(invocation.includes("--gs"), `${filename}: xask invocation omits --gs: ${invocation}`);
  }
}

const canonicalDir = path.resolve(root, "..", "myagents");
const canonicalExists = await exists(canonicalDir);
check(canonicalExists, "mandatory standalone canonical authority ../myagents is missing");
if (canonicalExists) {
  const canonicalFiles = (await readdir(canonicalDir)).filter((name) => /^the-[a-z0-9-]+\.md$/.test(name)).sort();
  const expectedCanonical = EXPECTED_AGENTS.map((name) => `${name}.md`).sort();
  check(
    canonicalFiles.length === expectedCanonical.length && expectedCanonical.every((name) => canonicalFiles.includes(name)),
    `standalone canonical role set is stale or unexpected: expected ${expectedCanonical.join(", ")}; found ${canonicalFiles.join(", ")}`,
  );
  check(!canonicalFiles.includes("the-leanbuilder.md"), "leanbuilder must remain outside the top-level public role authority");
  check(!files.includes("the-leanbuilder.agent.md"), "leanbuilder must remain outside the standard plugin agent payload");
  for (const filename of files) {
    const canonicalName = filename.replace(/\.agent\.md$/, ".md");
    const [packaged, canonical] = await Promise.all([
      readFile(path.join(agentsDir, filename)),
      readFile(path.join(canonicalDir, canonicalName)),
    ]);
    check(packaged.equals(canonical), `${filename}: packaged payload differs from mandatory canonical ${canonicalName}`);
  }
}

for (const skill of ["godspeed", "wwkd"]) {
  const skillPath = path.join(root, "marketplace", "plugins", "myagents", "skills", skill, "SKILL.md");
  check(await exists(skillPath), `myagents: missing packaged ${skill} skill`);
}

const marketplacePlugin = await readJson("marketplace/plugins/myagents/plugin.json");
const codexPlugin = await readJson("marketplace/plugins/myagents/.codex-plugin/plugin.json");

if (marketplacePlugin && codexPlugin) {
  const versions = [
    marketplacePlugin.version,
    codexPlugin.version,
  ];
  check(versions.every((version) => version === versions[0]), `Codex myagents versions are not synchronized: ${versions.join(", ")}`);

  const descriptions = [
    marketplacePlugin.description,
    codexPlugin.description,
  ];
  check(
    descriptions.every((description) => typeof description === "string" && description.trim().length > 0),
    "Codex myagents descriptions must be non-empty",
  );
  check(
    descriptions.every((description) => description === descriptions[0]),
    `Codex descriptions are not synchronized: ${descriptions.join(" | ")}`,
  );
}

if (errors.length > 0) {
  for (const error of errors) console.error(`Error: ${error}`);
  process.exitCode = 1;
} else {
  console.log("Validated 16 the-* Godspeed agent payloads, packaged skills, and synchronized Codex metadata.");
}
