#!/usr/bin/env node

import {
  applyInstallPlan,
  createInstallPlan,
  formatPlan,
  parseInstallerOptions,
} from "../lib/install-engine.mjs";

async function main() {
  const options = parseInstallerOptions(process.argv.slice(2));
  const plan = await createInstallPlan({ mode: "full", ...options });
  process.stdout.write(`z00mr AIO local full-pack plan\n-------------------------------\n${formatPlan(plan)}\n`);
  const result = await applyInstallPlan(plan, { dryRun: options.dryRun });
  if (result.dryRun) {
    process.stdout.write(`dry-run complete: ${result.operations} planned operations; no mutation performed.\n`);
  } else {
    process.stdout.write(`install complete: ${result.operations} operations; ${result.backups.length} collision backups retained.\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`z00mr-install: ${error.message}\n`);
  process.exitCode = 1;
});
