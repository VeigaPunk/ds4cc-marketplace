export const WIDGET_URI = "ui://ds4cc/marketplace-v1.html";

export const widgetHtml = `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root { color-scheme: light dark; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #10140f; color: #e8f3df; }
    main { padding: 18px; }
    header { display: flex; justify-content: space-between; gap: 16px; align-items: end; margin-bottom: 16px; }
    h1 { margin: 0; font-size: 22px; letter-spacing: -0.04em; }
    .signal { color: #a7f26b; font-size: 12px; text-transform: uppercase; letter-spacing: .12em; }
    .count { color: #95a18d; font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(215px, 1fr)); gap: 10px; }
    article { border: 1px solid #34412f; border-radius: 8px; padding: 13px; background: #151c13; }
    article:hover { border-color: #70b34a; }
    h2 { margin: 0 0 7px; font-size: 14px; color: #c6ff9f; }
    p { margin: 0 0 12px; color: #b7c2b1; font: 13px/1.45 system-ui, sans-serif; min-height: 38px; }
    code { display: block; padding: 8px; border-radius: 5px; background: #0b0e0a; color: #d8e5d1; font-size: 11px; overflow-wrap: anywhere; }
    .meta { display: flex; justify-content: space-between; color: #758270; font-size: 10px; margin-bottom: 8px; text-transform: uppercase; }
    .review { min-height: 0; margin: 9px 0 0; color: #f0d58a; font-size: 11px; }
    .empty { color: #95a18d; padding: 28px 0; }
    @media (max-width: 520px) { main { padding: 13px; } header { align-items: start; flex-direction: column; } .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <header><div><div class="signal">DS4CC // live catalog</div><h1>Agent tooling, one frontier.</h1></div><div class="count" id="count">Waiting for catalog...</div></header>
    <section class="grid" id="catalog"></section>
  </main>
  <script type="module">
    const catalog = document.getElementById("catalog");
    const count = document.getElementById("count");

    function render(result) {
      const plugins = result?.structuredContent?.plugins ?? [];
      catalog.replaceChildren();
      count.textContent = plugins.length + (plugins.length === 1 ? " plugin" : " plugins");
      if (!plugins.length) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "No plugins matched this query.";
        catalog.append(empty);
        return;
      }
      for (const plugin of plugins) {
        const card = document.createElement("article");
        const meta = document.createElement("div");
        meta.className = "meta";
        const category = document.createElement("span");
        category.textContent = plugin.category;
        const version = document.createElement("span");
        version.textContent = "v" + plugin.version;
        meta.append(category, version);
        const title = document.createElement("h2");
        title.textContent = plugin.displayName;
        const description = document.createElement("p");
        description.textContent = plugin.shortDescription;
        const command = document.createElement("code");
        command.textContent = plugin.install.codex;
        const review = document.createElement("p");
        review.className = "review";
        review.textContent = plugin.reviewNotice;
        card.append(meta, title, description, command, review);
        catalog.append(card);
      }
    }

    window.addEventListener("message", (event) => {
      if (event.source !== window.parent || event.data?.jsonrpc !== "2.0") return;
      if (event.data.method === "ui/notifications/tool-result") render(event.data.params);
    }, { passive: true });
  </script>
</body>
</html>
`.trim();
