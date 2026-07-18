# DS4CC Apps SDK wrapper

Read-only MCP app and widget for browsing the DS4CC plugin catalog in ChatGPT and Codex.

## Local development

```bash
cd apps-sdk
npm install
npm run build
npm start
```

Connect MCP Inspector or ChatGPT Developer Mode to `http://localhost:3000/mcp`. The production endpoint is `https://app.ds4cc.com/mcp`.

## Deploy

The included `Dockerfile` runs on any container host; `render.yaml` supplies a Render blueprint. Deploy the repository, add `app.ds4cc.com` as the service custom domain, and create the DNS record shown by the host. Set `OPENAI_APPS_CHALLENGE` to the exact token issued by the OpenAI plugin portal before domain verification.

Required public URLs:

- Website: `https://app.ds4cc.com/`
- MCP: `https://app.ds4cc.com/mcp`
- Privacy: `https://app.ds4cc.com/privacy`
- Terms: `https://app.ds4cc.com/terms`
- Support: `https://app.ds4cc.com/support`
- Domain challenge: `https://app.ds4cc.com/.well-known/openai-apps-challenge`

No OAuth is required because the app exposes only public, read-only repository metadata.
