# OpenAI plugin submission packet

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
- Logo: `assets/logo-512.png` (512×512); editable source: `assets/logo.svg`.

## Tool annotation justifications

- `readOnlyHint: true`: the sole tool reads versioned public catalog files and has no mutation path.
- `destructiveHint: false`: the tool cannot delete, overwrite, install, or trigger an external action.
- `openWorldHint: false`: the tool cannot post, message, submit, or otherwise change public internet state.

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

1. In a global-data-residency OpenAI project, complete individual or business identity verification for the publisher name and confirm the operator has `api.apps.read` and `api.apps.write`.
2. Deploy the repository-root Render blueprint, attach `app.ds4cc.com` with valid HTTPS, and create the DNS record Render provides. Do not substitute a placeholder endpoint.
3. Set `OPENAI_APPS_CHALLENGE` to the portal-issued token and verify the well-known endpoint returns only that token with `Cache-Control: no-store`.
4. In the plugin submission portal, create a plugin draft containing an app, enter the universal MCP URL `https://app.ds4cc.com/mcp`, select no authentication, and scan tools.
5. Confirm the discovered tool has `readOnlyHint: true`, `openWorldHint: false`, and `destructiveHint: false`; confirm the linked UI resource reports an explicit CSP with empty connect and resource domain lists.
6. Upload `assets/logo-512.png`, enter the listing metadata and localization information, and run the five positive plus three negative cases above on ChatGPT web and mobile. Record the actual responses in the portal; do not invent them before the public endpoint exists.
7. Submit for review. After approval, explicitly publish and copy the directory URL from the portal.

## External boundary

Deployment requires an authenticated Render account with access to the target service, DNS control for `ds4cc.com`, and the portal-issued domain token. Submission additionally requires a verified OpenAI publisher with app read/write permissions. None of these credentials or states are represented in this repository.
