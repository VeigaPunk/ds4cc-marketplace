import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import { afterEach, test } from "node:test";
import { createApp } from "./server.js";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
});

async function startApp(): Promise<{ baseUrl: string }> {
  const server = createApp().listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert(address && typeof address === "object");
  return { baseUrl: `http://127.0.0.1:${address.port}` };
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
