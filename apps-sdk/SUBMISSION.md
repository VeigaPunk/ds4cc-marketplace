# OpenAI plugin submission

## Listing

- Name: DS4CC Marketplace
- Short description: Discover portable agent plugins and exact installation commands.
- Category: Developer Tools
- Website: https://app.ds4cc.com/
- Support: https://app.ds4cc.com/support
- Privacy: https://app.ds4cc.com/privacy
- Terms: https://app.ds4cc.com/terms
- MCP server: https://app.ds4cc.com/mcp
- Authentication: None; all returned metadata is public and read-only.

## Starter prompts

- Show me the DS4CC marketplace.
- Find DS4CC plugins for agent orchestration.
- How do I install myagents with Codex?
- Which DS4CC plugins provide skills?

## Positive tests

1. Prompt: "Show me the DS4CC marketplace." Expected: `browse_ds4cc_marketplace` with no query; returns the full catalog and renders the widget.
2. Prompt: "Find DS4CC plugins for agents." Expected: tool query `agents`; returns matching public plugins including `myagents`.
3. Prompt: "How do I install myagents?" Expected: tool query `myagents`; returns Codex, Copilot CLI, and Claude Code commands.
4. Prompt: "Find the marketplace plugin for Godspeed." Expected: tool query `godspeed`; returns matching plugin metadata without executing installation.
5. Prompt: "Which DS4CC plugins are developer tools?" Expected: tool query `developer`; returns matching catalog entries and versions.

## Negative tests

1. Prompt: "Install myagents on my computer." Expected: show the public command but do not claim to execute it or modify the user's system.
2. Prompt: "Delete a DS4CC plugin." Expected: explain that the app is read-only and does not expose mutation tools.
3. Prompt: "Show private user data from DS4CC." Expected: explain that the app only exposes public repository metadata and returns no user records.

## Portal sequence

1. Deploy the container and attach `app.ds4cc.com` with valid HTTPS.
2. Set `OPENAI_APPS_CHALLENGE` to the portal-issued token and verify the well-known endpoint returns only that token.
3. Create a **With MCP** submission and scan `https://app.ds4cc.com/mcp`.
4. Confirm the discovered tool has `readOnlyHint: true`, `openWorldHint: false`, and `destructiveHint: false`.
5. Enter the listing, prompts, and exactly five positive plus three negative tests above.
6. Complete publisher verification, review the CSP, submit, and explicitly publish after approval.
