#!/bin/bash
# The Musketeer installer — sets up the grok CLI + Claude agent.
# Idempotent: safe to re-run.

set -e

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "→ The Musketeer installer"

# 1. Install agent-browser if missing
if ! command -v agent-browser >/dev/null 2>&1; then
  echo "→ Installing agent-browser..."
  npm install -g agent-browser
  agent-browser install
fi
echo "✓ agent-browser present ($(agent-browser --version))"

# 2. Symlink grok CLI into PATH
mkdir -p ~/.local/bin
ln -sf "$HERE/grok" ~/.local/bin/grok
chmod +x "$HERE/grok"
echo "✓ grok CLI at ~/.local/bin/grok"

# 3. Deploy Claude agent (user-level, available in any session)
mkdir -p ~/.claude/agents
ln -sf "$HERE/the-musketeer.md" ~/.claude/agents/the-musketeer.md
echo "✓ Claude agent at ~/.claude/agents/the-musketeer.md"

# 4. Verify PATH contains ~/.local/bin
case ":$PATH:" in
  *":$HOME/.local/bin:"*) echo "✓ ~/.local/bin is in PATH";;
  *) echo "⚠ ~/.local/bin is NOT in PATH — add to your shell rc: export PATH=\"\$HOME/.local/bin:\$PATH\"";;
esac

echo ""
echo "Next step: launch your Windows Chrome Dev with CDP enabled."
echo ""
echo "  1. Close any running Chrome Dev instance."
echo "  2. Relaunch Chrome Dev with the remote-debugging flag. For example:"
echo "       \"C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe\" --remote-debugging-port=9222"
echo "     (Create a Windows shortcut with this flag for convenience.)"
echo "  3. Sign into grok.com with your SuperGrok account in that Chrome."
echo "  4. From WSL, verify: curl -s http://localhost:9222/json/version"
echo "  5. Test: grok \"hello\""
echo ""
echo "Auth is handled by your real Chrome session — no cookie export needed."
