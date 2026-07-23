# DS4CC Marketplace

Documentation-only plugin for the public DS4CC multi-CLI marketplace, maintained by VeigaPunk.

This plugin explains how to review and register the marketplace and how to choose install commands for **Grok Build**, Codex, Claude Code, Kimi Code CLI, **Crush CLI**, and GitHub Copilot CLI. It does not install or execute anything automatically.

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

## Quick start (Crush CLI)

Crush discovers skills from directories listed in `crush.json` `options.skills_paths`. After reviewing the source, copy the meta-plugin's skills into your local Crush skills directory:

```bash
mkdir -p ~/.config/crush/skills
cp -r skills/* ~/.config/crush/skills/
```

Or add this plugin's `./skills/` path to `~/.config/crush/crush.json`, then reload Crush.

## Links

- Homepage: <https://ds4cc.com/>
- Repository: <https://github.com/VeigaPunk/ds4cc-marketplace>

## License

MIT. See [`LICENSE`](LICENSE).
