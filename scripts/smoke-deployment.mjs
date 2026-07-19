#!/usr/bin/env node
import { lookup } from "node:dns/promises";

const base = new URL(process.argv[2] ?? "");
if (base.protocol !== "https:") throw new Error("BASE_URL must use HTTPS");
base.pathname = "/";
base.search = "";
base.hash = "";
const expectedChallenge = process.env.EXPECTED_CHALLENGE;

await lookup(base.hostname);
console.log(`PASS DNS ${base.hostname}`);

async function checked(path, init = {}) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(15_000), ...init });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response;
}

for (const path of ["/", "/health", "/privacy", "/terms", "/support"]) {
  await checked(path);
  console.log(`PASS HTTPS ${path}`);
}

if (expectedChallenge) {
  const response = await checked("/.well-known/openai-apps-challenge");
  if (await response.text() !== expectedChallenge) throw new Error("challenge response is not exact");
  if (response.headers.get("cache-control") !== "no-store") throw new Error("challenge is cacheable");
  console.log("PASS challenge exactness and no-store");
}

function rpcBody(id, method, params) {
  return JSON.stringify({ jsonrpc: "2.0", id, method, ...(params === undefined ? {} : { params }) });
}

async function rpc(id, method, params, sessionId) {
  const headers = { accept: "application/json, text/event-stream", "content-type": "application/json" };
  if (sessionId) headers["mcp-session-id"] = sessionId;
  const response = await checked("/mcp", { method: "POST", headers, body: rpcBody(id, method, params) });
  const text = await response.text();
  const dataLines = text.split("\n").filter((line) => line.startsWith("data: "));
  const payload = JSON.parse(dataLines.at(-1)?.slice(6) ?? text);
  if (payload.error) throw new Error(`${method} failed: ${payload.error.message}`);
  return { response, payload };
}

const initialized = await rpc(1, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "ds4cc-smoke", version: "1.0.0" } });
const session = initialized.response.headers.get("mcp-session-id");
if (!session) throw new Error("initialize omitted mcp-session-id");
console.log("PASS MCP initialize");
const tools = await rpc(2, "tools/list", undefined, session);
const tool = tools.payload.result.tools?.[0];
if (tools.payload.result.tools?.length !== 1 || tool.name !== "browse_ds4cc_marketplace") throw new Error("unexpected MCP tools");
console.log("PASS MCP tools/list");
const called = await rpc(3, "tools/call", { name: tool.name, arguments: { query: "ds4cc" } }, session);
if (!called.payload.result.structuredContent?.plugins?.length) throw new Error("tool call returned no fixture");
console.log("PASS MCP tools/call");
const resource = await rpc(4, "resources/read", { uri: "ui://ds4cc/marketplace-v1.html" }, session);
if (!resource.payload.result.contents?.[0]?.text) throw new Error("widget resource is empty");
console.log("PASS MCP resources/read");
