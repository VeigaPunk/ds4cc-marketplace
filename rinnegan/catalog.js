globalThis.DS4CC_RINNEGAN_CATALOG = Object.freeze([
  {
    "n": "omp",
    "v": "latest",
    "cat": "cli",
    "d": "Oh My Pi coding-agent CLI — the one CLI to rule them all. Native UFO-FSD substrate; runs the full DS4CC/XBGST stack locally, no bridge zoo.",
    "c": "curl -fsSL https://omp.sh/install | sh",
    "localCommand": "omp",
    "kind": "host-cli",
    "action": "COPY INSTALL",
    "admitted": true,
    "rinnegan": true,
    "shipped": true,
    "provenance": "https://github.com/can1357/oh-my-pi",
    "bootstrap": "upstream-installer"
  },
  {
    "n": "pubstomper",
    "v": "latest",
    "cat": "game",
    "d": "Thursday Arena solver — bit-exact combat sim (mulberry32), full-match draft solver, live CDP pilot. The pubstomper is up for grabs.",
    "c": "git clone https://github.com/VeigaPunk/pubstomper.git",
    "localCommand": "bun check.mjs",
    "kind": "repo",
    "action": "COPY CLONE",
    "admitted": true,
    "rinnegan": true,
    "shipped": true,
    "provenance": "https://github.com/VeigaPunk/pubstomper",
    "bootstrap": "git-clone"
  },
  {
    "n": "rea",
    "v": "latest",
    "cat": "security",
    "d": "Reverse Engineer Anything — MCP server + CLI connecting agents to Ghidra/Hopper/IDA/browser/JADX for evidence-backed analysis of binaries, apps, websites. External; MCP — not Titanium default. Local execution.",
    "c": "npx rea-agents setup",
    "localCommand": "rea",
    "kind": "repo",
    "action": "COPY SETUP",
    "admitted": true,
    "rinnegan": true,
    "shipped": true,
    "provenance": "https://github.com/morluto/rea",
    "bootstrap": "npx-setup"
  }
]);
