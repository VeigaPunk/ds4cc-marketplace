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

/** Strip bc-/UUID/git-sha/cron-id noise from human-facing copy. */
function scrubIds(s) {
  return String(s ?? "")
    .replace(/\bbc-[a-f0-9-]{8,}\b/gi, "")
    .replace(/\bprompt[_\s-]?group\s*[a-f0-9-]{8,}\b/gi, "")
    .replace(/\b01[A-Z0-9]{20,}\b/g, "")
    .replace(/\btmp-[a-f0-9]+\b/gi, "tmp repo")
    .replace(/\b[0-9a-f]{7,40}\b/gi, "")
    .replace(/\s*[·•|]\s*(?=[·•|])/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*[·•]\s*$/g, "")
    .replace(/^\s*[·•]\s*/g, "")
    .replace(/\s+,/g, ",")
    .trim()
    .replace(/^[\s·•|-]+|[\s·•|-]+$/g, "");
}

function humanVenue(run) {
  return scrubIds(run.display_venue || run.venue) || "—";
}

function budgetCell(run) {
  if (run.budget_usd != null) return `$${run.budget_usd} paid`;
  return "paid · not a grant";
}

function fmtHours(h) {
  if (h == null || Number.isNaN(Number(h))) return "—";
  const n = Number(h);
  if (n >= 48 && n % 24 < 0.5) return `~${Math.round(n / 24)}d`;
  return n < 10 ? `~${n.toFixed(1)}h` : `~${Math.round(n)}h`;
}

function fmtUsd(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `$${Math.round(Number(n)).toLocaleString("en-US")}`;
}

function totalSavedDisplay(run) {
  const ts = run.total_saved || {};
  return ts.display_usd ?? ts.api_savings_usd_complete_burn ?? run.metrics?.ultra_api_savings_usd_this_month;
}

function totalSavedLatest(run) {
  const ts = run.total_saved || {};
  return ts.api_savings_usd_latest ?? ts.api_savings_usd_at_close ?? run.metrics?.ultra_api_savings_usd_this_month;
}

function totalSavedLatestMult(run) {
  const ts = run.total_saved || {};
  return ts.multiple_vs_99_mint_latest ?? ts.multiple_vs_99_mint_at_close ?? run.metrics?.api_credit_multiple_vs_99;
}

function completeBurnHours(run) {
  const bc = run.burn_clock || {};
  return bc.complete_burn_hours ?? bc.monthly_included_burn_hours_display ?? bc.monthly_included_burn_hours_operator;
}

function mintToBurnLabel(run) {
  const h = completeBurnHours(run);
  return h != null ? `${fmtHours(h)} complete burn` : null;
}

function clockCell(run) {
  if (run.metrics?.used_percent != null && run.meter === "cursor_ultra_included_usage") {
    const burn = mintToBurnLabel(run);
    const saved = totalSavedDisplay(run);
    const pct = `${run.metrics.used_percent}% included`;
    const savedLbl = saved ? `${fmtUsd(saved)} saved` : null;
    return [burn, savedLbl, pct].filter(Boolean).join(" · ");
  }
  if (run.status === "live" && run.metrics?.used_percent != null) {
    return `${run.metrics.used_percent}% weekly · ${run.duration || "live"}`;
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
    const label = scrubIds(step.label);
    const note = scrubIds(step.note);
    li.innerHTML = `<strong>${escapeHtml(label)}</strong>${note ? ` — ${escapeHtml(note)}` : ""}`;
    node.appendChild(li);
  }
}

function renderFeatured(run) {
  const m = run.metrics || {};
  el("run-title").textContent = `${run.runner} — $${run.budget_usd} · ${run.duration} · ${run.provider}`;
  el("run-summary").textContent = scrubIds(run.summary);
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
  const pct = m.used_percent ?? m.tp_weekly_pct ?? curve?.points?.at(-1)?.pct ?? 0;
  const bc = run.burn_clock || {};
  const completeH = completeBurnHours(run);
  const mintBurnH = completeH;
  const isCursor = run.id?.includes("cursor-ultra") || run.meter === "cursor_ultra_included_usage";
  const isTp = run.meter === "token_plan_weekly";
  el("live-title").textContent = `${run.runner} — ${run.title}`;
  el("live-summary").textContent = scrubIds(run.summary);
  el("live-pct").textContent = `${Number(pct).toFixed(1)}%`;
  el("hero-live-pct").textContent = `${Math.round(Number(pct))}%`;
  el("live-fill").style.width = `${Math.min(100, Number(pct) || 0)}%`;
  const mintBurnEl = el("live-mint-burn");
  if (mintBurnEl && mintBurnH != null) mintBurnEl.textContent = `${fmtHours(mintBurnH)} complete burn`;
  const savedEl = el("live-total-saved");
  if (savedEl) {
    const savedComplete = totalSavedDisplay(run);
    const savedLatest = totalSavedLatest(run);
    const mult = run.total_saved?.multiple_vs_99_mint_complete_burn;
    const multLatest = totalSavedLatestMult(run);
    savedEl.textContent = savedComplete
      ? `${fmtUsd(savedComplete)} @ complete burn${mult ? ` (${mult}× $99)` : ""} · ${fmtUsd(savedLatest)} latest probe${multLatest ? ` (${multLatest}× $99)` : ""}`
      : fmtUsd(savedLatest);
  }
  const eyebrow = el("live-eyebrow");
  if (eyebrow) {
    eyebrow.textContent = isCursor
      ? `${run.status} · cursor ultra included usage`
      : isTp
        ? `${run.status} · token plan weekly`
        : `${run.status} · oauth 20x oneshot`;
  }
  const meterLabel = el("live-meter-label");
  if (meterLabel) {
    meterLabel.textContent = isCursor
      ? "of Ultra included total usage · monthly cycle"
      : isTp ? "of Token Plan weekly quota · waybar chip" : "of weekly 20x · window 10080 min";
  }
  const heroLiveLabel = el("hero-live-label");
  if (heroLiveLabel) {
    heroLiveLabel.textContent = isCursor ? "Cursor Ultra included" : isTp ? "Token Plan weekly" : "Codex 20x closed";
  }
  const closed = run.status !== "live";
  const pacePct = pace.pct_per_min ?? m.pct_per_min;
  const paceParts = [
    completeH != null ? `${fmtHours(completeH)} complete burn (mint→100% included monthly)` : null,
    bc.elapsed_hours_at_close != null
      ? `${fmtHours(bc.elapsed_hours_at_close)} measured at close (${bc.included_pct_at_close ?? pct}% included · 24h wall harvest)`
      : null,
    bc.complete_burn_hours_linear != null ? `${fmtHours(bc.complete_burn_hours_linear)} linear extrap` : null,
    pacePct != null ? `${pacePct}%/min` : null,
    isTp ? `${m.dispatches_disclosed ?? "—"} dispatches disclosed · ${m.seats ?? "—"} seats` : null,
  ].filter(Boolean);
  el("live-pace").textContent = paceParts.length ? paceParts.join(" · ") : "—";
  el("live-eta").textContent = closed
    ? completeH != null && bc.complete_burn_ts
      ? `complete burn ${fmtHours(completeH)} · projected ${bc.complete_burn_ts.replace("T", " ").replace("Z", " UTC")} · closed early @ ${bc.included_pct_at_close ?? pct}%`
      : "n/a · run closed (24h wall)"
    : (pace.eta_100_min ?? m.eta_100_min) != null
      ? `${pace.eta_100_min ?? m.eta_100_min} min remaining`
      : isTp
        ? `offpeak window ~2h · closes ${m.window_close ?? "~00:56Z"}`
        : "—";
  const setRec = (id, ok) => {
    const rec = el(id);
    if (!rec) return;
    rec.textContent = ok ? "yes" : "no";
    rec.className = ok ? "yes" : "no";
  };
  setRec("live-record", pace.subhour_meter_ok ?? pace.subhour_ok ?? m.subhour_ok);
  setRec("live-record-session", pace.subhour_session_ok ?? m.subhour_session_ok);
  if (isTp) {
    for (const recId of ["live-record", "live-record-session"]) {
      const recEl = el(recId);
      if (recEl) { recEl.textContent = "n/a"; recEl.className = ""; }
    }
    const mintRow = el("live-mint-burn")?.closest(".pace-row");
    if (mintRow) mintRow.innerHTML = `offpeak window <strong>~2h</strong> <span class="muted">2026-08-27 22:56Z → ~00:56Z · Token Plan low-TPS lanes</span>`;
    const savedRow = el("live-total-saved")?.closest(".pace-row");
    if (savedRow) savedRow.innerHTML = `budget <strong><a href="https://www.alibabacloud.com/campaign/benefits?referral_code=A927SY" target="_blank" rel="sponsored nofollow noopener">Token Plan pro (paid)</a></strong> <span class="muted">fresh third key · no usage-limit 5h · L0 kimi dispatch tax only · benefits link is a referral (A927SY, disclosed)</span>`;
  }
  if (isCursor) {
    el("live-metrics").innerHTML = `
      <dt>status</dt><dd class="${run.status === "live" ? "status-live" : "status-closed"}">${escapeHtml(run.status)}</dd>
      <dt>plan</dt><dd>Ultra ${escapeHtml(m.plan_price || "$200/mo")} · included $${((m.included_limit_cents || 40000) / 100).toFixed(0)}</dd>
      <dt>meter</dt><dd>included total ${escapeHtml(Number(pct).toFixed(1))}% · auto ${escapeHtml(m.auto_percent_used ?? "—")}% · API ${escapeHtml(m.api_percent_used ?? "—")}%</dd>
      <dt>spend</dt><dd>total $${((m.total_spend_cents || 0) / 100).toFixed(2)} · included $${((m.included_spend_cents || 0) / 100).toFixed(2)} · bonus $${((m.bonus_spend_cents || 0) / 100).toFixed(2)}</dd>
      <dt>total saved</dt><dd>${escapeHtml(fmtUsd(totalSavedDisplay(run)))} projected @ complete burn (${escapeHtml(run.total_saved?.multiple_vs_99_mint_complete_burn ?? "—")}× $99) · ${escapeHtml(fmtUsd(totalSavedLatest(run)))} latest probe (${escapeHtml(totalSavedLatestMult(run) ?? "—")}× $99 · ${escapeHtml(run.total_saved?.probe_ts ?? "—")})</dd>
      <dt>swarm</dt><dd>${escapeHtml(m.swarm_running)} run · ${escapeHtml(m.swarm_finished)} fin · ${escapeHtml(m.swarm_error)} err · n=${escapeHtml(m.swarm_n)}</dd>
      <dt>churn</dt><dd>${escapeHtml(m.swarm_sum_lines_added ?? "—")} lines · ${escapeHtml(m.swarm_sum_files_changed ?? "—")} files (sum peers)</dd>
      <dt>mint</dt><dd>${escapeHtml(bc.mint_ts ?? run.session_start ?? "—")}</dd>
      <dt>complete burn</dt><dd>${escapeHtml(fmtHours(completeH))} mint→100% included monthly · projected ${escapeHtml(bc.complete_burn_ts ?? "—")} · linear ${escapeHtml(fmtHours(bc.complete_burn_hours_linear))}</dd>
      <dt>measured close</dt><dd>${escapeHtml(fmtHours(bc.elapsed_hours_at_close))} @ ${escapeHtml(bc.included_pct_at_close ?? "—")}% included (24h wall harvest)</dd>
      <dt>API pool</dt><dd>100% @ ${escapeHtml(fmtHours(bc.mint_to_api_100_hours))} from mint (${escapeHtml(bc.api_100_ts ?? "—")})</dd>
      <dt>wall</dt><dd>freeze ≥1440 min · close ${escapeHtml(m.elapsed_min_from_session ?? "—")} min</dd>
      <dt>model</dt><dd>${escapeHtml(m.model || m.linked_bc_model)}</dd>
      <dt>category</dt><dd>oneshot · /goal + mid-run steer · self-clone forking</dd>
      <dt>repo</dt><dd>${escapeHtml(m.repo || run.repository?.full_name || "—")}</dd>
      <dt>venue</dt><dd>${escapeHtml(humanVenue(run))}</dd>
      <dt>paid</dt><dd>$99 Ultra mint (gravy train) · $199 Cursor Ultra · SuperGrok Heavy ~$300 grant · Grok bot free · X Premium+</dd>
      <dt>snapshot</dt><dd>${escapeHtml(snap.ts || "—")}</dd>
    `;
    const repoOut = el("codex-repo-out");
    if (repoOut) {
      repoOut.href = run.links?.origin_repo || run.links?.agent || "#";
      repoOut.textContent = closed ? "ufo-fsd-alpha · closed run" : "ufo-fsd-alpha · live agent";
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
  } else if (isTp) {
    el("live-metrics").innerHTML = `
      <dt>status</dt><dd class="status-live">${escapeHtml(run.status)}</dd>
      <dt>mode</dt><dd>${escapeHtml(m.mode || "—")}</dd>
      <dt>parallel</dt><dd>${escapeHtml(m.parallelization || "—")}</dd>
      <dt>L1</dt><dd>${escapeHtml(m.l1_model)} · ${escapeHtml(m.seats)} seats · ${escapeHtml(m.l1_waves || "—")}</dd>
      <dt>L2</dt><dd>${escapeHtml(m.l2_mix || m.l2_model || "—")}</dd>
      <dt>meter</dt><dd>Token Plan weekly ${escapeHtml(Number(m.tp_weekly_pct ?? pct).toFixed(1))}% · ${escapeHtml(m.tp_meter || "—")}</dd>
      <dt>ledger</dt><dd>${escapeHtml(m.dispatches_disclosed ?? "—")} disclosed · ${escapeHtml(m.ledger || m.dispatch_ledger || "—")}</dd>
      <dt>venue</dt><dd>${escapeHtml(humanVenue(run))}</dd>
      <dt>paid</dt><dd>paid Token Plan — not a grant</dd>
      <dt>snapshot</dt><dd>${escapeHtml(snap.ts || "—")}</dd>
    `;
  } else {
    el("live-metrics").innerHTML = `
      <dt>model</dt><dd>${escapeHtml(m.model)}</dd>
      <dt>category</dt><dd>oneshot</dd>
      <dt>meter</dt><dd>weekly ${escapeHtml(m.window_minutes)} min · not monthly 100%</dd>
      <dt>plan</dt><dd>${escapeHtml(m.plan_type)}</dd>
      <dt>tokens</dt><dd>${fmtTokens(m.tokens_total)} <span class="muted">cached ${fmtTokens(m.tokens_cached_input)}</span></dd>
      <dt>rollouts</dt><dd>${escapeHtml(m.n_rollouts)}</dd>
      <dt>host load</dt><dd>~${escapeHtml(m.approx_cores)} cores · ${escapeHtml(m.rss_gb)} GB RSS</dd>
      <dt>venue</dt><dd>${escapeHtml(humanVenue(run))}</dd>
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


  const liveId = manifest.live_strip_run_id || "veigapunk-cursor-ultra-ufo-core-2026-08-25";
  const liveRun = byId[liveId];
  const curvePath =
    liveRun?.curve ||
    (liveId.includes("cursor-ultra")
      ? "data/cursor-ultra-curve.json"
      : liveId.includes("codex-ultra")
        ? "data/codex-curve.json"
        : null);
  const curve = curvePath ? await loadJsonSoft(curvePath) : null;
  if (liveRun) {
    renderLiveStrip(liveRun, curve);
    const bc = liveRun.burn_clock;
    const heroMintBurn = el("hero-mint-burn");
    if (heroMintBurn && bc) {
      const h = bc.complete_burn_hours ?? bc.monthly_included_burn_hours_display;
      heroMintBurn.textContent = h != null ? String(Math.round(Number(h))) : "—";
    }
    const heroCompleteLabel = el("hero-complete-burn-label");
    if (heroCompleteLabel) heroCompleteLabel.textContent = "Ultra complete burn (h)";
    const heroSaved = el("hero-total-saved");
    if (heroSaved) heroSaved.textContent = fmtUsd(totalSavedDisplay(liveRun)).replace("$", "");
    const heroSavedLabel = el("hero-total-saved-label");
    if (heroSavedLabel) {
      const mult = liveRun.total_saved?.multiple_vs_99_mint_complete_burn;
      heroSavedLabel.textContent = mult ? `total saved @ complete burn (${mult}× $99)` : "total saved @ complete burn";
    }
  }
}

main().catch((err) => {
  if (el("run-summary")) el("run-summary").textContent = `Failed to load board: ${err.message}`;
});
