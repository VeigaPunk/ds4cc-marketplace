#!/bin/bash
# The KimiRaikoner installer — sets up the kimiraikoner CLI + Claude agent.
# Idempotent: safe to re-run. Almanacker-minimal: no new chrome launcher.

set -e

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "→ The KimiRaikoner installer"

# 1. Install agent-browser if missing
if ! command -v agent-browser >/dev/null 2>&1; then
  echo "→ Installing agent-browser..."
  npm install -g agent-browser
  agent-browser install
fi
echo "✓ agent-browser present ($(agent-browser --version))"

# 2. Symlink kimiraikoner CLI into PATH
#    Binary is kimiraikoner (NOT kimi — PATH collision with official Kimi Code CLI).
mkdir -p ~/.local/bin
ln -sf "$HERE/kimiraikoner" ~/.local/bin/kimiraikoner
chmod +x "$HERE/kimiraikoner"
echo "✓ kimiraikoner CLI at ~/.local/bin/kimiraikoner"

# 3. Deploy Claude agent (user-level, available in any session)
mkdir -p ~/.claude/agents
ln -sf "$HERE/the-kimiraikoner.md" ~/.claude/agents/the-kimiraikoner.md
echo "✓ Claude agent at ~/.claude/agents/the-kimiraikoner.md"

# 4. Verify PATH contains ~/.local/bin
case ":$PATH:" in
  *":$HOME/.local/bin:"*) echo "✓ ~/.local/bin is in PATH";;
  *) echo "⚠ ~/.local/bin is NOT in PATH — add to your shell rc: export PATH=\"\$HOME/.local/bin:\$PATH\"";;
esac

echo ""
echo "Next step: use the shared family CDP Chrome (same as the-puppeteer,"
echo "the-musketeer, the-almanacker). No separate launcher."
echo ""
echo "  1. Ensure Chrome Dev is running with remote-debugging + isolated user-data-dir."
echo "  2. Sign into https://www.kimi.com in that Chrome profile."
echo "  3. From WSL/Linux, verify: curl -s http://127.0.0.1:9222/json/version"
echo "  4. Test: kimiraikoner \"hello\"  (should print '✓ Prompt fired.' and exit)"
echo ""
echo "Auth is handled by your real Chrome session — no cookie export, no session JSON, no passwords."
echo "Keep CDP on loopback (127.0.0.1:9222). Prefer: printf '%s' \"\$prompt\" | kimiraikoner --stdin"
echo "Remember: kimiraikoner is fire-and-forget. Read the answer in kimi.com, not the terminal."
