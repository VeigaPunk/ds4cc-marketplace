async function loadRun() {
  const res = await fetch("data/run-200usd.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`run json ${res.status}`);
  return res.json();
}

function el(id) {
  return document.getElementById(id);
}

function render(run) {
  el("run-title").textContent = `${run.runner} — $${run.budget_usd} USD`;
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
    <dt>budget</dt><dd>$${m.budget_usd ?? run.budget_usd} USD</dd>
    <dt>spent (approx)</dt><dd>$${m.spent_usd_approx ?? "?"} USD</dd>
    <dt>tokens</dt><dd>${m.tokens_total ?? "—"} <span class="muted">(${m.tokens_note || ""})</span></dd>
    <dt>wall clock</dt><dd>${m.wall_clock || "—"}</dd>
    <dt>outcome</dt><dd>${m.outcome || run.status}</dd>
  `;

  const links = run.links || {};
  el("run-links").innerHTML = Object.entries(links)
    .map(([k, href]) => `<a href="${href}" rel="noopener">${k.replaceAll("_", " ")}</a>`)
    .join(" · ");

  el("board-body").innerHTML = `
    <tr>
      <td>1</td>
      <td>${run.runner}</td>
      <td>$${run.budget_usd}</td>
      <td class="status-closed">${run.status}</td>
      <td>${run.title}</td>
    </tr>
  `;
}

loadRun()
  .then(render)
  .catch((err) => {
    el("run-summary").textContent = `Failed to load run data: ${err.message}`;
  });
