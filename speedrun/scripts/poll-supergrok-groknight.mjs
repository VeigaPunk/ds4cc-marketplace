#!/usr/bin/env node
// 5-min live poller for SuperGrok OAuth groknight speedrun on ds4cc.com/speedrun
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, appendFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const UFO = "/home/vgpnk/Projects/origin-work/ufo-fsd-alpha";
const CLAIM_DIR = "/home/vgpnk/Projects/origin-work/open-bug-bounties/.ufo-missions/groknight/claim-ready";
const CLAIM_LEDGER = "/home/vgpnk/Projects/origin-work/open-bug-bounties/.ufo-missions/groknight/claim-ready-ledger.json";
const RUN_REL = "speedrun/data/run-supergrok-oauth-groknight-2026-09-13.json";
const CURVE_REL = "speedrun/data/supergrok-groknight-curve.json";
const LOG = join(UFO, ".ufo/nightrun/speedrun-poller.log");
const INTERVAL_MS = 5 * 60 * 1000;

function log(event, extra = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), event, ...extra });
  try { appendFileSync(LOG, line + "\n"); } catch { /* best effort */ }
  process.stdout.write(line + "\n");
}

function sh(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: "utf8", timeout: 60_000, maxBuffer: 8 * 1024 * 1024 });
}

function grokWeeklyPct() {
  const raw = sh("omp", ["usage", "--json"], UFO);
  const d = JSON.parse(raw);
  for (const r of d.reports || []) {
    if (r.provider !== "xai-oauth") continue;
    for (const lim of r.limits || []) {
      if (lim.id === "xai-oauth:credits:1w" || /SuperGrok Weekly/i.test(lim.label || "")) {
        const frac = lim.amount?.usedFraction;
        if (typeof frac === "number") return Math.round(frac * 1000) / 10;
      }
    }
  }
  return null;
}

function fleetCounts() {
  const raw = sh("bash", ["scripts/ufo-sighting", "status"], UFO);
  const d = JSON.parse(raw);
  const gk = (d.missions || []).filter((m) => m.fleet === "groknight");
  const l1 = gk.filter((m) => m.phase === "working").length;
  const l2 = gk.reduce((n, m) => n + (m.levels?.l2 || 0), 0);
  return {
    l1_count: l1,
    l2_count: l2,
    wall_l1_count: d.levels?.l1 ?? null,
    wall_l2_count: d.levels?.l2 ?? null,
  };
}

function claimReady() {
  try { mkdirSync(CLAIM_DIR, { recursive: true }); } catch { /* */ }
  let names = [];
  try { names = readdirSync(CLAIM_DIR).filter((n) => n.endsWith(".json") && !n.startsWith("_")); } catch { names = []; }
  const packages = [];
  for (const name of names) {
    const f = join(CLAIM_DIR, name);
    try {
      const row = JSON.parse(readFileSync(f, "utf8"));
      if (row?.status !== "claim-ready") continue;
      const usd = Number(row.expected_usd);
      packages.push({
        id: row.id || name.replace(/\.json$/, ""),
        company: row.company,
        program: row.program,
        platform: row.platform || null,
        url: row.url || null,
        expected_usd: Number.isFinite(usd) ? usd : null,
        expected_usd_basis: row.expected_usd_basis || null,
        l1: row.l1 || null,
        path: row.path || f,
        claimable_at: row.claimable_at || null,
      });
    } catch { /* skip bad drop */ }
  }
  const expected = packages.reduce((n, p) => n + (p.expected_usd || 0), 0);
  const ledger = {
    schema: "groknight-claim-ready-v1",
    note: "Append-only drop files under claim-ready/. expected_usd is published-program guidance, not a payout. No submit until L0.",
    updatedAt: new Date().toISOString(),
    count: packages.length,
    expected_usd_sum: expected,
    packages,
  };
  try { writeFileSync(CLAIM_LEDGER, `${JSON.stringify(ledger, null, 2)}\n`); } catch { /* */ }
  return {
    claim_ready_count: packages.length,
    claim_ready_expected_usd: expected,
    claim_ready_companies: [...new Set(packages.map((p) => p.company).filter(Boolean))],
    claim_ready: packages,
  };
}

function tick() {
  const ts = new Date().toISOString();
  const pct = grokWeeklyPct();
  const counts = fleetCounts();
  const claims = claimReady();
  const runPath = join(REPO, RUN_REL);
  const curvePath = join(REPO, CURVE_REL);
  const run = JSON.parse(readFileSync(runPath, "utf8"));
  const curve = JSON.parse(readFileSync(curvePath, "utf8"));
  const start = Date.parse(run.session_start);
  const elapsedMin = Number.isFinite(start) ? (Date.now() - start) / 60000 : null;
  const used = pct ?? run.metrics.used_percent;
  const startPct = run.metrics.start_percent ?? 20;
  const burned = used - startPct;
  const pctPerMin = elapsedMin > 0 ? burned / elapsedMin : null;

  const wrapping = used >= 96 && used < 100;
  const closed = used >= 100;
  const status = closed ? "closed" : wrapping ? "wrapping" : "live";
  run.status = status;
  run.duration = closed
    ? `closed · ${elapsedMin != null ? elapsedMin.toFixed(1) : "?"} min · SuperGrok weekly 100%`
    : wrapping
      ? `wrapping · ${elapsedMin != null ? elapsedMin.toFixed(1) : "?"} min · ${used}% weekly`
      : elapsedMin != null ? `live · ${elapsedMin.toFixed(1)} min` : "live";
  if (wrapping && !run.wrap_started_at) run.wrap_started_at = ts;
  if (closed) {
    run.closed = true;
    run.closed_ts = run.closed_ts || ts;
  }
  run.metrics = {
    ...run.metrics,
    used_percent: used,
    l1_count: counts.l1_count,
    l2_count: counts.l2_count,
    wall_l1_count: counts.wall_l1_count,
    wall_l2_count: counts.wall_l2_count,
    elapsed_min_from_session: elapsedMin != null ? Math.round(elapsedMin * 100) / 100 : null,
    pct_per_min: pctPerMin != null ? Math.round(pctPerMin * 10000) / 10000 : null,
    claim_ready_count: claims.claim_ready_count,
    claim_ready_expected_usd: claims.claim_ready_expected_usd,
    claim_ready_companies: claims.claim_ready_companies,
    l1_model: run.metrics?.l1_model || "xai-oauth/grok-4.6:low",
    l2_model: run.metrics?.l2_model || "xai-oauth/grok-4.5:low",
    outcome: status,
  };
  run.claim_ready = claims.claim_ready;
  run.snapshot = { ts, used_percent: used, ...counts, ...claims, status };
  run.summary = closed
    ? `CLOSED groknight SuperGrok OAuth at 100% weekly (start 20%). L1=${counts.l1_count} L2=${counts.l2_count}. Claim-ready ${claims.claim_ready_count} · expected $${claims.claim_ready_expected_usd}.`
    : wrapping
      ? `WRAP-UP groknight SuperGrok OAuth: ${used}% weekly (start 20%). Closing the speedrun entry. Fleet runs to 100%. Claim-ready ${claims.claim_ready_count} · expected $${claims.claim_ready_expected_usd}.`
      : `Live groknight SuperGrok OAuth: ${used}% weekly (start 20%). L1=${counts.l1_count} L2=${counts.l2_count}. Claim-ready ${claims.claim_ready_count} · expected $${claims.claim_ready_expected_usd}.`;
  const label = closed ? "closed" : wrapping ? "wrap" : "meter";
  run.timeline = [
    ...(run.timeline || []).slice(0, 40),
    { t: ts, label, note: `${used}% weekly · L1=${counts.l1_count} L2=${counts.l2_count} · claim-ready ${claims.claim_ready_count} / $${claims.claim_ready_expected_usd}` },
  ];
  curve.points.push({
    ts,
    pct: used,
    source: "omp_usage_xai-oauth",
    ...counts,
    claim_ready_count: claims.claim_ready_count,
    claim_ready_expected_usd: claims.claim_ready_expected_usd,
    elapsed_min: elapsedMin != null ? Math.round(elapsedMin * 100) / 100 : null,
  });
  writeFileSync(runPath, `${JSON.stringify(run, null, 2)}\n`);
  writeFileSync(curvePath, `${JSON.stringify(curve, null, 2)}\n`);

  try {
    sh("git", ["add", RUN_REL, CURVE_REL, "speedrun/data/manifest.json"], REPO);
    const dirty = sh("git", ["status", "--porcelain"], REPO).trim();
    if (dirty) {
      sh("git", ["-c", "commit.gpgsign=false", "commit", "-m", `speedrun: groknight ${used}% L1=${counts.l1_count} L2=${counts.l2_count} claims=${claims.claim_ready_count} $${claims.claim_ready_expected_usd}`], REPO);
      sh("git", ["push", "origin", "HEAD"], REPO);
      log("pushed", { used, ...counts, ...claims });
    } else {
      log("unchanged", { used, ...counts, claim_ready_count: claims.claim_ready_count });
    }
  } catch (error) {
    log("git_error", { error: String(error?.message ?? error).slice(0, 400) });
  }
  if (closed) {
    try {
      writeFileSync("/home/vgpnk/Projects/origin-work/ufo-fsd-alpha/.ufo/nightrun/groknight-halt.json", `${JSON.stringify({ ts, used, reason: "supergrok_weekly_100" }, null, 2)}\n`);
    } catch { /* */ }
    log("closed_exit", { used });
    process.exit(0);
  }
}

log("poller_start", { intervalMs: INTERVAL_MS, repo: REPO });
tick();
setInterval(() => {
  try { tick(); } catch (error) { log("tick_error", { error: String(error?.message ?? error).slice(0, 400) }); }
}, INTERVAL_MS);
