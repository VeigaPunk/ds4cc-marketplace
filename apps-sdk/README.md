# DS4CC Apps SDK wrapper

Read-only MCP app and widget for browsing an explicitly reviewed subset of the DS4CC Codex plugin catalog. The separate public Git marketplace retains all 12 plugins.

## Local development

```bash
cd apps-sdk
npm install
npm run build
npm start
```

Connect MCP Inspector or ChatGPT Developer Mode to `http://localhost:3000/mcp`. The production endpoint is `https://app.ds4cc.com/mcp`.

## Deploy

The included `Dockerfile` runs on any container host; the repository-root `render.yaml` supplies a Render blueprint. Deploy the repository, add `app.ds4cc.com` as the service custom domain, and create the DNS record shown by the host. Set `OPENAI_APPS_CHALLENGE` to the exact token issued by the OpenAI plugin portal before domain verification. The challenge response is deliberately non-cacheable.

Unauthenticated MCP sessions are bounded and automatically closed when idle. `MAX_UNAUTHENTICATED_SESSIONS` defaults to `64`, and `MCP_SESSION_IDLE_TIMEOUT_MS` defaults to `120000` (two minutes); both can be overridden with positive integer values.

Required public URLs:

- Website: `https://app.ds4cc.com/`
- MCP: `https://app.ds4cc.com/mcp`
- Privacy: `https://app.ds4cc.com/privacy`
- Terms: `https://app.ds4cc.com/terms`
- Support: `https://app.ds4cc.com/support`
- Domain challenge: `https://app.ds4cc.com/.well-known/openai-apps-challenge`

No OAuth is required because the app exposes only public, read-only repository metadata.

The submission logo is available as `assets/logo.svg` and `assets/logo-512.png`; both are square and contain the same artwork.

## Production smoke check

After DNS, TLS, deployment, and the portal challenge are configured, keep the token out of shell arguments and run:

```bash
EXPECTED_CHALLENGE='portal-token' ../scripts/smoke-deployment.sh https://app.ds4cc.com
```

The script prints no token. It checks DNS, HTTPS, health, website/legal/support routes, challenge exactness, and MCP initialize, tool listing, tool call, and widget resource reads. See `SUBMISSION.md` for the complete portal packet and external gates.
