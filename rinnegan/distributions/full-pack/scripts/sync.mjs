#!/usr/bin/env node

import { chmod, mkdir, open, readFile, readdir, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_ROLES } from "../lib/install-engine.mjs";
import { buildRinneganCatalog, serializeRinneganCatalog } from "../lib/rinnegan-catalog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_DS4CC = path.resolve(ROOT, "..", "ds4cc-marketplace");
const FULL_PACK_DIRS = ["bin", "lib", "scripts", "rinnegan"];
const FULL_PACK_FILES = ["package.json", "reconciliation.json", ...PUBLIC_ROLES.map((role) => `${role}.md`)];
const sha256 = (content) => createHash("sha256").update(content).digest("hex");

function parse(args) {
  const options = { ds4cc: DEFAULT_DS4CC, check: false };
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--check") {
      options.check = true;
      continue;
    }
    if (flag !== "--ds4cc") throw new Error(`invalid option: ${flag}`);
    const value = args[++index];
    if (!value || !path.isAbsolute(value)) throw new Error("--ds4cc requires an absolute local path");
    options.ds4cc = path.resolve(value);
  }
  return options;
}

async function atomicWrite(destination, content, mode = 0o644) {
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = path.join(path.dirname(destination), `.${path.basename(destination)}.${process.pid}.tmp`);
  const handle = await open(temporary, "wx", mode);
  try {
    await handle.writeFile(content);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, destination);
  await chmod(destination, mode);
}

async function differs(destination, expected) {
  try {
    const actual = await readFile(destination);
    return !actual.equals(expected);
  } catch (error) {
    if (error?.code === "ENOENT") return true;
    throw error;
  }
}

async function fullPackSources() {
  const entries = FULL_PACK_FILES.map((relative) => ({ relative, source: path.join(ROOT, relative) }));
  for (const directory of FULL_PACK_DIRS) {
    for (const name of (await readdir(path.join(ROOT, directory))).sort()) {
      entries.push({ relative: `${directory}/${name}`, source: path.join(ROOT, directory, name) });
    }
  }
  return entries.sort((left, right) => left.relative.localeCompare(right.relative));
}

async function main() {
  const options = parse(process.argv.slice(2));
  const outputs = [];
  const packagedDir = path.join(options.ds4cc, "marketplace", "plugins", "myagents", "agents");
  const distributionRoot = path.join(options.ds4cc, "rinnegan", "distributions");
  const installerConfig = JSON.parse(await readFile(path.join(ROOT, "rinnegan", "installers.json"), "utf8"));
  const b00mr = installerConfig.records?.find((record) => record.name === "b00mr-install");
  if (!b00mr?.command) throw new Error("b00mr public installer one-liner is unavailable");

  for (const role of PUBLIC_ROLES) {
    const content = await readFile(path.join(ROOT, `${role}.md`));
    outputs.push({ destination: path.join(packagedDir, `${role}.agent.md`), content });
    outputs.push({ destination: path.join(distributionRoot, "agents", `${role}.agent.md`), content });
  }

  for (const relative of ["bin/myagents.mjs", "rinnegan/the-leanbuilder.md", "rinnegan/admission.json"]) {
    outputs.push({
      destination: path.join(options.ds4cc, "marketplace", "plugins", "myagents", relative),
      content: await readFile(path.join(ROOT, relative)),
      mode: relative.startsWith("bin/") ? 0o755 : 0o600,
    });
  }

  const fullEntries = [];
  for (const entry of await fullPackSources()) {
    const content = await readFile(entry.source);
    fullEntries.push({ path: entry.relative, sha256: sha256(content) });
    outputs.push({
      destination: path.join(distributionRoot, "full-pack", entry.relative),
      content,
      mode: entry.relative.startsWith("bin/") || entry.relative.startsWith("scripts/") ? 0o755 : 0o600,
    });
  }

  const standaloneAgents = [];
  for (const role of PUBLIC_ROLES) {
    const content = await readFile(path.join(ROOT, `${role}.md`));
    standaloneAgents.push({
      name: role,
      kind: "standalone-public-agent",
      source: `./agents/${role}.agent.md`,
      sha256: sha256(content),
      installCommand: b00mr.command,
    });
  }
  const distributionCatalog = {
    schema: "ds4cc.myagents-distributions.v1",
    authority: "https://github.com/VeigaPunk/myagents",
    fullPack: {
      source: "./full-pack",
      installerCommands: installerConfig.records.map(({ name, kind, command }) => ({ name, kind, command })),
      leanbuilder: {
        discoverableAsAgent: false,
        launcher: "bin/myagents.mjs",
        admission: "rinnegan/admission.json",
      },
      files: fullEntries,
    },
    standaloneAgents,
  };
  outputs.push({
    destination: path.join(distributionRoot, "catalog.json"),
    content: Buffer.from(`${JSON.stringify(distributionCatalog, null, 2)}\n`),
  });
  outputs.push({
    destination: path.join(options.ds4cc, "rinnegan", "catalog.js"),
    content: Buffer.from(serializeRinneganCatalog(await buildRinneganCatalog(ROOT))),
  });

  const stale = [];
  for (const output of outputs) {
    if (await differs(output.destination, output.content)) stale.push(output);
  }
  if (options.check) {
    if (stale.length) throw new Error(`stale generated outputs:\n${stale.map((item) => item.destination).join("\n")}`);
    process.stdout.write(`all ${outputs.length} generated outputs are synchronized\n`);
    return;
  }
  for (const output of stale) await atomicWrite(output.destination, output.content, output.mode);
  for (const output of outputs) await chmod(output.destination, output.mode ?? 0o644);
  process.stdout.write(`synchronized ${stale.length} stale outputs from standalone authority\n`);
}

main().catch((error) => {
  process.stderr.write(`sync: ${error.message}\n`);
  process.exitCode = 1;
});
