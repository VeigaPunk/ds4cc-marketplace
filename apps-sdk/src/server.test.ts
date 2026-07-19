import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import { afterEach, test } from "node:test";
import { cleanupMcpSession, createApp } from "./server.js";
import { loadCatalog } from "./catalog.js";

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
  for (const required of ["Effective date", "raw search queries", "30 days", "IP address", "service providers", "deletion", "GitHub issue"]) {
    assert.match(privacy, new RegExp(required, "i"));
  }
  const terms = await (await fetch(`${baseUrl}/terms`)).text();
  assert.match(terms, /review.+before install/i);
  assert.match(terms, /third-party/i);
  const support = await fetch(`${baseUrl}/support`, { redirect: "manual" });
  assert.equal(support.status, 200);
  assert.match(await support.text(), /github\.com\/VeigaPunk\/ds4cc-marketplace\/issues/i);
  const website = await (await fetch(`${baseUrl}/`)).text();
  assert.match(website, /Privacy Policy/);
  assert.match(website, /Terms of Use/);
  assert.match(website, /Support/);
});

test("official catalog uses a reviewed allowlist and truthful sourced Codex commands", () => {
  const catalog = loadCatalog();
  const names = new Set(catalog.map((plugin) => plugin.name));
  for (const excluded of ["aaronplug", "spoderman", "xbrd-gdsp-fknpft", "the-puppeteer", "godspeed-codex-command", "godspeed-core"]) {
    assert.equal(names.has(excluded), false, `${excluded} must not be exposed by the submitted app`);
  }
  assert.deepEqual([...names].sort(), ["agent-wall", "ds4cc", "infinizoom", "myagents", "mycommands", "myskills"]);
  for (const plugin of catalog) {
    assert.equal(plugin.install.codex, `codex plugin add ${plugin.name}@ds4cc`);
    assert.equal(Object.hasOwn(plugin.install, "copilot"), false);
    assert.equal(Object.hasOwn(plugin.install, "claude"), false);
    assert.equal(plugin.publisher, "VeigaPunk");
    assert.match(plugin.sourceUrl, /^https:\/\/github\.com\/VeigaPunk\/ds4cc-marketplace\/tree\/main\//);
    assert.match(plugin.reviewNotice, /review.+before install/i);
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

    const result = await client.callTool({ name: tool.name, arguments: { query: "agents" } });
    assert.equal(result.isError, undefined);
    const structured = result.structuredContent as { plugins: Array<{ name: string }>; total: number };
    assert(structured.total > 0);
    assert(structured.plugins.some((plugin) => plugin.name === "myagents"));

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
