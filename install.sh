#!/bin/bash
# The Almanacker installer — sets up the almanack CLI + Claude agent.
# Idempotent: safe to re-run.

set -e

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "→ The Almanacker installer"

# 1. Install agent-browser if missing
if ! command -v agent-browser >/dev/null 2>&1; then
  echo "→ Installing agent-browser..."
  npm install -g agent-browser
  agent-browser install
fi
echo "✓ agent-browser present ($(agent-browser --version))"

# 2. Symlink almanack CLI into PATH
mkdir -p ~/.local/bin
ln -sf "$HERE/almanack" ~/.local/bin/almanack
chmod +x "$HERE/almanack"
echo "✓ almanack CLI at ~/.local/bin/almanack"

# 3. Deploy Claude agent (user-level, available in any session)
mkdir -p ~/.claude/agents
ln -sf "$HERE/the-almanacker.md" ~/.claude/agents/the-almanacker.md
echo "✓ Claude agent at ~/.claude/agents/the-almanacker.md"

# 4. Verify PATH contains ~/.local/bin
case ":$PATH:" in
  *":$HOME/.local/bin:"*) echo "✓ ~/.local/bin is in PATH";;
  *) echo "⚠ ~/.local/bin is NOT in PATH — add to your shell rc: export PATH=\"\$HOME/.local/bin:\$PATH\"";;
esac

echo ""
echo "Next step: launch your Windows Chrome Dev with CDP enabled (shared with"
echo "the-puppeteer and the-musketeer)."
echo ""
echo "  1. Close any running Chrome Dev instance (including tray background processes)."
echo "  2. Relaunch Chrome Dev with remote-debugging + isolated user-data-dir. Example shortcut target:"
echo "       \"C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe\" --user-data-dir=C:\\ChromeAutomation --remote-debugging-port=9222 --no-first-run --no-default-browser-check"
echo "     (The --user-data-dir flag is mandatory — Chrome silently disables CDP on the default profile.)"
echo "  3. Sign into notebooklm.google.com in that Chrome with the Google account that owns your notebooks."
echo "  4. Open a specific notebook in a tab (dashboard tabs do not count — no chat surface)."
echo "  5. From WSL, verify: curl -s http://localhost:9222/json/version"
echo "  6. Test: almanack \"hello\"  (should print '✓ Prompt fired.' and exit immediately)"
echo ""
echo "Auth is handled by your real Chrome session — no cookie export, no session JSON."
echo "Remember: almanack is fire-and-forget. Read the answer in notebooklm.google.com, not the terminal."
