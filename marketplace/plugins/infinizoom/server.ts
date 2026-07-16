// bun run server — builds src/main.ts once at startup, serves it with the static shell.
const build = async () => {
  const out = await Bun.build({
    entrypoints: ["src/main.ts"],
    target: "browser",
    format: "esm",
    external: ["three"], // bare import stays; the browser importmap resolves it from the CDN
    minify: false,
  });
  if (!out.success) { for (const m of out.logs) console.error(m); throw new Error("build failed"); }
  return out.outputs[0].text();
};

let js = await build();
console.log(`infinizoom built (${(js.length / 1024).toFixed(0)} kB)`);

Bun.serve({
  port: 3000,
  async fetch(req) {
    const path = new URL(req.url).pathname;
    if (path === "/") return new Response(Bun.file("index.html"), { headers: { "content-type": "text/html" } });
    if (path === "/main.js") {
      js = await build().catch(() => js); // rebuild per request in dev; fall back to last good build
      return new Response(js, { headers: { "content-type": "text/javascript" } });
    }
    const f = Bun.file("." + path);
    if (await f.exists()) return new Response(f);
    return new Response("not found", { status: 404 });
  },
});
console.log("infinizoom riding at http://localhost:3000");
export {};
