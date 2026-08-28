(function () {
  "use strict";

  const CATALOG_URL = "../marketplace/plugins/xbrd-gdsp-fknpft/config/xask-models.json";
  const ROUTES = {
    chatgpt: "codex",
    grok: "grok",
    "token-plan": "token-plan",
    local: "gemma",
  };

  function withGodspeedCloser(value) {
    const task = String(value).replace(/(?:\s*\|\s*godspeed\s*)+$/i, "").trimEnd();
    return `${task}${task ? " " : ""}| godspeed`;
  }

  if (typeof module === "object" && module.exports) {
    module.exports = { withGodspeedCloser };
    return;
  }

  const form = document.getElementById("delegate-form");
  if (!form) return;

  const elements = {
    providers: form.querySelector("[data-provider-options]"),
    catalogMeta: form.querySelector("[data-catalog-meta]"),
    model: form.querySelector("#model-select"),
    modelNote: form.querySelector("[data-model-note]"),
    substrateNote: form.querySelector("[data-substrate-note]"),
    effortOptions: form.querySelector("[data-effort-options]"),
    effortNote: form.querySelector("[data-effort-note]"),
    tierNote: form.querySelector("[data-tier-note]"),
    task: form.querySelector("#task-input"),
    taskCount: form.querySelector("[data-task-count]"),
    routeHeading: form.querySelector("[data-route-heading]"),
    routeStatus: form.querySelector("[data-route-status]"),
    routeProvider: form.querySelector("[data-route-provider]"),
    routeModel: form.querySelector("[data-route-model]"),
    routeSubstrate: form.querySelector("[data-route-substrate]"),
    routeEffort: form.querySelector("[data-route-effort]"),
    routeTier: form.querySelector("[data-route-tier]"),
    routeProtocol: form.querySelector("[data-route-protocol]"),
    routeMessage: form.querySelector("[data-route-message]"),
    command: form.querySelector("[data-command]"),
    copy: form.querySelector("[data-copy-plan]"),
    compatibility: document.querySelector("[data-compatibility-body]"),
  };

  const state = {
    catalog: null,
    providerId: "",
    modelId: "",
    substrate: "stock",
    effort: "",
    tier: "default",
  };

  function shellQuote(value) {
    const text = String(value);
    if (text === "") return "''";
    if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(text)) return text;
    return "'" + text.replace(/'/g, "'\"'\"'") + "'";
  }

  function create(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function providerById(id) {
    return state.catalog.providers.find((provider) => provider.id === id);
  }

  function selectedModel() {
    return state.catalog.models.find(
      (model) => model.provider === state.providerId && model.model_id === state.modelId,
    );
  }

  function providerModels(providerId, includeReserved) {
    return state.catalog.models.filter(
      (model) => model.provider === providerId && (includeReserved || model.visible !== false),
    );
  }

  function routeFor(model) {
    return model.route || ROUTES[model.provider] || model.provider;
  }

  function readRadio(name, fallback) {
    return form.querySelector(`input[name="${name}"]:checked`)?.value || fallback;
  }

  function setRadio(name, value) {
    const input = form.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input && !input.disabled) input.checked = true;
  }

  function renderProviders() {
    elements.providers.replaceChildren();

    state.catalog.providers.forEach((provider, index) => {
      const label = create("label", "provider-option");
      const input = create("input");
      input.type = "radio";
      input.name = "provider";
      input.value = provider.id;
      input.checked = provider.id === state.providerId || (!state.providerId && index === 0);

      const face = create("span", "provider-face");
      const kicker = create("span", "provider-kicker");
      kicker.append(create("span", "", provider.id.replace("-", " / ")));
      const dot = create("span", `availability-dot${provider.available ? " on" : ""}`);
      dot.title = provider.available ? "Detected in this catalog export" : "Not detected in this catalog export";
      dot.setAttribute("role", "img");
      dot.setAttribute("aria-label", dot.title);
      kicker.append(dot);
      face.append(kicker);
      face.append(create("strong", "", provider.label));
      face.append(create("p", "", provider.description));
      label.append(input, face);
      elements.providers.append(label);
    });
  }

  function renderModels(preferredId) {
    const provider = providerById(state.providerId);
    const models = providerModels(state.providerId, false);
    elements.model.replaceChildren();

    if (!models.length) {
      const option = create("option", "", "No selectable models in catalog");
      option.value = "";
      elements.model.append(option);
      elements.model.disabled = true;
      state.modelId = "";
      return;
    }

    models.forEach((model) => {
      const option = create(
        "option",
        "",
        `${model.display_name} · ${model.model_id}${model.available ? "" : " · not detected"}`,
      );
      option.value = model.model_id;
      elements.model.append(option);
    });

    const modelIds = new Set(models.map((model) => model.model_id));
    const nextId = modelIds.has(preferredId)
      ? preferredId
      : modelIds.has(provider.default_model_id)
        ? provider.default_model_id
        : models[0].model_id;
    state.modelId = nextId;
    elements.model.value = nextId;
    elements.model.disabled = false;
  }

  function reconcileSubstrate() {
    const provider = providerById(state.providerId);
    const sekhmet = form.querySelector('input[name="substrate"][value="sekhmet"]');
    const supportsSekhmet = Boolean(provider?.transports?.includes("sekhmet"));
    sekhmet.disabled = !supportsSekhmet;
    if (!supportsSekhmet && state.substrate === "sekhmet") state.substrate = "stock";
    setRadio("substrate", state.substrate);

    elements.substrateNote.textContent = supportsSekhmet
      ? state.substrate === "sekhmet"
        ? "Sekhmet runs an isolated L3 worker and fixes effective effort at low."
        : "Stock uses the ChatGPT provider lane; Sekhmet is available as an isolated L3 worker."
      : "This provider advertises the stock substrate only.";
  }

  function renderEfforts(preferredEffort) {
    const model = selectedModel();
    const efforts = state.substrate === "sekhmet" ? ["low"] : model?.supported_efforts || [];
    const defaultEffort = state.substrate === "sekhmet" ? "low" : model?.default_effort;
    state.effort = efforts.includes(preferredEffort) ? preferredEffort : defaultEffort || efforts[0] || "";
    elements.effortOptions.replaceChildren();

    efforts.forEach((effort) => {
      const label = create("label", "segment-option");
      const input = create("input");
      input.type = "radio";
      input.name = "effort";
      input.value = effort;
      input.checked = effort === state.effort;
      label.append(input, create("span", "", effort));
      elements.effortOptions.append(label);
    });

    elements.effortNote.textContent = state.substrate === "sekhmet"
      ? "Sekhmet currently fixes effective reasoning effort at low."
      : `${model.display_name} advertises ${efforts.join(", ")}; default is ${model.default_effort}.`;
  }

  function reconcileTier() {
    const model = selectedModel();
    const fastInput = form.querySelector('input[name="service-tier"][value="fast"]');
    const fastSupported = state.substrate === "stock" && model?.service_tiers?.includes("fast");
    fastInput.disabled = !fastSupported;
    if (!fastSupported && state.tier === "fast") state.tier = "default";
    setRadio("service-tier", state.tier);

    if (state.substrate === "sekhmet") {
      elements.tierNote.textContent = "Sekhmet owns its transport; the plan stays on the default tier.";
    } else if (fastSupported) {
      elements.tierNote.textContent = "This model supports default and fast (priority) service tiers.";
    } else {
      elements.tierNote.textContent = "This model advertises the default service tier only.";
    }
  }

  function renderCompatibility() {
    elements.compatibility.replaceChildren();
    state.catalog.models.forEach((model) => {
      const provider = providerById(model.provider);
      const row = create("tr");
      row.append(create("td", "", provider?.label || model.provider));

      const modelCell = create("td", "", model.display_name);
      modelCell.append(create("span", "model-subline", model.model_id));
      if (model.visible === false) modelCell.append(create("span", "model-subline", "reserved · table only"));
      row.append(modelCell);

      row.append(create("td", "", routeFor(model)));
      row.append(create("td", "", model.supported_efforts.join(" · ")));
      row.append(create("td", "", model.service_tiers.join(" · ")));
      row.append(create("td", "", provider?.transports?.join(" · ") || model.transport || "stock"));

      const status = create("span", `badge ${model.available ? "ok" : "warn"}`, model.available ? "detected" : "not detected");
      const statusCell = create("td");
      statusCell.append(status);
      row.append(statusCell);
      elements.compatibility.append(row);
    });
  }

  function planArgv() {
    const model = selectedModel();
    const task = withGodspeedCloser(elements.task.value);
    const argv = [
      "xask",
      "plan",
      "--provider",
      state.providerId,
      "--substrate",
      state.substrate,
      "--model-id",
      model.model_id,
      "--effort",
      state.effort,
      "--service-tier",
      state.tier,
      "--gs",
    ];
    argv.push("--json", "--", task);
    return argv;
  }

  function renderResolved() {
    if (!state.catalog || !state.modelId) return;
    const provider = providerById(state.providerId);
    const model = selectedModel();
    const route = routeFor(model);
    const detected = Boolean(provider.available && model.available);
    const command = planArgv().map(shellQuote).join(" ");

    elements.routeHeading.textContent = `${route} → ${model.display_name}`;
    elements.routeProvider.textContent = provider.label;
    elements.routeModel.textContent = model.model_id;
    elements.routeSubstrate.textContent = state.substrate;
    elements.routeEffort.textContent = state.effort;
    elements.routeTier.textContent = state.tier;
    elements.routeProtocol.textContent = "canonical Godspeed";
    elements.command.textContent = command;
    elements.taskCount.textContent = String(elements.task.value.length);
    elements.copy.disabled = elements.task.value.length === 0;

    elements.routeStatus.className = `badge ${detected ? "ok" : "warn"}`;
    elements.routeStatus.textContent = detected ? "detected" : "plan only";
    elements.routeMessage.textContent = detected
      ? "Provider and model were detected in this catalog export. Copying still creates a dry plan; it does not dispatch."
      : "This selection is catalog-compatible but was not detected on the machine that produced this export. Verify locally before dispatch.";

    elements.modelNote.textContent = model.available
      ? `${model.display_name} was detected in this catalog export.`
      : `${model.display_name} is compatible but was not detected in this catalog export.`;
  }

  function renderSelection(options) {
    const settings = options || {};
    reconcileSubstrate();
    renderEfforts(settings.keepEffort ? state.effort : "");
    reconcileTier();
    renderResolved();
  }

  function bindEvents() {
    elements.providers.addEventListener("change", (event) => {
      if (event.target.name !== "provider") return;
      state.providerId = event.target.value;
      state.substrate = "stock";
      state.tier = "default";
      renderModels("");
      renderSelection();
    });

    elements.model.addEventListener("change", () => {
      state.modelId = elements.model.value;
      state.tier = "default";
      renderSelection();
    });

    form.addEventListener("change", (event) => {
      if (event.target.name === "substrate") {
        state.substrate = readRadio("substrate", "stock");
        if (state.substrate === "sekhmet") state.tier = "default";
        renderSelection();
      } else if (event.target.name === "effort") {
        state.effort = readRadio("effort", state.effort);
        renderResolved();
      } else if (event.target.name === "service-tier") {
        state.tier = readRadio("service-tier", "default");
        renderResolved();
      }
    });

    elements.task.addEventListener("input", renderResolved);
    elements.copy.addEventListener("click", async () => {
      const previous = elements.copy.textContent;
      try {
        await navigator.clipboard.writeText(elements.command.textContent);
        elements.copy.textContent = "Copied";
      } catch (_error) {
        elements.copy.textContent = "Select + copy";
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(elements.command);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      window.setTimeout(() => {
        elements.copy.textContent = previous;
      }, 1600);
    });
  }

  function validateCatalog(catalog) {
    if (!catalog || !Array.isArray(catalog.providers) || !Array.isArray(catalog.models)) {
      throw new Error("Catalog is missing providers or models arrays.");
    }
    if (!catalog.providers.length || !catalog.models.length) {
      throw new Error("Catalog contains no selectable routes.");
    }
    return catalog;
  }

  async function init() {
    try {
      const response = await fetch(CATALOG_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`Catalog request failed (${response.status}).`);
      state.catalog = validateCatalog(await response.json());
      state.providerId = state.catalog.providers[0].id;
      renderProviders();
      renderModels("");
      renderCompatibility();
      renderSelection();

      const when = state.catalog.exported_at
        ? new Date(state.catalog.exported_at).toLocaleString()
        : "timestamp unavailable";
      elements.catalogMeta.textContent = `${state.catalog.models.length} models · ${state.catalog.providers.length} providers · exported ${when}.`;
      bindEvents();
    } catch (error) {
      elements.providers.replaceChildren(create("p", "card catalog-error", "The xask catalog could not be loaded."));
      elements.catalogMeta.textContent = `${error.message} Serve the repository over HTTP so the relative JSON catalog is readable.`;
      elements.routeStatus.className = "badge warn";
      elements.routeStatus.textContent = "catalog error";
      elements.routeMessage.textContent = "No command was composed. The planner never falls back to invented model data.";
      elements.compatibility.replaceChildren();
      const row = create("tr");
      const cell = create("td", "muted", "Catalog unavailable. No compatibility claims were generated.");
      cell.colSpan = 7;
      row.append(cell);
      elements.compatibility.append(row);
    }
  }

  init();
})();
