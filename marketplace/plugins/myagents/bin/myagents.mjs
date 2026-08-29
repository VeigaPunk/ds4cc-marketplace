#!/usr/bin/env node

import { constants } from "node:fs";
import {
  access,
  chmod,
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  stat,
} from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CARD_PATH = path.join(ROOT, "rinnegan", "the-leanbuilder.md");
const ADMISSION_PATH = path.join(ROOT, "rinnegan", "admission.json");
const RUN_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_RUN_ID_BYTES = 63;
const MAX_TASK_BYTES = 8192;
const MAX_OUTPUT_BYTES = 512 * 1024;
const MAX_RUNTIME_MS = 10 * 60 * 1000;
const MAX_OMP_BYTES = 256 * 1024 * 1024;
const MAX_VERSION_SCAN_BYTES = 128 * 1024 * 1024;
const VERSION_MARKER = Buffer.from("18.0.11");

function fail(message, exitCode = 2) {
  const error = new Error(message);
  error.exitCode = exitCode;
  throw error;
}

function parseOptions(args, allowed) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!allowed.has(flag) || value === undefined || value.startsWith("--")) {
      fail(`invalid option: ${flag ?? "<missing>"}`);
    }
    if (Object.hasOwn(values, flag)) fail(`duplicate option: ${flag}`);
    values[flag] = value;
  }
  return values;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function loadAdmission() {
  const [card, rawAdmission] = await Promise.all([
    readFile(CARD_PATH, "utf8"),
    readFile(ADMISSION_PATH, "utf8"),
  ]);
  let admission;
  try {
    admission = JSON.parse(rawAdmission);
  } catch {
    fail("leanbuilder admission is not valid JSON");
  }
  const keys = Object.keys(admission).sort();
  if (keys.join(",") !== "records,schema" || admission.schema !== "myagents.rinnegan-admission.v1") {
    fail("leanbuilder admission schema is not recognized");
  }
  if (!Array.isArray(admission.records) || admission.records.length !== 1) {
    fail("leanbuilder admission must contain exactly one record");
  }
  const record = admission.records[0];
  const expectedKeys = [
    "admitted", "command", "launcherKind", "name", "rinnegan",
    "roleCard", "sha256", "shipped", "source",
  ];
  if (!record || Object.keys(record).sort().join(",") !== expectedKeys.sort().join(",")) {
    fail("leanbuilder admission record has unknown or missing fields");
  }
  if (
    record.name !== "the-leanbuilder" ||
    record.admitted !== true ||
    record.rinnegan !== true ||
    record.shipped !== true ||
    record.launcherKind !== "one-shot" ||
    record.roleCard !== "rinnegan/the-leanbuilder.md" ||
    record.source !== "local-only" ||
    record.command !== "myagents lean --run-id \"lean-$(date -u +%Y%m%d-%H%M%S)-$$\" --target \"$PWD\" --task \"remove needless weight and repair existing manifest registry installer and path wiring\"" ||
    !/^[a-f0-9]{64}$/.test(record.sha256) ||
    sha256(card) !== record.sha256
  ) {
    fail("leanbuilder admission or role-card digest is invalid");
  }
  return { card, record };
}

async function canonicalOwnedDirectory(candidate, label) {
  if (!candidate || !path.isAbsolute(candidate)) fail(`${label} must be an absolute path`);
  const resolved = path.resolve(candidate);
  const [canonical, metadata] = await Promise.all([realpath(resolved), lstat(resolved)]);
  if (canonical !== resolved || metadata.isSymbolicLink() || !metadata.isDirectory()) {
    fail(`${label} must be an existing canonical non-symlink directory`);
  }
  if (typeof process.getuid === "function" && metadata.uid !== process.getuid()) {
    fail(`${label} must be owned by the current user`);
  }
  return canonical;
}

async function containsVersionMarker(executable) {
  let scanned = 0;
  let carry = Buffer.alloc(0);
  const stream = createReadStream(executable, {
    start: 0,
    end: MAX_VERSION_SCAN_BYTES - 1,
    highWaterMark: 256 * 1024,
  });
  for await (const chunk of stream) {
    scanned += chunk.length;
    const block = Buffer.concat([carry, chunk]);
    if (block.includes(VERSION_MARKER)) {
      stream.destroy();
      return true;
    }
    carry = block.subarray(Math.max(0, block.length - VERSION_MARKER.length + 1));
    if (scanned >= MAX_VERSION_SCAN_BYTES) break;
  }
  return false;
}

async function resolveOmp() {
  const candidates = new Set();
  for (const directory of (process.env.PATH || "").split(path.delimiter)) {
    if (!directory || !path.isAbsolute(directory)) continue;
    const candidate = path.join(directory, "omp");
    try {
      await access(candidate, constants.X_OK);
      const canonical = await realpath(candidate);
      const metadata = await stat(canonical);
      if (metadata.isFile() && metadata.size > 0 && metadata.size <= MAX_OMP_BYTES) {
        candidates.add(canonical);
      }
    } catch {
      // This PATH entry does not contain a usable OMP executable.
    }
  }
  if (candidates.size !== 1) fail(`expected exactly one canonical OMP executable, found ${candidates.size}`);
  const [executable] = candidates;
  if (!(await containsVersionMarker(executable))) {
    fail("OMP executable is not attested as 18.0.11-compatible");
  }
  return executable;
}

async function privateStateRoot() {
  const stateBase = process.env.XDG_STATE_HOME || path.join(homedir(), ".local", "state");
  if (!path.isAbsolute(stateBase)) fail("XDG_STATE_HOME must be absolute");
  const base = path.resolve(stateBase);
  let ancestor = base;
  for (;;) {
    try {
      const [canonicalAncestor, ancestorMetadata] = await Promise.all([realpath(ancestor), lstat(ancestor)]);
      if (canonicalAncestor !== ancestor || ancestorMetadata.isSymbolicLink() || !ancestorMetadata.isDirectory()) {
        fail("XDG_STATE_HOME must have a canonical non-symlink ancestor");
      }
      break;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const parent = path.dirname(ancestor);
      if (parent === ancestor) throw error;
      ancestor = parent;
    }
  }
  await mkdir(base, { recursive: true, mode: 0o700 });
  const [canonicalBase, baseMetadata] = await Promise.all([realpath(base), lstat(base)]);
  if (canonicalBase !== base || baseMetadata.isSymbolicLink() || !baseMetadata.isDirectory()) {
    fail("XDG_STATE_HOME must be a canonical non-symlink directory");
  }
  if (typeof process.getuid === "function" && baseMetadata.uid !== process.getuid()) {
    fail("XDG_STATE_HOME must be owned by the current user");
  }
  const namespace = path.join(base, "myagents");
  const root = path.join(namespace, "lean");
  for (const directory of [namespace, root]) {
    try {
      await mkdir(directory, { mode: 0o700 });
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
    const [canonical, metadata] = await Promise.all([realpath(directory), lstat(directory)]);
    if (canonical !== directory || metadata.isSymbolicLink() || !metadata.isDirectory()) {
      fail("leanbuilder state must use canonical non-symlink directories");
    }
    if (typeof process.getuid === "function" && metadata.uid !== process.getuid()) {
      fail("leanbuilder state must be owned by the current user");
    }
    await chmod(directory, 0o700);
  }
  return root;
}

async function writeState(runDirectory, state) {
  const destination = path.join(runDirectory, "result.json");
  const temporary = path.join(runDirectory, `.result-${process.pid}.tmp`);
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(state, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, destination);
}

async function claimRun(runId, target, executable) {
  const root = await privateStateRoot();
  const runDirectory = path.join(root, runId);
  try {
    await mkdir(runDirectory, { mode: 0o700 });
  } catch (error) {
    if (error?.code === "EEXIST") fail(`run id is permanently claimed: ${runId}`);
    throw error;
  }
  const startedAt = new Date().toISOString();
  const initial = {
    schema: "myagents.lean-result.v1",
    runId,
    status: "running",
    target,
    omp: executable,
    startedAt,
  };
  await writeState(runDirectory, initial);
  return { runDirectory, initial };
}

function runOnce(executable, args) {
  return new Promise((resolve, reject) => {
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let exceeded = false;
    let timedOut = false;
    const child = spawn(executable, args, {
      cwd: args[args.indexOf("--cwd") + 1],
      env: { ...process.env, MYAGENTS_LEANBUILDER_ACTIVE: "1" },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stop = (reason) => {
      if (reason === "output") exceeded = true;
      if (reason === "timeout") timedOut = true;
      child.kill("SIGTERM");
      const hardKill = setTimeout(() => child.kill("SIGKILL"), 1000);
      hardKill.unref();
    };
    child.stdout.on("data", (chunk) => {
      if (stdout.length + chunk.length > MAX_OUTPUT_BYTES) return stop("output");
      stdout = Buffer.concat([stdout, chunk]);
    });
    child.stderr.on("data", (chunk) => {
      if (stderr.length + chunk.length > MAX_OUTPUT_BYTES) return stop("output");
      stderr = Buffer.concat([stderr, chunk]);
    });
    const timer = setTimeout(() => stop("timeout"), MAX_RUNTIME_MS);
    timer.unref();
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, exceeded, timedOut });
    });
  });
}

async function lean(args) {
  if (process.env.MYAGENTS_LEANBUILDER_ACTIVE) fail("recursive leanbuilder invocation is denied");
  const options = parseOptions(args, new Set(["--run-id", "--target", "--task"]));
  const runId = options["--run-id"];
  const task = options["--task"];
  if (!runId || !RUN_ID.test(runId) || Buffer.byteLength(runId) > MAX_RUN_ID_BYTES) {
    fail("run id must be a safe kebab identifier of at most 63 bytes");
  }
  if (!task || !task.trim() || /^[-@]/.test(task) || Buffer.byteLength(task, "utf8") > MAX_TASK_BYTES || task.includes("\0")) {
    fail(`task must be non-empty, non-option text of at most ${MAX_TASK_BYTES} UTF-8 bytes`);
  }
  const [{ card }, target, executable] = await Promise.all([
    loadAdmission(),
    canonicalOwnedDirectory(options["--target"], "target"),
    resolveOmp(),
  ]);
  const { runDirectory, initial } = await claimRun(runId, target, executable);
  const childArgs = [
    "-p", "--mode", "json", "--no-session", "--no-extensions",
    "--cwd", target, "--system-prompt", card, task,
  ];
  let outcome;
  try {
    outcome = await runOnce(executable, childArgs);
  } catch (error) {
    outcome = { code: null, signal: null, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0), spawnError: error.message };
  }
  const succeeded = outcome.code === 0 && !outcome.signal && !outcome.exceeded && !outcome.timedOut && !outcome.spawnError;
  const result = {
    ...initial,
    status: succeeded ? "succeeded" : "failed",
    endedAt: new Date().toISOString(),
    evidence: {
      exitCode: outcome.code,
      signal: outcome.signal,
      timedOut: Boolean(outcome.timedOut),
      outputLimitExceeded: Boolean(outcome.exceeded),
      spawnError: outcome.spawnError || null,
      stdoutBytes: outcome.stdout.length,
      stderrBytes: outcome.stderr.length,
      stdoutSha256: sha256(outcome.stdout),
      stderrSha256: sha256(outcome.stderr),
    },
  };
  await writeState(runDirectory, result);
  if (outcome.stdout.length) process.stdout.write(outcome.stdout);
  if (outcome.stderr.length) process.stderr.write(outcome.stderr);
  if (!succeeded) fail(`leanbuilder run failed; evidence: ${path.join(runDirectory, "result.json")}`, 1);
}

async function catalog(args) {
  if (args.length) fail("catalog accepts no options");
  const { record } = await loadAdmission();
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "lean") return lean(args);
  if (command === "catalog") return catalog(args);
  fail("usage: myagents <lean|catalog>");
}

main().catch((error) => {
  process.stderr.write(`myagents: ${error.message}\n`);
  process.exitCode = Number.isInteger(error.exitCode) ? error.exitCode : 1;
});
