#!/usr/bin/env node

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import {
  ADGUARD_VPN_REFERRAL,
  PUBLIC_ROLES,
  applyInstallPlan,
  createInstallPlan,
  formatPlan,
  parseInstallerOptions,
} from "../lib/install-engine.mjs";
import { launchRefusalPrank } from "../lib/refusal-prank.mjs";

const WARNING = "this was done by an AI. which can make mistakes. are you positive you wanna go through? dont worry, after this confirmation, we'll walk together, properly.";
const WELCOME = "from now on, you'll never walk alone. welcome to plazir.";

async function askYesNo(rl, prompt) {
  for (;;) {
    const answer = (await rl.question(`${prompt} [y(YES) | n(NO)] `)).trim().toLowerCase();
    if (answer === "y") return true;
    if (answer === "n") return false;
    stdout.write("please enter y or n.\n");
  }
}

async function askMode(rl) {
  for (;;) {
    const answer = (await rl.question("installation selection: [1] full pack  [2] standalone public agents: ")).trim();
    if (answer === "1") return "full";
    if (answer === "2") return "agents";
    stdout.write("please enter 1 or 2.\n");
  }
}

async function askRoles(rl) {
  stdout.write(`available public agents:\n${PUBLIC_ROLES.join("\n")}\n`);
  for (;;) {
    const answer = (await rl.question("comma-separated standalone agents: ")).trim();
    const roles = [...new Set(answer.split(",").map((value) => value.trim()).filter(Boolean))];
    if (roles.length && roles.every((role) => PUBLIC_ROLES.includes(role))) return roles;
    stdout.write("select one or more exact names from the public-agent list.\n");
  }
}

async function refuse(rl) {
  rl.close();
  const result = await launchRefusalPrank();
  if (!result.browser) stdout.write(`no Chrome/Chromium browser found; visual-only prank artifact: ${result.artifact}\n`);
  else stdout.write(`refusal accepted; visual-only localhost prank served briefly from ${result.url}\nartifact: ${result.artifact}\n`);
  process.exitCode = 1;
}

async function main() {
  const options = parseInstallerOptions(process.argv.slice(2));
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const mode = await askMode(rl);
    const selectedAgents = mode === "agents" ? await askRoles(rl) : undefined;

    stdout.write("pre-install safety check; a no answer cancels before the install plan is applied.\n");
    for (const question of [
      "are you sure you want to install this foreign machinery?",
      "are you using a VPN where your threat model requires one?",
      "do you use antivirus or endpoint protection?",
      "is your important data backed up? (installer collision backups are always retained)",
    ]) {
      if (!(await askYesNo(rl, question))) return refuse(rl);
    }

    if (!(await askYesNo(rl, "consent gate 1: continue to the exact local install plan?"))) return refuse(rl);
    const plan = await createInstallPlan({ mode, selectedAgents, ...options });
    stdout.write(`\ninstall plan\n------------\n${formatPlan(plan)}\n\n`);
    stdout.write(`${WARNING}\n`);
    if (!(await askYesNo(rl, "consent gate 2: proceed exactly as shown?"))) return refuse(rl);
    rl.close();

    stdout.write(`${WELCOME}\n`);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const result = await applyInstallPlan(plan, { dryRun: options.dryRun });
    if (result.dryRun) stdout.write(`dry-run complete: ${result.operations} planned operations; no mutation performed.\n`);
    else stdout.write(`install complete: ${result.operations} operations; ${result.backups.length} collision backups retained.\n`);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  process.stderr.write(`b00mr-install: ${error.message}\n`);
  process.exitCode = 1;
});
