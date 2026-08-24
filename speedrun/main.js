function el(id) {
  return document.getElementById(id);
}

async function loadJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function budgetCell(run) {
  if (run.budget_usd != null) return `$${run.budget_usd}`;
  return run.budget_note ? "OAuth grant" : "—";
}

function clockCell(run) {
  if (run.status === "live" && run.metrics?.used_percent != null) {
    return `${run.metrics.used_percent}% · ${run.duration || "live"}`;
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
    <dt>budget</dt><dd>$${m.budget_usd ?? run.budget_usd} USD</dd>
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
    <dt>quota</dt><dd>weekly ${escapeHtml(weekly)}% · 5h ${escapeHtml(fiveh)}%${
      Number(fiveh) >= 99 && weekly != null
        ? ` · 5h-full ≈ ${escapeHtml(weekly)}% of weekly (~20%)`
        : ""
    }</dd>
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

function renderCodex(run, curve) {
  const m = run.metrics || {};
  const pace = run.pace || {};
  const pct = m.used_percent ?? curve?.points?.at(-1)?.pct ?? 0;
  el("live-title").textContent = `${run.runner} — ${run.title}`;
  el("live-summary").textContent = run.summary;
  el("live-pct").textContent = `${pct}%`;
  el("hero-live-pct").textContent = `${pct}%`;
  el("live-fill").style.width = `${Math.min(100, Number(pct) || 0)}%`;
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
  el("live-metrics").innerHTML = `
    <dt>model</dt><dd>${escapeHtml(m.model)}</dd>
    <dt>plan</dt><dd>${escapeHtml(m.plan_type)} · ${escapeHtml(m.window_minutes)} min window</dd>
    <dt>tokens</dt><dd>${fmtTokens(m.tokens_total)} <span class="muted">cached ${fmtTokens(m.tokens_cached_input)}</span></dd>
    <dt>rollouts</dt><dd>${escapeHtml(m.n_rollouts)}</dd>
    <dt>host load</dt><dd>~${escapeHtml(m.approx_cores)} cores · ${escapeHtml(m.rss_gb)} GB RSS</dd>
    <dt>venue</dt><dd>${escapeHtml(run.venue)}</dd>
    <dt>snapshot</dt><dd>${escapeHtml(run.snapshot?.ts || "—")}</dd>
  `;
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

async function loadJsonSoft(path) {
  try {
    return await loadJson(path);
  } catch (err) {
    console.warn("speedrun skip", path, err);
    return null;
  }
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

  const liveId = manifest.live_strip_run_id || "veigapunk-codex-ultra-oauth-20x-2026-08-24";
  const codex = byId[liveId];
  const curve = await loadJsonSoft(codex?.curve || "data/codex-curve.json");
  if (codex) renderCodex(codex, curve);
}

main().catch((err) => {
  if (el("run-summary")) el("run-summary").textContent = `Failed to load board: ${err.message}`;
});
