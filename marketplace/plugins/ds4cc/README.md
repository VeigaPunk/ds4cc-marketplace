# DS4CC Marketplace

Documentation-only plugin for the public DS4CC multi-CLI marketplace, maintained by VeigaPunk.

This plugin explains how to review and register the marketplace and how to choose install commands for **Grok Build**, Codex, Claude Code, Copilot CLI, and Kimi Code CLI. It does not install or execute anything automatically.

## Skills

- **ds4cc-docs** — Commands to add the marketplace, list plugins, and install individual plugins. Grok-first; other CLIs included.

## Quick start (Grok Build)

```bash
grok plugin marketplace add VeigaPunk/ds4cc-marketplace
grok plugin list --available
grok plugin install "VeigaPunk/ds4cc-marketplace#marketplace/plugins/myagents" --trust
```

Paste-friendly bootstrap: see repo root [`GROK_PASTE.md`](../../../GROK_PASTE.md).

## Quick start (Codex)

```bash
codex plugin marketplace add VeigaPunk/ds4cc-marketplace
codex plugin list
codex plugin add <plugin-name>@ds4cc
```

## Quick start (Kimi Code CLI 0.28.1)

Enter these commands in the Kimi TUI:

```
/plugins marketplace https://veigapunk.github.io/ds4cc-marketplace/.kimi-plugin/marketplace.json
/plugins install <artifact-url-or-local-path>
/reload
```

The Kimi packages install plugin skills and commands, not the marketplace's custom `the-*` agent profiles. Kimi's built-in agents remain available.

## Links

- Homepage: <https://ds4cc.com/>
- Repository: <https://github.com/VeigaPunk/ds4cc-marketplace>

## License

MIT. See [`LICENSE`](LICENSE).
