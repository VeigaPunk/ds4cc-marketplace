async function loadRun() {
  const res = await fetch("data/run-200usd.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`run json ${res.status}`);
  return res.json();
}

function el(id) {
  return document.getElementById(id);
}

function render(run) {
  el("run-title").textContent = `${run.runner} — $${run.budget_usd} · ${run.duration} · ${run.provider}`;
  el("run-summary").textContent = run.summary;

  const tl = el("run-timeline");
  tl.innerHTML = "";
  for (const step of run.timeline || []) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${step.label}</strong> — ${step.note}`;
    tl.appendChild(li);
  }

  const m = run.metrics || {};
  el("run-metrics").innerHTML = `
    <dt>provider</dt><dd>${run.provider || "—"}</dd>
    <dt>product</dt><dd>${run.product || "—"}</dd>
    <dt>account</dt><dd><code>${run.account_hint || "—"}</code></dd>
    <dt>budget</dt><dd>$${m.budget_usd ?? run.budget_usd} USD</dd>
    <dt>spent</dt><dd>$${m.spent_usd_approx ?? "?"} USD</dd>
    <dt>wall clock</dt><dd>${m.wall_clock_hours ?? "?"} hours</dd>
    <dt>mode</dt><dd>${m.mode || "—"} · parallel: ${m.parallelization || "—"}</dd>
    <dt>tokens</dt><dd>${m.tokens_total ?? "—"} <span class="muted">${m.tokens_note || ""}</span></dd>
    <dt>outcome</dt><dd>${m.outcome || run.status}</dd>
  `;

  const links = run.links || {};
  el("run-links").innerHTML = Object.entries(links)
    .map(([k, href]) => `<a href="${href}" rel="noopener">${k}</a>`)
    .join(" · ");

  el("board-body").innerHTML = `
    <tr>
      <td>1</td>
      <td>${run.runner}</td>
      <td>${run.provider || "—"}</td>
      <td>$${run.budget_usd}</td>
      <td>${run.duration || "—"}</td>
      <td>${m.mode || "—"} / ${m.parallelization || "—"}</td>
      <td class="status-closed">${run.status}</td>
    </tr>
  `;
}

loadRun()
  .then(render)
  .catch((err) => {
    el("run-summary").textContent = `Failed to load run data: ${err.message}`;
  });
