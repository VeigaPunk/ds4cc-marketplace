#!/usr/bin/env node

import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(path.join(os.tmpdir(), "ds4cc-opencode-"));
const CONCURRENCY_CEILING = "- **Concurrency ceiling.** Never have more than 16 concurrently spawned subagents.";

try {
  const result = spawnSync(
    process.execPath,
    [path.join(root, "scripts", "install-opencode-agents.mjs"), "--project", temporary],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr || `installer exited ${result.status}`);

  const destination = path.join(temporary, ".opencode", "agents");
  const files = (await readdir(destination)).sort();
  if (files.length !== 18 || files.some((name) => !/^(?:orch|[a-z0-9]+(?:-[a-z0-9]+)*)\.md$/.test(name))) {
    throw new Error(`unexpected generated filenames: ${files.join(", ")}`);
  }

  const modeCounts = { primary: 0, subagent: 0 };
  for (const filename of files) {
    const content = await readFile(path.join(destination, filename), "utf8");
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!frontmatter) throw new Error(`${filename}: missing frontmatter`);
    const fields = frontmatter[1].split("\n").map((line) => line.split(":", 1)[0]);
    const expectedMode = filename === "orch.md" ? "primary" : "subagent";
    const actualMode = frontmatter[1].match(/^mode: (primary|subagent)$/m)?.[1];
    if (fields.join(",") !== "description,mode" || actualMode !== expectedMode) {
      throw new Error(`${filename}: invalid OpenCode frontmatter`);
    }
    modeCounts[actualMode] += 1;
    if (!content.includes("## OpenCode portability")) throw new Error(`${filename}: portability directive missing`);
    if (!content.includes("Godspeed is inherited.")) throw new Error(`${filename}: inherited Godspeed directive missing`);
    if (!content.includes("Delegation is transitive.")) throw new Error(`${filename}: transitive delegation directive missing`);
    if (!content.includes(CONCURRENCY_CEILING)) throw new Error(`${filename}: 16-subagent concurrency ceiling missing`);
    if (filename === "orch.md" && !content.includes("## OpenCode orch mode")) {
      throw new Error("orch.md: orchestration directive missing");
    }
    if (filename === "orch.md" && !content.includes("FIRST dispatch MUST be `the-planner`")) {
      throw new Error("orch.md: mandatory WWKD planner dispatch missing");
    }
    if (filename === "the-planner.md" && !content.includes("FIRST action MUST load `wwkd`")) {
      throw new Error("the-planner.md: mandatory WWKD posture missing");
    }
    if (/FIRST tool call MUST be `Skill|\bSendMessage\b|\bTaskUpdate\b/.test(content)) {
      throw new Error(`${filename}: contains a mandatory Claude-only API`);
    }
  }

  if (modeCounts.subagent !== 17 || modeCounts.primary !== 1) {
    throw new Error(`unexpected OpenCode modes: ${modeCounts.subagent} subagents, ${modeCounts.primary} primary`);
  }

  const { XDG_CONFIG_HOME: _ignored, ...inheritedEnv } = process.env;
  const fakeHome = path.join(temporary, "home");
  await mkdir(fakeHome, { recursive: true });
  await writeFile(path.join(fakeHome, ".bashrc"), "user rc line\n", "utf8");

  const globalRun = () =>
    spawnSync(
      process.execPath,
      [path.join(root, "scripts", "install-opencode-agents.mjs"), "--global"],
      { encoding: "utf8", env: { ...inheritedEnv, HOME: fakeHome } },
    );

  const assertExaExport = async (expectedBytes) => {
    const bashrc = await readFile(path.join(fakeHome, ".bashrc"), "utf8");
    if (!bashrc.includes("user rc line")) throw new Error("global install clobbered .bashrc user content");
    const exportCount = bashrc.split("\n").filter((line) => line === "export OPENCODE_ENABLE_EXA=1").length;
    if (exportCount !== 1) throw new Error(`expected exactly one OPENCODE_ENABLE_EXA export in .bashrc, found ${exportCount}`);
    return expectedBytes === undefined ? true : bashrc === expectedBytes;
  };

  if (globalRun().status !== 0) throw new Error("global installer run failed");
  await assertExaExport();
  const firstPass = await readFile(path.join(fakeHome, ".bashrc"), "utf8");
  const secondRun = globalRun();
  if (secondRun.status !== 0) throw new Error(secondRun.stderr || `installer exited ${secondRun.status}`);
  if (!(await assertExaExport(firstPass))) throw new Error("OPENCODE_ENABLE_EXA export is not idempotent");

  console.log(`Validated isolated OpenCode install: ${files.length} portable files (16 the-* agents + the-netsshark = 17 subagents, plus separate orch primary mode) and OPENCODE_ENABLE_EXA shell export in ${destination}`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
