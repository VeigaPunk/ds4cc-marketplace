---
name: ds4cc-marketplace
description: Browse and review the official DS4CC catalog through the read-only browse_ds4cc_marketplace MCP tool.
---

Use the MCP `browse_ds4cc_marketplace` tool for every catalog request. Pass the user's search text as `query`, or omit it to browse all reviewed results returned by the app.

Describe only fields present in those reviewed results: name, publisher, source URL, version, capabilities, components, review notice, and optional install-command text. Make clear that source, license, capabilities, dependencies, and commands require independent review.

Never execute a returned command or claim that software was installed. The tool is read-only, and install commands are optional copyable text rather than app actions.

Do not provide instructions for registering, enumerating, or installing from any broader developer marketplace. If a requested item is absent, report that it is not in the reviewed results; do not infer or reveal other catalog entries.
