#!/usr/bin/env node

import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_ROLES } from "../lib/install-engine.mjs";
import { buildRinneganCatalog, serializeRinneganCatalog } from "../lib/rinnegan-catalog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DS4CC = path.resolve(ROOT, "..", "ds4cc-marketplace");
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const sha256 = (content) => createHash("sha256").update(content).digest("hex");
const INSTALLER_AUTHORITY = "https://github.com/VeigaPunk/myagents";
const bootstrapCommand = (name) =>
  `bash -c 'set -euo pipefail; d="$(mktemp -d)"; trap "rm -rf -- \\"$d\\"" EXIT; git clone --depth 1 https://github.com/VeigaPunk/myagents.git "$d/myagents"; node "$d/myagents/bin/${name}.mjs"'`;

async function json(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    errors.push(`${file}: ${error.message}`);
    return null;
  }
}

const gitConfig = await readFile(path.join(ROOT, ".git", "config"), "utf8").catch(() => "");
check(/url\s*=\s*https:\/\/github\.com\/VeigaPunk\/myagents(?:\.git)?\s*$/m.test(gitConfig), "repository must preserve the official myagents origin");

const topLevelRoles = (await readdir(ROOT)).filter((name) => /^the-[a-z0-9-]+\.md$/.test(name)).sort();
const expectedRoles = PUBLIC_ROLES.map((name) => `${name}.md`).sort();
check(topLevelRoles.join("\n") === expectedRoles.join("\n"), "top-level canonical public role set is not exact");
for (const role of PUBLIC_ROLES) {
  const file = path.join(ROOT, `${role}.md`);
  const [content, metadata] = await Promise.all([readFile(file, "utf8"), lstat(file)]);
  check(metadata.isFile() && !metadata.isSymbolicLink(), `${role}: canonical card must be a regular non-symlink file`);
  check(new RegExp(`^name:\\s*${role}$`, "m").test(content), `${role}: frontmatter name mismatch`);
}

const reconciliation = await json(path.join(ROOT, "reconciliation.json"));
if (reconciliation) {
  check(reconciliation.schema === "myagents.public-role-reconciliation.v1", "reconciliation schema mismatch");
  check(reconciliation.policy === "standalone-authority-wins", "reconciliation must make standalone authority win");
  check(reconciliation.canonicalRoleCount === 16, "reconciliation role count must be 16");
  check(reconciliation.records?.length === 16, "reconciliation must cover every public role");
  for (const record of reconciliation.records || []) {
    const content = await readFile(path.join(ROOT, `${record.name}.md`)).catch(() => null);
    check(Boolean(content), `reconciliation references missing role ${record.name}`);
    if (!content) continue;
    const digest = sha256(content);
    if (record.resolution === "canonical-kept") check(record.remoteSha256 === digest, `${record.name}: remote authority digest changed without reconciliation`);
    else if (record.resolution === "packaged-seeded") check(record.remoteSha256 === null && record.packagedSha256 === digest, `${record.name}: packaged seed provenance mismatch`);
    else check(false, `${record.name}: unknown reconciliation resolution`);
    check(record.mirrorAction === "publish-canonical-to-ds4cc", `${record.name}: mirror direction is not canonical-first`);
  }
}

const admission = await json(path.join(ROOT, "rinnegan", "admission.json"));
if (admission) {
  check(Object.keys(admission).sort().join(",") === "records,schema", "admission has unknown top-level fields");
  check(admission.schema === "myagents.rinnegan-admission.v1", "admission schema mismatch");
  check(admission.records?.length === 1, "admission must contain exactly one role");
  const record = admission.records?.[0];
  const card = await readFile(path.join(ROOT, "rinnegan", "the-leanbuilder.md"));
  check(record?.name === "the-leanbuilder", "only the-leanbuilder may be admitted");
  check(record?.admitted === true && record?.rinnegan === true && record?.shipped === true, "leanbuilder admission must be positive and fail-closed");
  check(record?.launcherKind === "one-shot", "leanbuilder launcher must be one-shot");
  check(record?.roleCard === "rinnegan/the-leanbuilder.md", "leanbuilder role-card path is not fixed");
  check(record?.source === "local-only", "leanbuilder provenance must be local-only");
  check(record?.sha256 === sha256(card), "leanbuilder admission digest does not match its fixed card");
}

const installers = await json(path.join(ROOT, "rinnegan", "installers.json"));
if (installers) {
  check(installers.schema === "myagents.rinnegan-installers.v1", "installer admission schema mismatch");
  check(installers.records?.length === 2, "exactly two local installers must be admitted");
  for (const record of installers.records || []) {
    check(record.admitted === true && record.rinnegan === true && record.shipped === true, `${record.name}: installer is not positively admitted`);
    check(record.source === INSTALLER_AUTHORITY, `${record.name}: installer authority must be canonical myagents`);
    check(record.bootstrap === "git-clone-default-branch", `${record.name}: installer bootstrap kind is not fixed`);
    check(record.localCommand === record.name, `${record.name}: local installer command must be fixed`);
    check(record.command === bootstrapCommand(record.name), `${record.name}: public installer one-liner is not fixed`);
  }
}

const packagedDir = path.join(DS4CC, "marketplace", "plugins", "myagents", "agents");
let packagedNames = [];
try {
  packagedNames = (await readdir(packagedDir)).filter((name) => name.endsWith(".agent.md")).sort();
} catch (error) {
  errors.push(`mandatory sibling canonical mirror is unavailable: ${error.message}`);
}
check(packagedNames.length === 16, `mandatory sibling mirror must contain 16 public roles, found ${packagedNames.length}`);
for (const role of PUBLIC_ROLES) {
  const packaged = path.join(packagedDir, `${role}.agent.md`);
  const canonical = path.join(ROOT, `${role}.md`);
  const [left, right] = await Promise.all([readFile(packaged).catch(() => null), readFile(canonical)]);
  check(Boolean(left) && left.equals(right), `${role}: DS4CC packaged mirror differs from standalone authority`);
}
check(!packagedNames.includes("the-leanbuilder.agent.md"), "leanbuilder must not enter the standard plugin agent payload");

const forbiddenSurfaces = [
  path.join(DS4CC, ".agents", "plugins", "marketplace.json"),
  path.join(DS4CC, ".grok-plugin", "marketplace.json"),
  path.join(DS4CC, ".kimi-plugin", "marketplace.json"),
  path.join(DS4CC, "index.html"),
];
for (const surface of forbiddenSurfaces) {
  const text = await readFile(surface, "utf8").catch(() => "");
  if (surface.endsWith("index.html")) {
    const ordinary = text.match(/const\s+PLUGINS\s*=\s*\[([\s\S]*?)\];/)?.[1] || "";
    check(!ordinary.includes("the-leanbuilder"), "ordinary wall catalog must not contain leanbuilder");
  } else {
    check(!text.includes("the-leanbuilder"), `${surface}: host catalog must not discover leanbuilder`);
  }
}

const generated = Buffer.from(serializeRinneganCatalog(await buildRinneganCatalog(ROOT)));
const wall = await readFile(path.join(DS4CC, "rinnegan", "catalog.js")).catch(() => null);
check(Boolean(wall) && wall.equals(generated), "Rinnegan wall snapshot is missing or stale");

for (const relative of ["bin/myagents.mjs", "rinnegan/the-leanbuilder.md", "rinnegan/admission.json"]) {
  const [canonical, packaged] = await Promise.all([
    readFile(path.join(ROOT, relative)),
    readFile(path.join(DS4CC, "marketplace", "plugins", "myagents", relative)).catch(() => null),
  ]);
  check(Boolean(packaged) && packaged.equals(canonical), `full-pack private one-shot file is stale: ${relative}`);
}

const distributionRoot = path.join(DS4CC, "rinnegan", "distributions");
const distribution = await json(path.join(distributionRoot, "catalog.json"));
if (distribution) {
  check(distribution.schema === "ds4cc.myagents-distributions.v1", "distribution catalog schema mismatch");
  check(distribution.authority === "https://github.com/VeigaPunk/myagents", "distribution catalog authority mismatch");
  check(distribution.fullPack?.leanbuilder?.discoverableAsAgent === false, "full-pack leanbuilder must not be globally discoverable");
  const expectedInstallers = (installers?.records || []).map(({ name, kind, command }) => ({ name, kind, command }));
  check(
    JSON.stringify(distribution.fullPack?.installerCommands) === JSON.stringify(expectedInstallers),
    "full-pack installer one-liners are stale",
  );
  check(distribution.standaloneAgents?.length === 16, "distribution catalog must expose exactly 16 standalone public agents");
  const names = (distribution.standaloneAgents || []).map((record) => record.name).sort();
  check(names.join("\n") === [...PUBLIC_ROLES].sort().join("\n"), "standalone distribution role names are stale");
  for (const record of distribution.standaloneAgents || []) {
    const expectedSource = `./agents/${record.name}.agent.md`;
    check(record.kind === "standalone-public-agent" && record.source === expectedSource, `${record.name}: standalone distribution metadata mismatch`);
    check(record.installCommand === bootstrapCommand("b00mr-install"), `${record.name}: standalone distribution must route through the b00mr one-liner`);
    const [bundle, canonical] = await Promise.all([
      readFile(path.join(distributionRoot, record.source)),
      readFile(path.join(ROOT, `${record.name}.md`)),
    ]);
    check(bundle.equals(canonical), `${record.name}: standalone bundle differs from authority`);
    check(record.sha256 === sha256(canonical), `${record.name}: standalone bundle digest mismatch`);
  }
  for (const record of distribution.fullPack?.files || []) {
    check(!path.isAbsolute(record.path) && !record.path.split("/").includes(".."), `unsafe full-pack path: ${record.path}`);
    const [bundle, canonical] = await Promise.all([
      readFile(path.join(distributionRoot, "full-pack", record.path)),
      readFile(path.join(ROOT, record.path)),
    ]);
    check(bundle.equals(canonical), `full-pack file differs from authority: ${record.path}`);
    check(record.sha256 === sha256(canonical), `full-pack digest mismatch: ${record.path}`);
  }
  check(
    !(distribution.fullPack?.files || []).some((record) => record.path === "the-leanbuilder.md"),
    "full-pack must not place leanbuilder in its generic top-level agent directory",
  );
}

if (errors.length) {
  for (const error of errors) process.stderr.write(`Error: ${error}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("validated standalone authority, digest admission, installers, exact DS4CC mirror, and Rinnegan snapshot\n");
}
