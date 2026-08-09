# aaron

**Bash-invocable CLI tool** (not an agent, not a skill, not MCP).

Scout and any host with `tools: *` / `tools={*}` invoke it through the shell:

```bash
aaron books search "moby dick"
aaron books get <md5>
aaron papers fetch 10.1038/nature12373
```

Stdout is JSON. Default download dir: `~/aaron-library`.

See [TOOL.md](./TOOL.md) for the tool contract.

## Install (fnm + Node only)

```bash
eval "$(fnm env --shell bash)"
git clone https://github.com/VeigaPunk/aaronplug
cd aaronplug
npm install
npm run build
npm link
```

Requires Node ≥20 (fnm). **No bun.**

## Where it looks

- **Books** → lib* mirror network
- **Papers** → arxiv → sci-hub → Semantic Scholar (first hit)

## Fine print

<sub>Named for Aaron Swartz. Forked from `epubdomain-downloader` by Omercan Balandi — TUI stripped, paper-fetch + JSON for model/CLI drivers. Use only for works you are entitled to obtain.</sub>
