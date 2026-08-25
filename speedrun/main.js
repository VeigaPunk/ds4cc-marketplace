function el(id) {
  return document.getElementById(id);
}

async function loadJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

async function loadJsonSoft(path) {
  try {
    return await loadJson(path);
  } catch (err) {
    console.warn("speedrun skip", path, err);
    return null;
  }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function budgetCell(run) {
  if (run.budget_usd != null) return `$${run.budget_usd} paid`;
  return "paid · not a grant";
}

function clockCell(run) {
  if (run.status === "live" && run.metrics?.used_percent != null) {
    const unit = run.meter === "cursor_ultra_included_usage" ? "included" : "weekly";
    return `${run.metrics.used_percent}% ${unit} · ${run.duration || "live"}`;
  }
  if (run.status === "live" && run.metrics?.context_frac) {
    return `${run.metrics.context_frac} ctx`;
  }
  return run.duration || "—";
}

function renderTimeline(node, steps) {
  node.innerHTML = "";
  for (const step of steps || []) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${escapeHtml(step.label)}</strong> — ${escapeHtml(step.note)}`;
    node.appendChild(li);
  }
}

function renderFeatured(run) {
  const m = run.metrics || {};
  el("run-title").textContent = `${run.runner} — $${run.budget_usd} · ${run.duration} · ${run.provider}`;
  el("run-summary").textContent = run.summary;
  renderTimeline(el("run-timeline"), run.timeline);
  el("run-metrics").innerHTML = `
    <dt>provider</dt><dd>${escapeHtml(run.provider)}</dd>
    <dt>product</dt><dd>${escapeHtml(run.product)}</dd>
    <dt>account</dt><dd><code>${escapeHtml(run.account_hint || "—")}</code></dd>
    <dt>budget</dt><dd>$${m.budget_usd ?? run.budget_usd} USD paid — not a grant</dd>
    <dt>spent</dt><dd>$${m.spent_usd_approx ?? "?"} USD</dd>
    <dt>wall clock</dt><dd>${m.wall_clock_hours ?? "?"} hours</dd>
    <dt>mode</dt><dd>${escapeHtml(m.mode || "—")} · parallel: ${escapeHtml(m.parallelization || "—")}</dd>
    <dt>tokens</dt><dd>${m.tokens_total ?? "—"} <span class="muted">${escapeHtml(m.tokens_note || "")}</span></dd>
    <dt>outcome</dt><dd>${escapeHtml(m.outcome || run.status)}</dd>
  `;
  const links = run.links || {};
  el("run-links").innerHTML = Object.entries(links)
    .map(([k, href]) => `<a href="${escapeHtml(href)}" rel="noopener">${escapeHtml(k)}</a>`)
    .join(" · ");
}

function renderKimi(run) {
  const m = run.metrics || {};
  const snap = run.snapshot || {};
  const weekly = m.weekly_pct ?? snap.weekly_pct;
  const fiveh = m.fiveh_pct ?? snap.fiveh_pct;
  el("kimi-title").textContent = `${run.runner} — ${run.title}`;
  el("kimi-summary").textContent = run.summary;
  renderTimeline(el("kimi-timeline"), run.timeline);
  el("kimi-metrics").innerHTML = `
    <dt>status</dt><dd class="status-live">${escapeHtml(run.status)}</dd>
    <dt>model</dt><dd>${escapeHtml(m.model || run.product)}</dd>
    <dt>venue</dt><dd>${escapeHtml(run.venue)}</dd>
    <dt>context</dt><dd>${escapeHtml(m.context_pct)}% · ${escapeHtml(m.context_frac)}</dd>
    <dt>quota</dt><dd>weekly ${escapeHtml(weekly)}% · 5h ${escapeHtml(fiveh)}% · 5h cap ≈ 20% of weekly</dd>
    <dt>cron</dt><dd>LANDED · ${escapeHtml(m.cron_job || "01M0S354HTM81Q9NCNM36MSQAD")} · ${escapeHtml(m.cron_schedule || "11,41 * * * *")}</dd>
    <dt>paid</dt><dd>paid OAuth — not a grant</dd>
    <dt>turns</dt><dd>${escapeHtml(m.turns)}</dd>
    <dt>mode</dt><dd>${escapeHtml(m.mode)} · ${escapeHtml(m.parallelization)}</dd>
    <dt>snapshot</dt><dd>${escapeHtml(snap.ts || "—")}</dd>
  `;
}

function fmtTokens(n) {
  if (n == null) return "—";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(n);
}


function renderCurve(curve) {
  const pts = curve.points || [];
  if (!pts.length) return;
  const t0 = new Date(curve.t0).getTime();
  const xs = pts.map((p) => (new Date(p.ts).getTime() - t0) / 60000);
  const ys = pts.map((p) => p.pct);
  const maxX = Math.max(xs[xs.length - 1], 1);
  const maxY = 100;
  const x0 = 36, y0 = 16, x1 = 624, y1 = 196;
  const X = (x) => x0 + (x / maxX) * (x1 - x0);
  const Y = (y) => y1 - (y / maxY) * (y1 - y0);
  const line = pts
    .map((p, i) => `${i ? "L" : "M"}${X(xs[i]).toFixed(1)},${Y(ys[i]).toFixed(1)}`)
    .join(" ");
  const lastX = X(xs[xs.length - 1]);
  const lastY = Y(ys[ys.length - 1]);
  el("curve-line").setAttribute("d", line);
  el("curve-fill").setAttribute(
    "d",
    `${line} L${lastX.toFixed(1)},${y1} L${X(xs[0]).toFixed(1)},${y1} Z`
  );
  el("curve-dot").setAttribute("cx", lastX.toFixed(1));
  el("curve-dot").setAttribute("cy", lastY.toFixed(1));
}

function renderLiveStrip(run, curve) {
  const m = run.metrics || {};
  const pace = run.pace || {};
  const snap = run.snapshot || {};
  const pct = m.used_percent ?? curve?.points?.at(-1)?.pct ?? 0;
  const isCursor = run.id?.includes("cursor-ultra") || run.meter === "cursor_ultra_included_usage";
  el("live-title").textContent = `${run.runner} — ${run.title}`;
  el("live-summary").textContent = run.summary;
  el("live-pct").textContent = `${Number(pct).toFixed(1)}%`;
  el("hero-live-pct").textContent = `${Math.round(Number(pct))}%`;
  el("live-fill").style.width = `${Math.min(100, Number(pct) || 0)}%`;
  const eyebrow = el("live-eyebrow");
  if (eyebrow) {
    eyebrow.textContent = isCursor
      ? `${run.status} · cursor ultra included usage`
      : `${run.status} · oauth 20x oneshot`;
  }
  const meterLabel = el("live-meter-label");
  if (meterLabel) {
    meterLabel.textContent = isCursor
      ? "of Ultra included total usage · monthly cycle"
      : "of weekly 20x · window 10080 min";
  }
  const heroLiveLabel = el("hero-live-label");
  if (heroLiveLabel) {
    heroLiveLabel.textContent = isCursor ? "Cursor Ultra included" : "Codex 20x closed";
  }
  el("live-pace").textContent = `${pace.pct_per_min ?? m.pct_per_min ?? "—"}%/min · ${pace.elapsed_min_from_first_meter ?? "—"} min from first meter · ${pace.elapsed_min_from_session ?? m.elapsed_min_from_session ?? "—"} min from session`;
  el("live-eta").textContent = `${pace.eta_100_min ?? m.eta_100_min ?? "—"} min remaining`;
  const setRec = (id, ok) => {
    const rec = el(id);
    if (!rec) return;
    rec.textContent = ok ? "yes" : "no";
    rec.className = ok ? "yes" : "no";
  };
  setRec("live-record", pace.subhour_meter_ok ?? pace.subhour_ok ?? m.subhour_ok);
  setRec("live-record-session", pace.subhour_session_ok ?? m.subhour_session_ok);
  if (isCursor) {
    el("live-metrics").innerHTML = `
      <dt>status</dt><dd class="${run.status === "live" ? "status-live" : "status-closed"}">${escapeHtml(run.status)}</dd>
      <dt>plan</dt><dd>Ultra ${escapeHtml(m.plan_price || "$200/mo")} · included $${((m.included_limit_cents || 40000) / 100).toFixed(0)}</dd>
      <dt>meter</dt><dd>included total ${escapeHtml(Number(pct).toFixed(1))}% · auto ${escapeHtml(m.auto_percent_used ?? "—")}% · API ${escapeHtml(m.api_percent_used ?? "—")}%</dd>
      <dt>spend</dt><dd>total $${((m.total_spend_cents || 0) / 100).toFixed(2)} · included $${((m.included_spend_cents || 0) / 100).toFixed(2)} · bonus $${((m.bonus_spend_cents || 0) / 100).toFixed(2)}</dd>
      <dt>API savings</dt><dd>$${escapeHtml(m.ultra_api_savings_usd_this_month ?? 1515)} saved this month (Ultra UI)</dd>
      <dt>swarm</dt><dd>${escapeHtml(m.swarm_running)} run · ${escapeHtml(m.swarm_finished)} fin · ${escapeHtml(m.swarm_error)} err · n=${escapeHtml(m.swarm_n)}</dd>
      <dt>model</dt><dd>${escapeHtml(m.model || m.linked_bc_model)}</dd>
      <dt>category</dt><dd>oneshot · /goal + mid-run steer · self-clone forking</dd>
      <dt>repo</dt><dd>${escapeHtml(m.repo || run.repository?.full_name || "—")}</dd>
      <dt>venue</dt><dd>${escapeHtml(run.venue)}</dd>
      <dt>paid</dt><dd>paid Cursor Ultra (gravy train) OAuth — SuperGrok Heavy grant (incl. for free)</dd>
      <dt>snapshot</dt><dd>${escapeHtml(snap.ts || "—")}</dd>
    `;
    const repoOut = el("codex-repo-out");
    if (repoOut) {
      repoOut.href = run.links?.origin_repo || run.links?.agent || "#";
      repoOut.textContent = "ufo-fsd-alpha · live agent";
    }
    const promptBtn = el("oneshot-prompt-btn");
    if (promptBtn) {
      const href =
        run.links?.oneshot_prompt ||
        run.artifacts?.oneshot_prompt_html ||
        "data/artifacts/oneshot-prompt-cursor-ultra-ufo-core-2026-08-25.html";
      promptBtn.href = href;
      promptBtn.textContent = "oneshot prompt + steer";
    }
  } else {
    el("live-metrics").innerHTML = `
      <dt>model</dt><dd>${escapeHtml(m.model)}</dd>
      <dt>category</dt><dd>oneshot</dd>
      <dt>meter</dt><dd>weekly ${escapeHtml(m.window_minutes)} min · not monthly 100%</dd>
      <dt>plan</dt><dd>${escapeHtml(m.plan_type)}</dd>
      <dt>tokens</dt><dd>${fmtTokens(m.tokens_total)} <span class="muted">cached ${fmtTokens(m.tokens_cached_input)}</span></dd>
      <dt>rollouts</dt><dd>${escapeHtml(m.n_rollouts)}</dd>
      <dt>host load</dt><dd>~${escapeHtml(m.approx_cores)} cores · ${escapeHtml(m.rss_gb)} GB RSS</dd>
      <dt>venue</dt><dd>${escapeHtml(run.venue)}</dd>
      <dt>paid</dt><dd>paid Pro OAuth — not a grant</dd>
      <dt>snapshot</dt><dd>${escapeHtml(run.snapshot?.ts || "—")}</dd>
    `;
  }
  if (curve) renderCurve(curve);
}

function renderBoard(runs) {
  el("hero-n-runs").textContent = String(runs.length);
  el("board-body").innerHTML = runs
    .map((run, i) => {
      const m = run.metrics || {};
      const st = run.status === "live" ? "status-live" : "status-closed";
      return `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(run.runner)}</td>
        <td>${escapeHtml(run.provider || "—")}</td>
        <td>${escapeHtml(budgetCell(run))}</td>
        <td>${escapeHtml(clockCell(run))}</td>
        <td>${escapeHtml(m.mode || "—")} / ${escapeHtml(m.parallelization || "—")}</td>
        <td class="${st}">${escapeHtml(run.status)}</td>
      </tr>`;
    })
    .join("");
}

async function main() {
  const manifest = await loadJson("data/manifest.json");
  const loaded = await Promise.all(
    (manifest.runs || []).map(async (path) => ({ path, run: await loadJsonSoft(path) }))
  );
  const runs = loaded.map((row) => row.run).filter(Boolean);
  if (runs.length) renderBoard(runs);

  const byId = Object.fromEntries(runs.map((r) => [r.id, r]));
  const featured = byId[manifest.featured_run_id] || runs[0];
  if (featured) renderFeatured(featured);

  const kimi = byId["veigapunk-kimi-vivace-oauth-2026-08-24"];
  if (kimi) renderKimi(kimi);

  const liveId = manifest.live_strip_run_id || "veigapunk-cursor-ultra-ufo-core-2026-08-25";
  const liveRun = byId[liveId];
  const curve = await loadJsonSoft(
    liveRun?.curve ||
      (liveId.includes("cursor-ultra")
        ? "data/cursor-ultra-curve.json"
        : "data/codex-curve.json")
  );
  if (liveRun) renderLiveStrip(liveRun, curve);
}

main().catch((err) => {
  if (el("run-summary")) el("run-summary").textContent = `Failed to load board: ${err.message}`;
});
