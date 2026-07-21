import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import type { Server } from "node:http";
import { resolve } from "node:path";
import { afterEach, test } from "node:test";
import { cleanupMcpSession, createApp } from "./server.js";
import { loadCatalog, REVIEWED_PLUGIN_ALLOWLIST } from "./catalog.js";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
});

type AppOptions = Parameters<typeof createApp>[0];

test("MCP session cleanup deletes, detaches, and closes exactly once", () => {
  let cancelCalls = 0;
  let closeCalls = 0;
  const transport = { onclose: () => {} };
  const session = {
    id: "stale-session",
    server: { close: async () => { closeCalls += 1; } },
    transport,
    lastActivityAt: 0,
    activeRequests: 0,
    idleCleanup: { cancel: () => { cancelCalls += 1; } },
    closed: false,
  };
  const sessions = new Map([[session.id, session]]);

  cleanupMcpSession(sessions, session);
  cleanupMcpSession(sessions, session);

  assert.equal(sessions.has(session.id), false);
  assert.equal(transport.onclose, undefined);
  assert.equal(cancelCalls, 1);
  assert.equal(closeCalls, 1);
});

async function startApp(options?: AppOptions): Promise<{ baseUrl: string }> {
  const server = createApp(options).listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert(address && typeof address === "object");
  return { baseUrl: `http://127.0.0.1:${address.port}` };
}

async function initializeSession(baseUrl: string, id: number): Promise<string> {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: `init-${id}`, version: "1.0.0" } },
    }),
  });
  assert.equal(response.status, 200);
  const sessionId = response.headers.get("mcp-session-id");
  assert.ok(sessionId);
  return sessionId;
}

test("serves health and public policy routes", async () => {
  const { baseUrl } = await startApp();
  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok", service: "ds4cc-marketplace", version: "1.0.0" });
  assert.equal((await fetch(`${baseUrl}/privacy`)).status, 200);
  assert.equal((await fetch(`${baseUrl}/terms`)).status, 200);
  assert.equal((await fetch(`${baseUrl}/.well-known/openai-apps-challenge`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/mcp`)).status, 400);
});

test("privacy, terms, support, and website contain submission-required disclosures", async () => {
  const { baseUrl } = await startApp();
  const privacy = await (await fetch(`${baseUrl}/privacy`)).text();
  for (const statement of [
    "No account is required.",
    "Raw search queries are processed in memory and are not persisted by the app.",
    "We do not use advertising trackers or tracking cookies.",
    "The app operator does not intentionally retain or export application-level diagnostic records for more than 30 days.",
    "Recipient categories are infrastructure service providers that host and protect the app, and OpenAI when a user invokes the app through an OpenAI product.",
    "We do not sell personal data.",
    "For access, deletion, objection, or privacy questions",
  ]) assert.ok(privacy.includes(statement), statement);
  for (const contradiction of [/an account is required/i, /raw search queries are persisted/i, /we (?:may|do) (?:use )?(?:advertising )?trackers/i, /we (?:may|do) sell personal data/i, /retain.+indefinitely/i]) assert.doesNotMatch(privacy, contradiction);
  const terms = await (await fetch(`${baseUrl}/terms`)).text();
  assert.ok(terms.includes("The app provides a read-only index of public developer materials and does not install, execute, authenticate to, or modify software or systems."));
  assert.ok(terms.includes("Optional install commands are copyable text only and require independent review before a user chooses to run them."));
  assert.ok(terms.includes("Catalog inclusion is not a security warranty or endorsement."));
  assert.ok(terms.includes("The service and metadata are provided “as is” without warranties."));
  for (const contradiction of [/(?:app|tool) (?:can|will) (?:install|execute|modify)/i, /catalog inclusion is (?:a|our) (?:security )?warranty/i, /service and metadata are warranted/i]) assert.doesNotMatch(terms, contradiction);
  const support = await fetch(`${baseUrl}/support`, { redirect: "manual" });
  assert.equal(support.status, 200);
  const supportText = await support.text();
  assert.ok(supportText.includes("https://github.com/VeigaPunk/ds4cc-marketplace/issues/new"));
  assert.ok(supportText.includes("https://github.com/VeigaPunk/ds4cc-marketplace/issues"));
  assert.match(supportText, /GitHub account is required/i);
  const website = await (await fetch(`${baseUrl}/`)).text();
  assert.match(website, /Privacy Policy/);
  assert.match(website, /Terms of Use/);
  assert.match(website, /Support/);
  assert.ok(website.includes('href="https://github.com/VeigaPunk/ds4cc-marketplace/tree/main/official/ds4cc">Public source</a>'));
});

test("official package uses only supported interface manifest fields and valid paths", () => {
  const officialRoot = resolve(process.cwd(), "../official/ds4cc");
  const manifest = JSON.parse(readFileSync(resolve(officialRoot, ".codex-plugin/plugin.json"), "utf8")) as Record<string, unknown>;
  assert.deepEqual(Object.keys(manifest).sort(), ["name", "version", "description", "author", "skills", "interface", "homepage", "repository", "license", "keywords"].sort());
  for (const unsupported of ["displayName", "shortDescription", "longDescription", "developerName", "category", "capabilities", "websiteURL", "privacyPolicyURL", "termsOfServiceURL", "defaultPrompt", "brandColor", "composerIcon", "logo", "icon", "legal"]) {
    assert.equal(Object.hasOwn(manifest, unsupported), false, `${unsupported} must not be top-level`);
  }
  const pluginInterface = manifest.interface as Record<string, unknown>;
  assert.deepEqual(Object.keys(pluginInterface).sort(), ["displayName", "shortDescription", "longDescription", "developerName", "category", "capabilities", "websiteURL", "privacyPolicyURL", "termsOfServiceURL", "defaultPrompt", "brandColor", "composerIcon", "logo"].sort());
  assert.equal(pluginInterface.websiteURL, "https://app.ds4cc.com/");
  assert.equal(pluginInterface.privacyPolicyURL, "https://app.ds4cc.com/privacy");
  assert.equal(pluginInterface.termsOfServiceURL, "https://app.ds4cc.com/terms");
  assert.equal(manifest.homepage, "https://app.ds4cc.com/");
  assert.equal(manifest.repository, "https://github.com/VeigaPunk/ds4cc-marketplace/tree/main/official/ds4cc");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(pluginInterface.composerIcon, "./assets/logo.svg");
  assert.equal(pluginInterface.logo, "./assets/logo-512.png");
  for (const relative of [manifest.skills, pluginInterface.composerIcon, pluginInterface.logo]) {
    assert.equal(typeof relative, "string");
    const target = statSync(resolve(officialRoot, relative as string));
    assert.ok(target.isFile() || target.isDirectory());
  }
});

test("public marketplace remains exactly 14 source-bound plugins", () => {
  for (const file of ["marketplace/marketplace.json", ".agents/plugins/marketplace.json"]) {
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "..", file), "utf8")) as { plugins: Array<{ name: string; source: { path: string } }> };
    assert.equal(manifest.plugins.length, 14, file);
    assert.equal(new Set(manifest.plugins.map((plugin) => plugin.name)).size, 14, file);
    for (const plugin of manifest.plugins) assert.ok(plugin.source.path.endsWith(`/plugins/${plugin.name}`), `${file}: ${plugin.name}`);
  }
  const pluginRoot = resolve(process.cwd(), "../marketplace/plugins/ds4cc");
  const plugin = JSON.parse(readFileSync(resolve(pluginRoot, ".codex-plugin/plugin.json"), "utf8")) as Record<string, unknown>;
  for (const unsupported of ["icon", "legal", "logo"]) assert.equal(Object.hasOwn(plugin, unsupported), false);
  const pluginInterface = plugin.interface as Record<string, unknown>;
  assert.equal(pluginInterface.privacyPolicyURL, "https://app.ds4cc.com/privacy");
  assert.equal(pluginInterface.termsOfServiceURL, "https://app.ds4cc.com/terms");
  for (const relative of [pluginInterface.composerIcon, pluginInterface.logo]) assert.ok(statSync(resolve(pluginRoot, relative as string)).isFile());
});

test("official catalog uses a reviewed allowlist and truthful sourced Codex commands", () => {
  const catalog = loadCatalog();
  const names = new Set(catalog.map((plugin) => plugin.name));
  for (const excluded of ["aaronplug", "spoderman", "xbrd-gdsp-fknpft", "the-puppeteer", "godspeed-codex-command", "godspeed-core"]) {
    assert.equal(names.has(excluded), false, `${excluded} must not be exposed by the submitted app`);
  }
  assert.deepEqual([...names].sort(), ["agent-wall", "ds4cc", "infinizoom", "mycommands", "myskills"]);
  assert.deepEqual([...REVIEWED_PLUGIN_ALLOWLIST].sort(), [...names].sort());
  for (const plugin of catalog) {
    const marketplace = JSON.parse(readFileSync(resolve(process.cwd(), "../marketplace/marketplace.json"), "utf8")) as { plugins: Array<{ name: string; category: string }> };
    const sourceEntry = marketplace.plugins.find((entry) => entry.name === plugin.name);
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), `../marketplace/plugins/${plugin.name}/.codex-plugin/plugin.json`), "utf8")) as { name: string; version: string; interface: { displayName: string; category: string; capabilities: string[] } };
    assert.equal(manifest.name, plugin.name);
    assert.equal(plugin.version, manifest.version);
    assert.equal(plugin.displayName, manifest.interface.displayName);
    assert.equal(plugin.category, manifest.interface.category);
    assert.equal(sourceEntry?.category, manifest.interface.category);
    assert.deepEqual(plugin.capabilities, manifest.interface.capabilities);
    assert(plugin.capabilities.length > 0);
    assert.equal(plugin.install.codex, `codex plugin add ${plugin.name}@ds4cc`);
    assert.equal(Object.hasOwn(plugin.install, "copilot"), false);
    assert.equal(Object.hasOwn(plugin.install, "claude"), false);
    assert.equal(plugin.publisher, "VeigaPunk");
    const expectedSource = plugin.name === "ds4cc"
      ? "https://github.com/VeigaPunk/ds4cc-marketplace/tree/main/official/ds4cc"
      : `https://github.com/VeigaPunk/ds4cc-marketplace/tree/main/marketplace/plugins/${plugin.name}`;
    assert.equal(plugin.sourceUrl, expectedSource);
    assert.equal(plugin.reviewNotice, "Optional install commands are copyable text only. Independently review the source, license, and capabilities before running one; this app never executes commands.");
    assert(plugin.components.length > 0);
  }
});

test("serves the exact configured domain-verification token without caching", async () => {
  const previousToken = process.env.OPENAI_APPS_CHALLENGE;
  process.env.OPENAI_APPS_CHALLENGE = "portal-verification-token";
  try {
    const { baseUrl } = await startApp();
    const response = await fetch(`${baseUrl}/.well-known/openai-apps-challenge`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(await response.text(), "portal-verification-token");
  } finally {
    if (previousToken === undefined) delete process.env.OPENAI_APPS_CHALLENGE;
    else process.env.OPENAI_APPS_CHALLENGE = previousToken;
  }
});

test("exposes a read-only Apps SDK catalog and widget", async () => {
  const { baseUrl } = await startApp();
  const client = new Client({ name: "ds4cc-test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
  await client.connect(transport);

  try {
    const tools = await client.listTools();
    assert.equal(tools.tools.length, 1);
    const tool = tools.tools[0];
    assert.equal(tool.name, "browse_ds4cc_marketplace");
    assert.deepEqual(tool.annotations, { readOnlyHint: true, openWorldHint: false, destructiveHint: false });
    const uiMeta = tool._meta?.ui as { resourceUri?: string } | undefined;
    assert.equal(uiMeta?.resourceUri, "ui://ds4cc/marketplace-v1.html");

    const excludedNames = ["aaronplug", "spoderman", "xbrd-gdsp-fknpft", "the-puppeteer", "godspeed-codex-command", "godspeed-core", "myagents"];
    for (const arguments_ of [{}, { query: "" }, { query: "   " }]) {
      const result = await client.callTool({ name: tool.name, arguments: arguments_ });
      assert.equal(result.isError, undefined);
      const structured = result.structuredContent as { plugins: Array<{ name: string }>; total: number };
      assert.equal(structured.total, 5);
      assert.deepEqual(structured.plugins.map((plugin) => plugin.name).sort(), [...REVIEWED_PLUGIN_ALLOWLIST].sort());
      const serialized = JSON.stringify(result).toLowerCase();
      for (const excluded of excludedNames) assert.equal(serialized.includes(excluded), false, `${excluded} leaked from empty query`);
    }
    for (const excluded of excludedNames) {
      const targeted = await client.callTool({ name: tool.name, arguments: { query: excluded } });
      const targetedContent = targeted.structuredContent as { plugins: Array<{ name: string }> };
      assert.equal(targetedContent.plugins.some((plugin) => plugin.name === excluded), false, excluded);
      assert.equal(JSON.stringify(targetedContent.plugins).toLowerCase().includes(excluded), false, `${excluded} leaked from targeted result entries`);
    }

    const resource = await client.readResource({ uri: "ui://ds4cc/marketplace-v1.html" });
    assert.equal(resource.contents[0].mimeType, "text/html;profile=mcp-app");
    assert("text" in resource.contents[0]);
    assert.match(resource.contents[0].text, /DS4CC \/\/ live catalog/);
  } finally {
    await client.close();
  }
});

test("rejects untrusted MCP browser origins", async () => {
  const { baseUrl } = await startApp();
  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://evil.example" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "origin-test", version: "1.0.0" } },
    }),
  });
  assert.equal(response.status, 403);
});

test("transport close is one-shot and the server accepts a new MCP connection", async () => {
  const { baseUrl } = await startApp();
  const firstClient = new Client({ name: "close-regression-1", version: "1.0.0" });
  const firstTransport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
  await firstClient.connect(firstTransport);
  await firstClient.close();

  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal((await fetch(`${baseUrl}/health`)).status, 200);

  const secondClient = new Client({ name: "close-regression-2", version: "1.0.0" });
  const secondTransport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
  await secondClient.connect(secondTransport);
  try {
    const tools = await secondClient.listTools();
    assert.equal(tools.tools[0]?.name, "browse_ds4cc_marketplace");
  } finally {
    await secondClient.close();
  }
});

test("enforces unauthenticated MCP session capacity", async () => {
  const { baseUrl } = await startApp({ maxUnauthenticatedSessions: 1 });
  const firstSessionId = await initializeSession(baseUrl, 1);
  const rejectedResponse = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "over-cap", version: "1.0.0" } },
    }),
  });
  assert.equal(rejectedResponse.status, 503);
  assert.equal(rejectedResponse.headers.get("retry-after"), "1");

  const activeResponse = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { accept: "application/json, text/event-stream", "content-type": "application/json", "mcp-session-id": firstSessionId },
      body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/list" }),
  });
  assert.equal(activeResponse.status, 200);
});

test("expires idle unauthenticated MCP sessions", async () => {
  let now = 0;
  let cleanup: (() => void) | undefined;
  const { baseUrl } = await startApp({
    sessionIdleTimeoutMs: 1_000,
    now: () => now,
    scheduleIdleCleanup: (callback) => {
      cleanup = callback;
      return { cancel: () => { if (cleanup === callback) cleanup = undefined; } };
    },
  });
  const sessionId = await initializeSession(baseUrl, 1);
  assert.ok(cleanup);
  now = 1_000;
  cleanup();

  const expiredResponse = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", "mcp-session-id": sessionId },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
  });
  assert.equal(expiredResponse.status, 400);

  const replacementSessionId = await initializeSession(baseUrl, 3);
  const replacementResponse = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { accept: "application/json, text/event-stream", "content-type": "application/json", "mcp-session-id": replacementSessionId },
    body: JSON.stringify({ jsonrpc: "2.0", id: 4, method: "tools/list" }),
  });
  assert.equal(replacementResponse.status, 200);
});
