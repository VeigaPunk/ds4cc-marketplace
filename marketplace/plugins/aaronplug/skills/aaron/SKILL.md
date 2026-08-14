---
name: aaron
description: Invoke the aaron CLI over Bash to search and fetch books or papers. Use when scout or any agent needs a local cataloged file. Not an agent and not MCP — a Bash-invocable tool only.
---

# aaron — CLI tool

`aaron` is a **CLI binary**. It is not an agent, not an MCP server, and not a skill pack. Call it from Bash (`scout` is the primary caller). Stdout is JSON only.

## Invoke

```bash
aaron books search "<query>" [-f epub|pdf|all] [-l english|all]
aaron books get <md5> [-o ~/aaron-library]
aaron books url <md5>
aaron books batch <md5-list-file> [-o ~/aaron-library]
aaron papers fetch <doi-or-arxiv> [-m auto|arxiv|s2|scihub]
aaron help
```

## Install (fnm, Node ≥20, no bun)

```bash
eval "$(fnm env --shell bash)"
cd <aaronplug>
npm install
npm run build
npm link
command -v aaron
```

## Scout contract

1. Prefer `aaron` over a browser download when the task needs a local cataloged book or paper.
2. Parse JSON stdout. Never invent paths.
3. Cite `path` / DOI / MD5 in findings.
4. Respect copyright. Do not use `aaron` to obtain works you are not entitled to possess.

Default output directory: `~/aaron-library`. Progress and warnings go to stderr.
