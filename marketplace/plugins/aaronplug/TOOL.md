# Tool: `aaron`

| Field | Value |
|-------|--------|
| **Name** | `aaron` |
| **Kind** | CLI binary (Bash-invocable tool) |
| **Not** | agent · skill · MCP server · subagent type |
| **Runtime** | Node ≥20 via **fnm** only (no bun) |
| **Default output** | `~/aaron-library` |
| **Stdout** | JSON only (agent-readable) |
| **Stderr** | progress / warnings |

## Who may call it

| Caller | Access |
|--------|--------|
| **scout** | **Primary** — books/papers discovery + fetch via Bash |
| any agent with `tools: *` / `tools={*}` | full surface includes Bash → may invoke `aaron` |
| humans | same CLI |

## Invoke (from scout / any shell tool)

```bash
aaron books search "<query>" [-f epub|pdf|all] [-l english|all]
aaron books get <md5> [-o ~/aaron-library]
aaron books url <md5>
aaron books batch <md5-list-file> [-o ~/aaron-library]
aaron papers fetch <doi-or-arxiv> [-m auto|arxiv|s2|scihub]
aaron help
```

## Install (fnm)

```bash
eval "$(fnm env --shell bash)"
cd <aaronplug>
npm install
npm run build
npm link          # or: cp build/aaron.js ~/.local/bin/aaron && chmod +x ~/.local/bin/aaron
command -v aaron
```

## Scout contract

1. Prefer `aaron` over browser download for cataloged books/papers when the task needs a local file.
2. Parse JSON stdout; never invent paths.
3. Cite `path` / DOI / MD5 in findings.
4. Respect copyright: do not use `aaron` to obtain works you are not entitled to possess; refuse piracy targets when policy requires.
