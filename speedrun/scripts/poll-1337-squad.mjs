#!/usr/bin/env node
// 5-min live poller for the 1337-squad speedrun on ds4cc.com/speedrun.
//
// Meters, all read locally, never fabricated:
//   1. Grok Bot weekly usage meter  — scraped from the running Grok Bot desktop
//      app over CDP (127.0.0.1:9333); the account-menu item "Weekly usage NN%".
//   2. Alibaba Token Plan credits   — `ai-usage probe token-plan` refreshes the
//      local cache; credits are converted at the observed Credit Pack rate
//      (40,000 credits = $30).
//   3. SWE-2                         — unmetered (operator-attested). The Devin
//      weekly meter is reported as observed next to it, never as a spend limit.
//   4. L1 / L2 fleet counts          — `ufo-sighting status` on the ufo-fsd wall.
//   5. Squad telemetry               — bots seen in the app sidebar, staged
//      drafts, verdict files, and the readiness-board queue rows by verdict.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, appendFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const UFO = "/home/vgpnk/Projects/origin-work/ufo-fsd-alpha";
const AI_USAGE = "/home/vgpnk/Projects/omarchy-usage-tray/bin/ai-usage";
const AI_USAGE_CACHE = "/home/vgpnk/.cache/ai-usage/status.json";
const GROKNIGHT = "/home/vgpnk/Projects/groknight";
const CDP = "http://127.0.0.1:9333";
const RUN_REL = "speedrun/data/run-1337-squad-2026-09-16.json";
const CURVE_REL = "speedrun/data/1337-squad-curve.json";
const LOG = join(UFO, ".ufo/nightrun/speedrun-poller-1337-squad.log");
const INTERVAL_MS = 5 * 60 * 1000;
const USD_PER_CREDIT = 0.00075; // 40,000 credits = $30 (Credit Pack)

function log(event, extra = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), event, ...extra });
  try { appendFileSync(LOG, line + "\n"); } catch { /* best effort */ }
  process.stdout.write(line + "\n");
}

function sh(cmd, args, cwd, timeout = 60_000) {
  return execFileSync(cmd, args, { cwd, encoding: "utf8", timeout, maxBuffer: 8 * 1024 * 1024 });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Minimal CDP client over the app's debug port. Returns null when the app is absent. */
async function cdpEvaluate(expression, timeoutMs = 20_000) {
  const res = await fetch(`${CDP}/json/list`, { signal: AbortSignal.timeout(5000) });
  const targets = await res.json();
  const page = targets.find((t) => t.type === "page" && /index\.html/.test(t.url || ""));
  if (!page?.webSocketDebuggerUrl) return null;

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  const pending = new Map();
  let nextId = 0;
  const closed = new Promise((resolve) => { ws.onclose = resolve; });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("cdp connect timeout")), 8000);
    ws.onopen = () => { clearTimeout(timer); resolve(); };
    ws.onerror = () => { clearTimeout(timer); reject(new Error("cdp connect error")); };
  });
  ws.onmessage = (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    const settle = pending.get(msg.id);
    if (settle) { pending.delete(msg.id); settle(msg); }
  };
  const send = (method, params) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timeout`)); }, timeoutMs);
    pending.set(id, (msg) => { clearTimeout(timer); resolve(msg); });
    ws.send(JSON.stringify({ id, method, params }));
  });

  try {
    await send("Runtime.enable", {});
    const out = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    return out?.result?.result?.value ?? null;
  } finally {
    try { ws.close(); } catch { /* */ }
    await Promise.race([closed, new Promise((r) => setTimeout(r, 500))]);
  }
}

// The app's account menu carries the free-tier meter. Open it only when absent,
// read the item, then close it so we never leave the operator's UI hijacked.
const GROKBOT_READ = `(async () => {
  const meter = () => [...document.querySelectorAll('li')]
    .find(e => /^Weekly usage\\s*\\d+%$/.test((e.textContent || '').trim()));
  let li = meter();
  let opened = false;
  if (!li) {
    const btn = document.querySelector('[aria-label="Open account menu"]');
    if (btn) { btn.click(); opened = true; await new Promise(r => setTimeout(r, 1200)); li = meter(); }
  }
  const m = li ? (li.textContent || '').trim().match(/^Weekly usage\\s*(\\d+)%$/) : null;
  const bots = [...document.querySelectorAll('button')]
    .map(b => (b.getAttribute('aria-label') || '').trim())
    .filter(n => /^GROKNIGHT-/.test(n));
  if (opened) {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const el = document.querySelector('[aria-label="Open account menu"]');
    if (el) el.click();
  }
  return { percent: m ? Number(m[1]) : null, raw: li ? li.textContent.trim() : null, bots };
})()`;

async function grokBotMeter() {
  try {
    const out = await cdpEvaluate(GROKBOT_READ);
    if (!out) return { available: false, note: "Grok Bot app not answering on CDP 9333" };
    const bots = out.bots || [];
    const active = bots.filter((b) => /working/i.test(b)).length;
    return {
      available: true,
      weekly_percent: out.percent,
      raw: out.raw,
      bots_seen: bots.length,
      bots_working: active,
      bots: bots.map((b) => b.split(",")[0].trim()),
      source: "grokbot_app_cdp_account_menu",
    };
  } catch (error) {
    return { available: false, note: `grokbot scrape failed: ${String(error?.message ?? error).slice(0, 160)}` };
  }
}

function tokenPlan() {
  try { sh(AI_USAGE, ["probe", "token-plan"], HERE, 90_000); } catch { /* fall back to cached bytes */ }
  try {
    const cache = readJson(AI_USAGE_CACHE);
    const tp = cache.providers?.["token-plan"];
    if (!tp) return null;
    const credits = tp.credits || {};
    const snaps = tp.account_usage || [];
    const total = typeof credits.total === "number" ? credits.total : snaps.reduce((n, s) => n + (s.credits_total || 0), 0);
    const used = typeof credits.used === "number" ? credits.used : snaps.reduce((n, s) => n + (s.credits_used || 0), 0);
    const remaining = typeof credits.remaining === "number" ? credits.remaining : total - used;
    const round = (n) => (typeof n === "number" ? Math.round(n * 100) / 100 : null);
    return {
      credits_total: round(total),
      credits_used: round(used),
      credits_remaining: round(remaining),
      used_percent: total > 0 ? Math.round((used / total) * 10000) / 100 : null,
      remaining_usd: round(remaining * USD_PER_CREDIT),
      used_usd: round(used * USD_PER_CREDIT),
      total_usd: round(total * USD_PER_CREDIT),
      snapshots: snaps.map((s) => ({
        credits_total: s.credits_total,
        credits_used: s.credits_used,
        credits_remaining: s.credits_remaining,
        used_pct: s.used_pct,
        resets_at: s.resets_at,
      })),
      measured_at: tp.measured_at || null,
      id: tp.identity?.id || null,
      source: "ai_usage_token_plan_cache",
    };
  } catch (error) {
    return { error: String(error?.message ?? error).slice(0, 160) };
  }
}

function ompUsage() {
  const out = { devin_weekly_percent: null, token_plan_credit_pack_percent: null, supergrok_weekly_percent: null };
  try {
    const d = JSON.parse(sh("omp", ["usage", "--json"], UFO));
    for (const r of d.reports || []) {
      const pick = (re) => (r.limits || []).find((l) => re.test(l.label || ""));
      if (r.provider === "devin") {
        const lim = pick(/weekly/i);
        const used = lim?.amount?.used;
        if (typeof used === "number") out.devin_weekly_percent = used;
      }
      if (r.provider === "alibaba-token-plan") {
        const lim = pick(/credit pack/i);
        if (typeof lim?.amount?.used === "number") {
          // three identities report; the highest is the pack that carries the run
          out.token_plan_credit_pack_percent = Math.max(out.token_plan_credit_pack_percent ?? 0, lim.amount.used);
        }
      }
      if (r.provider === "xai-oauth") {
        const lim = pick(/weekly/i);
        const used = lim?.amount?.used;
        if (typeof used === "number") out.supergrok_weekly_percent = used;
      }
    }
  } catch { /* leave nulls */ }
  return out;
}

function fleetCounts() {
  try {
    const d = JSON.parse(sh("bash", ["scripts/ufo-sighting", "status"], UFO));
    const missions = d.missions || [];
    const live = missions.filter((m) => m.phase === "working");
    const byFleet = {};
    for (const m of live) {
      const f = m.fleet || "default";
      byFleet[f] = byFleet[f] || { l1: 0, l2: 0 };
      byFleet[f].l1 += 1;
      byFleet[f].l2 += m.levels?.l2 || 0;
    }
    return {
      l1_count: live.length,
      l2_count: live.reduce((n, m) => n + (m.levels?.l2 || 0), 0),
      wall_l1_count: d.levels?.l1 ?? null,
      wall_l2_count: d.levels?.l2 ?? null,
      l3_count: d.levels?.l3 ?? null,
      by_fleet: byFleet,
    };
  } catch {
    return { l1_count: null, l2_count: null, wall_l1_count: null, wall_l2_count: null, l3_count: null, by_fleet: {} };
  }
}

/** Squad outputs: staged drafts, verdict files, and readiness-board queue rows. */
function squad() {
  const out = { draft_packages: null, verdict_files: null, queue: null, queue_rows: [] };
  try {
    out.draft_packages = readdirSync(join(GROKNIGHT, "drafts"), { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("_")).length;
  } catch { /* */ }
  try {
    out.verdict_files = readdirSync(join(GROKNIGHT, "review")).filter((n) => n.endsWith(".verdict.md")).length;
  } catch { /* */ }
  try {
    const board = readFileSync(join(GROKNIGHT, "intel", "readiness-board.md"), "utf8");
    const rows = board.split("\n").filter((l) => /^\|\s*Q\d+\s*\|/.test(l));
    const parsed = rows.map((line) => {
      const cells = line.split("|").map((c) => c.trim());
      const verdictCell = cells[5] || "";
      let verdict = "OTHER";
      if (/HARD_STOP/.test(verdictCell)) verdict = "HARD_STOP";
      else if (/BLOCKED/.test(verdictCell)) verdict = "BLOCKED";
      else if (/READY_WITH_NITS/.test(verdictCell)) verdict = "READY_WITH_NITS";
      else if (/READY/.test(verdictCell)) verdict = "READY";
      return { id: cells[1], package: cells[2], platform: cells[3], value: cells[4], verdict };
    });
    const tally = parsed.reduce((acc, r) => { acc[r.verdict] = (acc[r.verdict] || 0) + 1; return acc; }, {});
    out.queue_rows = parsed;
    out.queue = {
      total: parsed.length,
      by_verdict: tally,
      ready_total: (tally.READY || 0) + (tally.READY_WITH_NITS || 0),
      blocked_total: (tally.BLOCKED || 0) + (tally.HARD_STOP || 0),
    };
  } catch { /* */ }
  return out;
}

async function tick() {
  const ts = new Date().toISOString();
  const runPath = join(REPO, RUN_REL);
  const curvePath = join(REPO, CURVE_REL);
  const run = readJson(runPath);
  const curve = readJson(curvePath);
  const start = Date.parse(run.session_start);
  const elapsedMin = Number.isFinite(start) ? (Date.now() - start) / 60000 : null;

  const grokbot = await grokBotMeter();
  const tp = tokenPlan();
  const omp = ompUsage();
  const counts = fleetCounts();
  const sq = squad();

  const gbStart = run.metrics.grokbot_start_percent ?? grokbot.weekly_percent ?? null;
  const gbBurned = grokbot.weekly_percent != null && gbStart != null
    ? grokbot.weekly_percent - gbStart : null;
  const tpStart = run.metrics.token_plan_credits_used_start ?? tp?.credits_used ?? null;
  const tpBurned = tp?.credits_used != null && tpStart != null
    ? Math.round((tp.credits_used - tpStart) * 100) / 100 : null;

  run.status = "live";
  run.meter = run.meter || "1337_squad";
  run.duration = elapsedMin != null ? `live · ${elapsedMin.toFixed(1)} min` : "live";
  run.metrics = {
    ...run.metrics,
    used_percent: grokbot.weekly_percent,
    tp_weekly_pct: tp?.used_percent ?? null,
    tp_meter: "token_plan_credits",
    grokbot_start_percent: gbStart,
    grokbot_weekly_percent: grokbot.weekly_percent,
    grokbot_burned: gbBurned,
    grokbot_bots_seen: grokbot.bots_seen ?? null,
    grokbot_bots_working: grokbot.bots_working ?? null,
    token_plan_credits_used_start: tpStart,
    token_plan_credits_total: tp?.credits_total ?? null,
    token_plan_credits_used: tp?.credits_used ?? null,
    token_plan_credits_remaining: tp?.credits_remaining ?? null,
    token_plan_used_percent: tp?.used_percent ?? null,
    token_plan_remaining_usd: tp?.remaining_usd ?? null,
    token_plan_burned_credits: tpBurned,
    token_plan_credit_pack_percent: omp.token_plan_credit_pack_percent,
    swe2_mode: "unmetered (operator-attested)",
    swe2_devin_weekly_percent: omp.devin_weekly_percent,
    supergrok_weekly_percent: omp.supergrok_weekly_percent,
    l1_count: counts.l1_count,
    l2_count: counts.l2_count,
    l3_count: counts.l3_count,
    wall_l1_count: counts.wall_l1_count,
    wall_l2_count: counts.wall_l2_count,
    elapsed_min_from_session: elapsedMin != null ? Math.round(elapsedMin * 100) / 100 : null,
    draft_packages: sq.draft_packages,
    verdict_files: sq.verdict_files,
    queue_total: sq.queue?.total ?? null,
    queue_ready: sq.queue?.ready_total ?? null,
    queue_blocked: sq.queue?.blocked_total ?? null,
    outcome: "live",
  };
  run.squad = {
    bots: grokbot.bots || null,
    bots_working: grokbot.bots_working ?? null,
    queue: sq.queue,
    queue_rows: sq.queue_rows,
  };
  run.meters = {
    grokbot,
    token_plan: tp,
    swe2: { mode: "unmetered (operator-attested)", devin_weekly_percent: omp.devin_weekly_percent },
    supergrok_weekly_percent: omp.supergrok_weekly_percent,
  };
  run.fleet = { by_fleet: counts.by_fleet, wall_l1: counts.wall_l1_count, wall_l2: counts.wall_l2_count };
  run.snapshot = { ts, ...run.metrics };
  run.summary = `LIVE 1337-squad: Grok Bot weekly ${grokbot.weekly_percent ?? "?"}% · Token Plan ${tp?.credits_remaining ?? "?"} credits left ($${tp?.remaining_usd ?? "?"} of $${tp?.total_usd ?? "?"} observed pool) · SWE-2 unmetered. L1=${counts.l1_count} L2=${counts.l2_count}. Squad: ${grokbot.bots_seen ?? "?"} bots · ${sq.queue?.ready_total ?? "?"}/${sq.queue?.total ?? "?"} queue rows ready.`;
  run.timeline = [
    ...(run.timeline || []).slice(0, 60),
    {
      t: ts,
      label: "meter",
      note: `GrokBot ${grokbot.weekly_percent ?? "?"}% weekly · TP ${tp?.credits_remaining ?? "?"}/${tp?.credits_total ?? "?"} credits · L1=${counts.l1_count} L2=${counts.l2_count} · ready ${sq.queue?.ready_total ?? "?"}/${sq.queue?.total ?? "?"}`,
    },
  ];

  curve.points.push({
    ts,
    pct: grokbot.weekly_percent,
    source: "grokbot_app_cdp",
    token_plan_credits_remaining: tp?.credits_remaining ?? null,
    token_plan_credits_used: tp?.credits_used ?? null,
    swe2_mode: "unmetered",
    devin_weekly_percent: omp.devin_weekly_percent,
    l1_count: counts.l1_count,
    l2_count: counts.l2_count,
    wall_l1_count: counts.wall_l1_count,
    wall_l2_count: counts.wall_l2_count,
    queue_ready: sq.queue?.ready_total ?? null,
    queue_total: sq.queue?.total ?? null,
    elapsed_min: elapsedMin != null ? Math.round(elapsedMin * 100) / 100 : null,
  });

  writeFileSync(runPath, `${JSON.stringify(run, null, 2)}\n`);
  writeFileSync(curvePath, `${JSON.stringify(curve, null, 2)}\n`);

  try {
    sh("git", ["add", RUN_REL, CURVE_REL, "speedrun/data/manifest.json"], REPO);
    const staged = sh("git", ["diff", "--cached", "--name-only"], REPO).trim();
    if (staged) {
      sh("git", ["-c", "commit.gpgsign=false", "commit", "-m", `speedrun: 1337-squad grokbot=${grokbot.weekly_percent}% tp_left=${tp?.credits_remaining} L1=${counts.l1_count} L2=${counts.l2_count} ready=${sq.queue?.ready_total}/${sq.queue?.total}`], REPO);
      sh("git", ["push", "origin", "HEAD"], REPO);
      log("pushed", { grokbot: grokbot.weekly_percent, tp_left: tp?.credits_remaining, ...counts, ready: sq.queue?.ready_total });
    } else {
      log("unchanged");
    }
  } catch (error) {
    log("git_error", { error: String(error?.message ?? error).slice(0, 400) });
  }

  log("tick", {
    grokbot: grokbot.weekly_percent,
    tp_remaining: tp?.credits_remaining,
    l1: counts.l1_count,
    l2: counts.l2_count,
    bots: grokbot.bots_seen,
    ready: sq.queue?.ready_total,
  });
}

const once = process.argv.includes("--once");
log("poller_start", { intervalMs: INTERVAL_MS, repo: REPO, once });
try { await tick(); } catch (error) { log("tick_error", { error: String(error?.message ?? error).slice(0, 400) }); }
if (!once) {
  setInterval(() => {
    tick().catch((error) => log("tick_error", { error: String(error?.message ?? error).slice(0, 400) }));
  }, INTERVAL_MS);
}