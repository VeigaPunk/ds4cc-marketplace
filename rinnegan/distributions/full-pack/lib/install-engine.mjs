import { constants } from "node:fs";
import {
  access,
  chmod,
  cp,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PUBLIC_ROLES = [
  "the-architect", "the-bootstrapper", "the-connector", "the-critic",
  "the-distiller", "the-executor", "the-judge", "the-labrat",
  "the-mutation-tester", "the-planner", "the-revenger", "the-reviewer",
  "the-scout", "the-sentinel", "the-scribe", "the-simplifier",
];
export const ADGUARD_VPN_REFERRAL = null;

const FULL_PACK_ENTRIES = [
  "package.json", "reconciliation.json", "bin", "lib", "scripts", "rinnegan",
  ...PUBLIC_ROLES.map((name) => `${name}.md`),
];

function error(message) {
  throw new Error(message);
}

export function parseInstallerOptions(args, { allowAgents = false } = {}) {
  const booleanFlags = new Set(["--dry-run"]);
  const valueFlags = new Set(["--source", "--data-dir", "--agents-dir", "--bin-dir"]);
  if (allowAgents) valueFlags.add("--agents");
  const options = { dryRun: false };
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (booleanFlags.has(flag)) {
      if (options.dryRun) error(`duplicate option: ${flag}`);
      options.dryRun = true;
      continue;
    }
    if (!valueFlags.has(flag)) error(`invalid option: ${flag}`);
    const value = args[++index];
    if (value === undefined || value.startsWith("--")) error(`missing value for ${flag}`);
    const key = flag.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (Object.hasOwn(options, key)) error(`duplicate option: ${flag}`);
    options[key] = value;
  }
  return options;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function nearestExisting(candidate) {
  let current = candidate;
  for (;;) {
    try {
      await lstat(current);
      return current;
    } catch (caught) {
      if (caught?.code !== "ENOENT") throw caught;
      const parent = path.dirname(current);
      if (parent === current) throw caught;
      current = parent;
    }
  }
}

async function safeDestination(candidate, label) {
  if (!path.isAbsolute(candidate)) error(`${label} must be absolute`);
  const resolved = path.resolve(candidate);
  const ancestor = await nearestExisting(resolved);
  const [canonical, metadata] = await Promise.all([realpath(ancestor), lstat(ancestor)]);
  if (canonical !== ancestor || metadata.isSymbolicLink() || !metadata.isDirectory()) {
    error(`${label} must have a canonical non-symlink ancestor`);
  }
  if (typeof process.getuid === "function" && metadata.uid !== process.getuid()) {
    error(`${label} ancestor must be owned by the current user`);
  }
  return resolved;
}

async function validateSource(candidate) {
  if (!path.isAbsolute(candidate)) error("source must be an absolute local path");
  const source = path.resolve(candidate);
  const [canonical, metadata] = await Promise.all([realpath(source), lstat(source)]);
  if (canonical !== source || metadata.isSymbolicLink() || !metadata.isDirectory()) {
    error("source must be a canonical non-symlink directory");
  }
  if (typeof process.getuid === "function" && metadata.uid !== process.getuid()) {
    error("source must be owned by the current user");
  }
  const files = (await readdir(source)).filter((name) => /^the-[a-z0-9-]+\.md$/.test(name)).sort();
  const expected = PUBLIC_ROLES.map((name) => `${name}.md`).sort();
  if (files.join("\n") !== expected.join("\n")) error("source does not contain the exact public role set");
  const admission = JSON.parse(await readFile(path.join(source, "rinnegan", "admission.json"), "utf8"));
  const record = admission.records?.find((entry) => entry.name === "the-leanbuilder");
  const card = await readFile(path.join(source, "rinnegan", "the-leanbuilder.md"));
  if (
    admission.schema !== "myagents.rinnegan-admission.v1" ||
    admission.records?.length !== 1 ||
    record?.admitted !== true ||
    record?.launcherKind !== "one-shot" ||
    record?.sha256 !== sha256(card)
  ) {
    error("source leanbuilder admission is not digest-bound");
  }
  return source;
}

export async function resolveInstallConfig(options = {}) {
  const source = await validateSource(options.source || PROJECT_ROOT);
  const dataDir = await safeDestination(
    options.dataDir || path.join(process.env.XDG_DATA_HOME || path.join(homedir(), ".local", "share"), "myagents"),
    "data destination",
  );
  const agentsDir = await safeDestination(
    options.agentsDir || path.join(homedir(), ".omp", "agent", "agents"),
    "agents destination",
  );
  const binDir = await safeDestination(
    options.binDir || path.join(homedir(), ".local", "bin"),
    "bin destination",
  );
  if (dataDir !== source && (dataDir.startsWith(`${source}${path.sep}`) || source.startsWith(`${dataDir}${path.sep}`))) {
    error("data destination and source must not contain one another unless they are the same canonical path");
  }
  for (const [label, destination] of [["agents", agentsDir], ["bin", binDir]]) {
    if (
      destination === dataDir ||
      destination.startsWith(`${dataDir}${path.sep}`) ||
      dataDir.startsWith(`${destination}${path.sep}`)
    ) {
      error(`${label} destination and private data destination must not overlap`);
    }
  }
  return { source, dataDir, agentsDir, binDir };
}

function normalizeSelection(selection) {
  const names = Array.isArray(selection) ? selection : String(selection || "").split(",");
  const result = [...new Set(names.map((name) => name.trim()).filter(Boolean))].sort();
  if (!result.length || result.some((name) => !PUBLIC_ROLES.includes(name))) {
    error(`standalone agents must be selected from: ${PUBLIC_ROLES.join(", ")}`);
  }
  return result;
}

export async function createInstallPlan({ mode, selectedAgents, ...options }) {
  if (mode !== "full" && mode !== "agents") error("install mode must be full or agents");
  const config = await resolveInstallConfig(options);
  const roles = mode === "full" ? PUBLIC_ROLES : normalizeSelection(selectedAgents);
  const operations = [];
  if (mode === "full") {
    operations.push({ type: "replace-tree", source: config.source, destination: config.dataDir });
    for (const command of ["myagents", "b00mr-install", "z00mr-install"]) {
      operations.push({ type: "write-launcher", command, destination: path.join(config.binDir, command) });
    }
  }
  for (const role of roles) {
    operations.push({
      type: "write-role",
      source: path.join(config.source, `${role}.md`),
      destination: path.join(config.agentsDir, `${role}.md`),
    });
  }
  return { schema: "myagents.install-plan.v1", mode, roles, ...config, operations };
}

async function backupPath(destination) {
  for (let number = 1; ; number += 1) {
    const candidate = `${destination}.backup-${number}`;
    try {
      await access(candidate, constants.F_OK);
    } catch (caught) {
      if (caught?.code === "ENOENT") return candidate;
      throw caught;
    }
  }
}

async function moveCollision(destination, backups) {
  try {
    await lstat(destination);
  } catch (caught) {
    if (caught?.code === "ENOENT") return null;
    throw caught;
  }
  const backup = await backupPath(destination);
  await rename(destination, backup);
  backups.push({ destination, backup });
  return backup;
}

async function atomicFile(destination, content, mode, backups) {
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  const temporary = path.join(path.dirname(destination), `.${path.basename(destination)}.${process.pid}.tmp`);
  await rm(temporary, { force: true });
  const handle = await open(temporary, "wx", mode);
  try {
    await handle.writeFile(content);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await moveCollision(destination, backups);
  await rename(temporary, destination);
  await chmod(destination, mode);
}

async function installTree(plan, backups) {
  await mkdir(path.dirname(plan.dataDir), { recursive: true, mode: 0o700 });
  const stage = path.join(path.dirname(plan.dataDir), `.myagents-stage-${process.pid}`);
  await rm(stage, { recursive: true, force: true });
  await mkdir(stage, { mode: 0o700 });
  try {
    for (const entry of FULL_PACK_ENTRIES) {
      await cp(path.join(plan.source, entry), path.join(stage, entry), {
        recursive: true,
        errorOnExist: true,
        force: false,
        preserveTimestamps: false,
      });
    }
    await moveCollision(plan.dataDir, backups);
    await rename(stage, plan.dataDir);
  } catch (caught) {
    await rm(stage, { recursive: true, force: true });
    throw caught;
  }
}

function launcherSource(command, dataDir) {
  const moduleUrl = pathToFileURL(path.join(dataDir, "bin", `${command}.mjs`)).href;
  return `#!/usr/bin/env node\nimport ${JSON.stringify(moduleUrl)};\n`;
}

export function formatPlan(plan) {
  const lines = [
    `install mode: ${plan.mode}`,
    `source: ${plan.source}`,
    `public agents: ${plan.roles.join(", ")}`,
  ];
  if (plan.mode === "full") {
    lines.push(`private full-pack destination: ${plan.dataDir}`);
    lines.push(`local launchers: ${plan.binDir}`);
    lines.push("the-leanbuilder remains private to the full pack and is never copied to the host agent directory");
  }
  lines.push(`host public-agent destination: ${plan.agentsDir}`);
  lines.push("existing destination collisions are retained as deterministic .backup-N siblings");
  return lines.join("\n");
}

export async function applyInstallPlan(plan, { dryRun = false } = {}) {
  if (dryRun) return { dryRun: true, backups: [], operations: plan.operations.length };
  const backups = [];
  if (plan.mode === "full") await installTree(plan, backups);
  for (const operation of plan.operations) {
    if (operation.type === "write-role") {
      await atomicFile(operation.destination, await readFile(operation.source), 0o600, backups);
    } else if (operation.type === "write-launcher") {
      await atomicFile(operation.destination, launcherSource(operation.command, plan.dataDir), 0o700, backups);
    }
  }
  return { dryRun: false, backups, operations: plan.operations.length };
}
