#!/usr/bin/env node

import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AGENT_FILE = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.agent\.md$/;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/;
const PORTABILITY = `## OpenCode portability

Use OpenCode's available subagent and messaging mechanisms. Claude-specific API names in the source profile are protocol concepts, not required APIs: if a named facility is unavailable, perform the described posture inline and return the result through the current host. The external \`xask\` command is required only for profiles that invoke cross-model delegation; install it separately and ensure it is on \`PATH\`.

`;
const ORCH_POSTURE = `## OpenCode orch mode

Assume the-judge posture and use the XBGST protocol for every task: name the axes, dispatch the relevant \`the-*\` subagents in parallel, cross-critique, distill, apply the Pareto filter, and continue until the frontier saturates or the user stops the run. Never delegate to OpenCode's built-in \`general\` or \`explore\` agents.

Load all three Godspeed sources before orchestrating: \`~/.agents/godspeed-core/directive.md\`, \`~/.agents/godspeed-core/filter.md\`, and \`~/.agents/godspeed-core/velocity.md\`. The judge alone owns \`filter.md\` and \`velocity.md\`. Prepend the canonical Godspeed directive to every local or cross-model delegation; deployed subagents load only the directive.

Your **FIRST dispatch MUST be \`the-planner\`**. Require it to load the \`wwkd\` skill before its Phase 0 data-walk, then use its skeleton as the baseline for axis naming and specialist dispatch. Do not substitute a built-in planning agent.

`;

function fail(message) {
  throw new Error(message);
}

function parseArgs(args) {
  let scope;
  let projectDir;
  let force = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--force") {
      if (force) fail("--force may only be specified once");
      force = true;
    } else if (argument === "--global") {
      if (scope) fail("specify exactly one of --global or --project <dir>");
      scope = "global";
    } else if (argument === "--project") {
      if (scope) fail("specify exactly one of --global or --project <dir>");
      const value = args[index + 1];
      if (!value || value.startsWith("--")) fail("--project requires a directory");
      scope = "project";
      projectDir = value;
      index += 1;
    } else {
      fail(`unknown argument: ${argument}`);
    }
  }

  if (!scope) fail("specify exactly one of --global or --project <dir>");
  return { force, projectDir, scope };
}

async function statOrNull(filePath) {
  try {
    return await lstat(filePath);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function assertNoSymlinkComponents(targetPath) {
  const absolutePath = path.resolve(targetPath);
  const { root } = path.parse(absolutePath);
  const components = absolutePath.slice(root.length).split(path.sep).filter(Boolean);
  let current = root;

  for (const component of components) {
    current = path.join(current, component);
    const stats = await statOrNull(current);
    if (!stats) return;
    if (stats.isSymbolicLink()) fail(`refusing symlink path component: ${current}`);
  }
}

function parseAgent(source, filename) {
  const match = source.match(FRONTMATTER);
  if (!match) fail(`invalid YAML frontmatter in ${filename}`);

  const fields = new Map();
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):[ \t]*(.*)$/);
    if (!field) fail(`unsupported YAML frontmatter in ${filename}: ${line}`);
    if (fields.has(field[1])) fail(`duplicate ${field[1]} field in ${filename}`);
    fields.set(field[1], field[2]);
  }

  const filenameMatch = filename.match(AGENT_FILE);
  if (!filenameMatch) fail(`unsafe agent filename: ${filename}`);
  const name = fields.get("name");
  if (name !== filenameMatch[1]) fail(`filename/frontmatter name mismatch in ${filename}`);

  const description = fields.get("description");
  if (!description || description === "|" || description === ">") {
    fail(`missing or unsupported description in ${filename}`);
  }

  let body = match[2];
  body = body
    .replace(
      'Your **FIRST tool call MUST be `Skill(skill="wwkd")`**',
      'Your **FIRST action MUST load `wwkd`** using the host skill loader. If no loader is available, read `~/.claude/skills/wwkd/SKILL.md` or `~/.agents/skills/wwkd/SKILL.md` and apply that posture inline before planning',
    )
    .replaceAll('Skill("librarian", "discover <topic>")', 'the optional librarian skill for `discover <topic>`')
    .replaceAll("SendMessage", "Send through the host's available messaging mechanism")
    .replaceAll("TaskUpdate completed.", "If the host supports task-state updates, mark the task completed.")
    .replaceAll('`advisor()`', "the host's deep-reasoning facility (if available)");

  return `---\ndescription: ${description}\nmode: subagent\n---\n\n${PORTABILITY}${body.replace(/^\s+/, "")}`;
}

function createOrchAgent(judge) {
  return {
    name: "orch",
    content: judge.content
      .replace("mode: subagent", "mode: primary")
      .replace(PORTABILITY, `${PORTABILITY}${ORCH_POSTURE}`),
  };
}

async function loadAgents(sourceDir) {
  await assertNoSymlinkComponents(sourceDir);
  const sourceStats = await lstat(sourceDir);
  if (!sourceStats.isDirectory()) fail(`agent source is not a directory: ${sourceDir}`);

  const entries = await readdir(sourceDir, { withFileTypes: true });
  const sourceEntries = entries.filter((entry) => entry.name.endsWith(".agent.md"));
  if (sourceEntries.length === 0) fail(`no agent payloads found in ${sourceDir}`);

  const agents = [];
  for (const entry of sourceEntries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!AGENT_FILE.test(entry.name)) fail(`unsafe agent filename: ${entry.name}`);
    if (entry.isSymbolicLink() || !entry.isFile()) fail(`unsafe agent source: ${entry.name}`);

    const sourcePath = path.join(sourceDir, entry.name);
    const sourceStatsForFile = await lstat(sourcePath);
    if (sourceStatsForFile.isSymbolicLink() || !sourceStatsForFile.isFile()) {
      fail(`unsafe agent source: ${sourcePath}`);
    }

    const source = await readFile(sourcePath, "utf8");
    const name = entry.name.slice(0, -".agent.md".length);
    agents.push({ content: parseAgent(source, entry.name), name });
  }
  const judge = agents.find((agent) => agent.name === "the-judge");
  if (!judge) fail("the-judge agent is required for OpenCode orch mode");
  agents.push(createOrchAgent(judge));
  return agents;
}

async function resolveDestination(options) {
  if (options.scope === "project") {
    const projectRoot = path.resolve(options.projectDir);
    await assertNoSymlinkComponents(projectRoot);
    const stats = await lstat(projectRoot);
    if (!stats.isDirectory()) fail(`project path is not a directory: ${projectRoot}`);
    return path.join(projectRoot, ".opencode", "agents");
  }

  const configuredRoot = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  if (!path.isAbsolute(configuredRoot)) fail("XDG_CONFIG_HOME must be an absolute path");
  return path.join(configuredRoot, "opencode", "agents");
}

async function preflight(agents, destinationDir, force) {
  await assertNoSymlinkComponents(destinationDir);
  const writes = [];

  for (const agent of agents) {
    const destination = path.join(destinationDir, `${agent.name}.md`);
    const stats = await statOrNull(destination);
    if (!stats) {
      writes.push({ ...agent, destination, previous: null });
      continue;
    }
    if (stats.isSymbolicLink() || !stats.isFile()) fail(`unsafe destination: ${destination}`);

    const existing = await readFile(destination, "utf8");
    if (existing === agent.content) continue;
    if (!force) fail(`destination exists with different content: ${destination} (use --force to replace)`);
    writes.push({ ...agent, destination, previous: existing });
  }
  return writes;
}

async function writeAgent(write) {
  if (write.previous === null) {
    await writeFile(write.destination, write.content, { encoding: "utf8", flag: "wx" });
    return;
  }

  const currentStats = await lstat(write.destination);
  if (currentStats.isSymbolicLink() || !currentStats.isFile()) {
    fail(`destination changed during install: ${write.destination}`);
  }
  const current = await readFile(write.destination, "utf8");
  if (current !== write.previous) fail(`destination changed during install: ${write.destination}`);

  const temporary = path.join(
    path.dirname(write.destination),
    `.${path.basename(write.destination)}.${process.pid}.${Date.now()}.tmp`,
  );
  try {
    await writeFile(temporary, write.content, { encoding: "utf8", flag: "wx" });
    await rename(temporary, write.destination);
  } finally {
    await unlink(temporary).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const sourceDir = path.join(repositoryRoot, "marketplace", "plugins", "myagents", "agents");
  const destinationDir = await resolveDestination(options);
  const agents = await loadAgents(sourceDir);
  const writes = await preflight(agents, destinationDir, options.force);

  await mkdir(destinationDir, { recursive: true });
  await assertNoSymlinkComponents(destinationDir);
  const destinationStats = await lstat(destinationDir);
  if (!destinationStats.isDirectory()) fail(`destination is not a directory: ${destinationDir}`);

  for (const write of writes) await writeAgent(write);
  console.log(`Installed ${writes.length}; unchanged ${agents.length - writes.length}; destination ${destinationDir}`);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
