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
  components: z.array(z.string()),
  publisher: z.string(),
  sourceUrl: z.string().url(),
  reviewNotice: z.string(),
  install: z.object({ codex: z.string() }),
});

export function createServer(): McpServer {
  const server = new McpServer(
    { name: "ds4cc-marketplace", version: "1.0.0" },
    { instructions: "Use browse_ds4cc_marketplace to discover the explicitly reviewed DS4CC catalog. The catalog is public and read-only. Install commands are optional copyable text only: require independent source, license, and capability review, never execute a command, and never claim installation occurred." },
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
        "openai/widgetDescription": "A read-only catalog of reviewed DS4CC plugins with sourced Codex commands and review guidance.",
      },
    }],
  }));

  registerAppTool(server, "browse_ds4cc_marketplace", {
    title: "Browse DS4CC Marketplace",
    description: "Lists explicitly reviewed public DS4CC plugins, provenance, capabilities, and optional copyable Codex command text. It never installs or executes software. Optionally filters by plugin name, description, category, or capability.",
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

type SessionState = {
  id?: string;
  server: McpServer;
  transport: StreamableHTTPServerTransport;
  lastActivityAt: number;
  activeRequests: number;
  idleCleanup?: { cancel(): void };
  closed: boolean;
};

type CleanupSession = Pick<SessionState, "id" | "idleCleanup" | "closed"> & {
  server: Pick<McpServer, "close">;
  transport: Pick<StreamableHTTPServerTransport, "onclose">;
};

export function cleanupMcpSession<T extends CleanupSession>(sessions: Map<string, T>, session: T): void {
  if (session.closed) return;
  session.closed = true;
  session.idleCleanup?.cancel();
  session.idleCleanup = undefined;
  if (session.id && sessions.get(session.id) === session) sessions.delete(session.id);
  session.transport.onclose = undefined;
  void session.server.close().catch(() => {});
}

type AppOptions = {
  maxUnauthenticatedSessions?: number;
  sessionIdleTimeoutMs?: number;
  now?: () => number;
  scheduleIdleCleanup?: (callback: () => void, delayMs: number) => { cancel(): void };
};

function positiveInteger(value: number | string | undefined, fallback: number, minimum: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= minimum ? Math.floor(parsed) : fallback;
}

function scheduleIdleCleanup(callback: () => void, delayMs: number): { cancel(): void } {
  const timer = setTimeout(callback, delayMs);
  timer.unref();
  return { cancel: () => clearTimeout(timer) };
}

export function createApp(options: AppOptions = {}) {
  const app = createMcpExpressApp({ host: "0.0.0.0", allowedHosts: [...allowedHosts] });
  const sessions = new Map<string, SessionState>();
  const maxSessions = positiveInteger(options.maxUnauthenticatedSessions ?? process.env.MAX_UNAUTHENTICATED_SESSIONS, 64, 1);
  const idleTimeoutMs = positiveInteger(options.sessionIdleTimeoutMs ?? process.env.MCP_SESSION_IDLE_TIMEOUT_MS, 120_000, 1_000);
  const now = options.now ?? Date.now;
  const schedule = options.scheduleIdleCleanup ?? scheduleIdleCleanup;
  let initializingSessions = 0;

  const cleanupSession = (session: SessionState): void => cleanupMcpSession(sessions, session);

  const armIdleCleanup = (session: SessionState): void => {
    session.idleCleanup?.cancel();
    const remaining = Math.max(0, idleTimeoutMs - (now() - session.lastActivityAt));
    session.idleCleanup = schedule(() => {
      session.idleCleanup = undefined;
      if (session.closed) return;
      if (session.activeRequests > 0) {
        session.lastActivityAt = now();
        armIdleCleanup(session);
      } else if (now() - session.lastActivityAt >= idleTimeoutMs) {
        cleanupSession(session);
      } else {
        armIdleCleanup(session);
      }
    }, remaining);
  };

  const handleSessionRequest = async (session: SessionState, req: Request, res: Response, body?: unknown): Promise<void> => {
    session.activeRequests += 1;
    session.lastActivityAt = now();
    armIdleCleanup(session);
    try {
      await session.transport.handleRequest(req, res, body);
    } finally {
      session.activeRequests -= 1;
      if (!session.closed) {
        session.lastActivityAt = now();
        armIdleCleanup(session);
      }
    }
  };

  app.disable("x-powered-by");
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  app.get("/", (_req, res) => res.type("html").send(page("DS4CC Marketplace", `<p>A public, read-only catalog of reviewed Codex plugins. Results include source provenance, publisher, capabilities, and commands; review every plugin before installation.</p><p>MCP endpoint: <code>${APP_ORIGIN}/mcp</code></p><nav><a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Use</a> · <a href="/support">Support</a> · <a href="https://github.com/VeigaPunk/ds4cc-marketplace/tree/main/official/ds4cc">Public source</a></nav>`)));
  app.get("/health", (_req, res) => res.json({ status: "ok", service: "ds4cc-marketplace", version: "1.0.0" }));
  app.get("/privacy", (_req, res) => res.type("html").send(page("Privacy Policy", `<p><strong>Effective date: July 19, 2026.</strong></p><h2>Data and purpose</h2><p>No account is required. The app receives an optional catalog search query to filter public repository metadata. Raw search queries are processed in memory and are not persisted by the app. We do not use advertising trackers or tracking cookies.</p><p>Hosting infrastructure may process IP address, request time, route, response status, user agent, and security diagnostics to deliver, secure, and troubleshoot the service. The app operator does not intentionally retain or export application-level diagnostic records for more than 30 days. Infrastructure providers may keep their own security and access records under their published retention rules or narrowly required legal preservation.</p><h2>Recipients</h2><p>Recipient categories are infrastructure service providers that host and protect the app, and OpenAI when a user invokes the app through an OpenAI product. Public GitHub content is fetched from the deployed repository copy; GitHub receives a request only if a user follows a source or support link. We do not sell personal data.</p><h2>Controls and contact</h2><p>Do not include personal or confidential information in a query. Because the app does not persist raw queries or maintain accounts, it usually has no query record to access or delete. For access, deletion, objection, or privacy questions concerning limited infrastructure records, open a <a href="https://github.com/VeigaPunk/ds4cc-marketplace/issues/new">GitHub issue</a> without posting sensitive data; request a private follow-up through the maintainer's <a href="https://github.com/VeigaPunk">GitHub profile</a>. Provider-level controls remain available through the platform used to invoke the app.</p>`)));
  app.get("/terms", (_req, res) => res.type("html").send(page("Terms of Use", `<p><strong>Effective date: July 19, 2026.</strong> The app provides a read-only index of public developer materials and does not install, execute, authenticate to, or modify software or systems.</p><p>Optional install commands are copyable text only and require independent review before a user chooses to run them. Review each plugin's source, license, capabilities, dependencies, and commands. You are responsible for deciding whether third-party material is appropriate and for complying with its separate terms and licenses. Catalog inclusion is not a security warranty or endorsement.</p><p>The service and metadata are provided “as is” without warranties. To the extent permitted by law, the publisher is not liable for indirect or consequential loss arising from use of the catalog or independently installed plugins. Do not misuse the service, interfere with its operation, or submit personal, confidential, or unlawful content.</p><p>These terms may change for operational or legal reasons; the effective date will be updated. See <a href="/support">Support</a> for questions.</p>`)));
  app.get("/support", (_req, res) => res.type("html").send(page("Support", `<p>For bugs, catalog corrections, security concerns, or privacy requests, <a href="https://github.com/VeigaPunk/ds4cc-marketplace/issues/new">open a new repository issue</a>. A GitHub account is required to create an issue. Do not post secrets or sensitive personal data.</p><p>If you cannot create an issue, review existing reports on the public <a href="https://github.com/VeigaPunk/ds4cc-marketplace/issues">repository issue list</a>. This is a visibility fallback, not anonymous contact; the OpenAI portal may still require a separate anonymous support channel. No support email is represented by this project.</p><p>Include the app route, approximate time, expected behavior, and a redacted reproduction. Support is best-effort and no response time is guaranteed.</p>`)));
  app.get("/.well-known/openai-apps-challenge", (_req, res) => {
    const token = process.env.OPENAI_APPS_CHALLENGE;
    if (!token) return res.status(404).type("text").send("Not configured");
    res.setHeader("Cache-Control", "no-store");
    return res.type("text/plain").send(token);
  });

  app.post("/mcp", async (req, res) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      const session = sessionId ? sessions.get(sessionId) : undefined;
      if (!session && !sessionId && isInitializeRequest(req.body)) {
        if (sessions.size + initializingSessions >= maxSessions) {
          res.setHeader("Retry-After", "1");
          const requestId = (req.body as { id?: unknown }).id ?? null;
          return res.status(503).json({ jsonrpc: "2.0", error: { code: -32000, message: "MCP session capacity reached" }, id: requestId });
        }
        initializingSessions += 1;
        const server = createServer();
        let transport: StreamableHTTPServerTransport;
        let state: SessionState;
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: randomUUID,
          allowedOrigins: [...allowedOrigins],
          enableDnsRebindingProtection: true,
          onsessioninitialized: (initializedId): void => {
            state.id = initializedId;
            state.lastActivityAt = now();
            sessions.set(initializedId, state);
            armIdleCleanup(state);
          },
        });
        state = { server, transport, lastActivityAt: now(), activeRequests: 1, closed: false };
        transport.onclose = () => cleanupSession(state);
        try {
          await server.connect(transport);
          await transport.handleRequest(req, res, req.body);
        } finally {
          initializingSessions -= 1;
          state.activeRequests -= 1;
          if (!state.id) {
            cleanupSession(state);
          } else if (!state.closed) {
            state.lastActivityAt = now();
            armIdleCleanup(state);
          }
        }
        return;
      }
      if (!session) {
        return res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Invalid or missing MCP session" }, id: null });
      }
      await handleSessionRequest(session, req, res, req.body);
    } catch (error) {
      console.error("MCP request failed", error);
      if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  });
  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const session = sessionId ? sessions.get(sessionId) : undefined;
    if (!session) return res.status(400).type("text").send("Invalid or missing MCP session");
    await handleSessionRequest(session, req, res);
  });
  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const session = sessionId ? sessions.get(sessionId) : undefined;
    if (!session) return res.status(400).type("text").send("Invalid or missing MCP session");
    await handleSessionRequest(session, req, res);
  });
  app.all("/mcp", (_req, res) => res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null }));
  return app;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  createApp().listen(PORT, "0.0.0.0", () => console.log(`DS4CC Marketplace listening on port ${PORT}`));
}
