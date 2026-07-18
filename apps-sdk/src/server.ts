import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { loadCatalog } from "./catalog.js";
import { WIDGET_URI, widgetHtml } from "./widget.js";

const APP_ORIGIN = process.env.APP_ORIGIN ?? "https://app.ds4cc.com";
const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const allowedHosts = new Set([
  new URL(APP_ORIGIN).hostname,
  "localhost",
  "127.0.0.1",
  ...(process.env.ALLOWED_HOSTS ?? "").split(",").map((host) => host.trim()).filter(Boolean),
]);
const allowedOrigins = new Set([
  APP_ORIGIN,
  "https://chatgpt.com",
  ...(process.env.ALLOWED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean),
]);

const pluginSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  shortDescription: z.string(),
  category: z.string(),
  version: z.string(),
  capabilities: z.array(z.string()),
  repositoryUrl: z.string(),
  install: z.object({ codex: z.string(), copilot: z.string(), claude: z.string() }),
});

export function createServer(): McpServer {
  const server = new McpServer(
    { name: "ds4cc-marketplace", version: "1.0.0" },
    { instructions: "Use browse_ds4cc_marketplace to discover DS4CC plugins and installation commands. The catalog is public and read-only." },
  );

  registerAppResource(server, "DS4CC marketplace", WIDGET_URI, {}, async () => ({
    contents: [{
      uri: WIDGET_URI,
      mimeType: RESOURCE_MIME_TYPE,
      text: widgetHtml,
      _meta: {
        ui: {
          domain: APP_ORIGIN,
          prefersBorder: false,
          csp: { connectDomains: [], resourceDomains: [] },
        },
        "openai/widgetDescription": "An interactive catalog of DS4CC agent plugins with installation commands.",
      },
    }],
  }));

  registerAppTool(server, "browse_ds4cc_marketplace", {
    title: "Browse DS4CC Marketplace",
    description: "Lists public DS4CC agent plugins and installation commands. Optionally filters by plugin name, description, category, or capability.",
    inputSchema: { query: z.string().trim().max(80).optional().describe("Optional catalog search text") },
    outputSchema: { plugins: z.array(pluginSchema), total: z.number().int().nonnegative(), query: z.string() },
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    _meta: {
      ui: { resourceUri: WIDGET_URI },
      "openai/outputTemplate": WIDGET_URI,
      "openai/toolInvocation/invoking": "Reading the DS4CC catalog",
      "openai/toolInvocation/invoked": "DS4CC catalog ready",
    },
  }, async ({ query }) => {
    const normalizedQuery = query?.toLocaleLowerCase() ?? "";
    const plugins = loadCatalog().filter((plugin) => {
      if (!normalizedQuery) return true;
      return [plugin.name, plugin.displayName, plugin.shortDescription, plugin.category, ...plugin.capabilities]
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
    });
    return {
      structuredContent: { plugins, total: plugins.length, query: query ?? "" },
      content: [{ type: "text", text: plugins.length
        ? `Found ${plugins.length} DS4CC plugin${plugins.length === 1 ? "" : "s"}.`
        : `No DS4CC plugins matched "${query}".` }],
      _meta: {},
    };
  });

  return server;
}

function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{max-width:760px;margin:8vh auto;padding:0 20px;background:#10140f;color:#e8f3df;font:16px/1.6 system-ui}a{color:#a7f26b}code{color:#c6ff9f}</style><h1>${title}</h1>${body}</html>`;
}

export function createApp() {
  const app = createMcpExpressApp({ host: "0.0.0.0", allowedHosts: [...allowedHosts] });
  const sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();
  app.disable("x-powered-by");
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  app.get("/", (_req, res) => res.type("html").send(page("DS4CC Marketplace", `<p>A public, read-only catalog of agent plugins for Codex, Claude Code, Copilot CLI, and OpenCode.</p><p>MCP endpoint: <code>${APP_ORIGIN}/mcp</code></p><p><a href="https://github.com/VeigaPunk/ds4cc-marketplace">Source and support</a></p>`)));
  app.get("/health", (_req, res) => res.json({ status: "ok", service: "ds4cc-marketplace", version: "1.0.0" }));
  app.get("/privacy", (_req, res) => res.type("html").send(page("Privacy Policy", "<p>DS4CC Marketplace does not require accounts, store user data, or use tracking cookies. Tool calls receive only the optional catalog search text and return public repository metadata. Standard infrastructure logs may retain request timing, status, and network metadata for security and reliability.</p>")));
  app.get("/terms", (_req, res) => res.type("html").send(page("Terms of Use", "<p>The catalog is provided as-is. Review plugin source and permissions before installation. DS4CC does not execute installations or modify user systems through this app.</p>")));
  app.get("/support", (_req, res) => res.redirect(302, "https://github.com/VeigaPunk/ds4cc-marketplace/issues"));
  app.get("/.well-known/openai-apps-challenge", (_req, res) => {
    const token = process.env.OPENAI_APPS_CHALLENGE;
    if (!token) return res.status(404).type("text").send("Not configured");
    return res.type("text/plain").send(token);
  });

  app.post("/mcp", async (req, res) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let session = sessionId ? sessions.get(sessionId) : undefined;
      if (!session && !sessionId && isInitializeRequest(req.body)) {
        const server = createServer();
        let transport: StreamableHTTPServerTransport;
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: randomUUID,
          allowedOrigins: [...allowedOrigins],
          enableDnsRebindingProtection: true,
          onsessioninitialized: (initializedId): void => {
            sessions.set(initializedId, { server, transport });
          },
        });
        transport.onclose = () => {
          const initializedId = transport.sessionId;
          if (initializedId) sessions.delete(initializedId);
          void server.close();
        };
        await server.connect(transport);
        session = { server, transport };
      }
      if (!session) {
        return res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Invalid or missing MCP session" }, id: null });
      }
      const { transport } = session;
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP request failed", error);
      if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  });
  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const session = sessionId ? sessions.get(sessionId) : undefined;
    if (!session) return res.status(400).type("text").send("Invalid or missing MCP session");
    await session.transport.handleRequest(req, res);
  });
  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const session = sessionId ? sessions.get(sessionId) : undefined;
    if (!session) return res.status(400).type("text").send("Invalid or missing MCP session");
    await session.transport.handleRequest(req, res);
  });
  app.all("/mcp", (_req, res) => res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null }));
  return app;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  createApp().listen(PORT, "0.0.0.0", () => console.log(`DS4CC Marketplace listening on port ${PORT}`));
}
