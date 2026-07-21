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

# 4. Install native Omarchy/Linux automation helpers
mkdir -p ~/.local/bin
ln -sf "$HERE/scripts/setup-grok-build" ~/.local/bin/setup-grok-build
chmod +x "$HERE/scripts/"*
"$HERE/scripts/install-chrome-aliases"
echo "✓ automation helpers at ~/.local/bin/{musketeer-chrome,ds4cc-chrome,setup-grok-build}"

# 5. Verify PATH contains ~/.local/bin
case ":$PATH:" in
  *":$HOME/.local/bin:"*) echo "✓ ~/.local/bin is in PATH";;
  *) echo "⚠ ~/.local/bin is NOT in PATH — add to your shell rc: export PATH=\"\$HOME/.local/bin:\$PATH\"";;
esac

echo ""
echo "Next steps (native Linux/Omarchy):"
echo "  1. Install isolated Canary: $HERE/scripts/install-automation-chrome"
echo "  2. Launch it: musketeer-chrome"
echo "  3. Sign into grok.com once; the dedicated profile persists authentication."
echo "  4. Configure official Grok Build with DS4CC: setup-grok-build"
echo "  5. Verify CDP: curl -s http://127.0.0.1:9222/json/version"
echo ""
echo "No cookie export is used or required."
