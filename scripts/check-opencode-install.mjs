#!/usr/bin/env node

import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(path.join(os.tmpdir(), "ds4cc-opencode-"));

try {
  const result = spawnSync(
    process.execPath,
    [path.join(root, "scripts", "install-opencode-agents.mjs"), "--project", temporary],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr || `installer exited ${result.status}`);

  const destination = path.join(temporary, ".opencode", "agents");
  const files = (await readdir(destination)).sort();
  if (files.length !== 16 || files.some((name) => !/^(?:orch|[a-z0-9]+(?:-[a-z0-9]+)*)\.md$/.test(name))) {
    throw new Error(`unexpected generated filenames: ${files.join(", ")}`);
  }

  for (const filename of files) {
    const content = await readFile(path.join(destination, filename), "utf8");
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!frontmatter) throw new Error(`${filename}: missing frontmatter`);
    const fields = frontmatter[1].split("\n").map((line) => line.split(":", 1)[0]);
    const expectedMode = filename === "orch.md" ? "primary" : "subagent";
    if (fields.join(",") !== "description,mode" || !frontmatter[1].includes(`mode: ${expectedMode}`)) {
      throw new Error(`${filename}: invalid OpenCode frontmatter`);
    }
    if (!content.includes("## OpenCode portability")) throw new Error(`${filename}: portability directive missing`);
    if (!content.includes("Godspeed is inherited.")) throw new Error(`${filename}: inherited Godspeed directive missing`);
    if (!content.includes("Delegation is transitive.")) throw new Error(`${filename}: transitive delegation directive missing`);
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

  console.log(`Validated isolated OpenCode install: ${files.length} portable agents in ${destination}`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
