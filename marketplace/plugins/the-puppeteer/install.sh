#!/bin/bash
# The Puppeteer installer — sets up the chitchat CLI + Claude agent.
# Idempotent: safe to re-run.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NATIVE_SERVICE_INSTALLED=false

echo "→ The Puppeteer installer"

# 1. Install agent-browser if missing
if ! command -v agent-browser >/dev/null 2>&1; then
  echo "→ Installing agent-browser..."
  npm install -g agent-browser
  agent-browser install
fi
echo "✓ agent-browser present ($(agent-browser --version))"

# 2. Install the CLI and its helper together, then expose a stable PATH symlink.
INSTALL_DIR="$HOME/.local/lib/ds4cc/the-puppeteer"
mkdir -p "$HOME/.local/bin" "$INSTALL_DIR"
install -m 0755 "$HERE/chitchat" "$INSTALL_DIR/chitchat"
install -m 0644 "$HERE/chitchat-batch.mjs" "$INSTALL_DIR/chitchat-batch.mjs"
ln -sfn "$INSTALL_DIR/chitchat" "$HOME/.local/bin/chitchat"
echo "✓ chitchat CLI + helper installed under $INSTALL_DIR"

# 3. Deploy Claude agent (user-level, available in any session)
mkdir -p ~/.claude/agents
ln -sf "$HERE/the-puppeteer.md" ~/.claude/agents/the-puppeteer.md
echo "✓ Claude agent at ~/.claude/agents/the-puppeteer.md"

# 4. On native Linux, render and enable the hardened user service when a
# packaged Chromium binary and a working user systemd are available.
if [[ "$(uname -s)" == Linux && -z "${WSL_DISTRO_NAME:-}" ]] \
    && command -v systemctl >/dev/null 2>&1 && systemctl --user show-environment >/dev/null 2>&1; then
  CHROMIUM_BINARY=""
  for candidate in /usr/lib/chromium/chromium /usr/lib/chromium-browser/chromium-browser /usr/bin/chromium /usr/bin/chromium-browser; do
    if [[ -x "$candidate" ]]; then CHROMIUM_BINARY=$candidate; break; fi
  done
  if [[ -n "$CHROMIUM_BINARY" ]]; then
    SERVICE_DIR="$HOME/.config/systemd/user"
    mkdir -p "$SERVICE_DIR" "$HOME/.local/share/ds4cc/chromium-cdp"
    while IFS= read -r line || [[ -n "$line" ]]; do
      printf '%s\n' "${line//@CHROMIUM_BINARY@/$CHROMIUM_BINARY}"
    done <"$HERE/ds4cc-cdp.service" >"$SERVICE_DIR/ds4cc-cdp.service.tmp"
    chmod 0644 "$SERVICE_DIR/ds4cc-cdp.service.tmp"
    mv -f "$SERVICE_DIR/ds4cc-cdp.service.tmp" "$SERVICE_DIR/ds4cc-cdp.service"
    systemctl --user daemon-reload
    systemctl --user enable ds4cc-cdp.service
    systemctl --user restart ds4cc-cdp.service
    NATIVE_SERVICE_INSTALLED=true
    echo "✓ native Linux CDP service enabled with $CHROMIUM_BINARY"
  else
    echo "⚠ native Linux service skipped: packaged Chromium binary not found"
  fi
fi

# 5. Verify PATH contains ~/.local/bin
case ":$PATH:" in
  *":$HOME/.local/bin:"*) echo "✓ ~/.local/bin is in PATH";;
  *) echo "⚠ ~/.local/bin is NOT in PATH — add to your shell rc: export PATH=\"\$HOME/.local/bin:\$PATH\"";;
esac

echo ""
if $NATIVE_SERVICE_INSTALLED; then
  echo "Next step: open the dedicated Chromium window, sign in once, and verify:"
  echo "  curl --fail http://127.0.0.1:9222/json/version"
else
  echo "Next step: on WSL, launch Windows Chrome Dev with CDP enabled."
  echo ""
  echo "  1. Close any running Chrome Dev instance (including tray background processes)."
  echo "  2. Relaunch Chrome Dev with remote-debugging + isolated user-data-dir. Example shortcut target:"
  echo "       \"C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe\" \"--user-data-dir=C:\\ChromeAutomation\" --remote-debugging-port=9222 --no-first-run --no-default-browser-check"
  echo "     (The --user-data-dir flag is mandatory — Chrome silently disables CDP on the default profile.)"
  echo "  3. Sign into chatgpt.com in that Chrome with your Plus/Pro account."
  echo "  4. From WSL, verify: curl -s http://localhost:9222/json/version"
fi
echo ""
echo "Auth is handled by your real Chrome session — no cookie export, no session JSON."
echo "Remember: chitchat is fire-and-forget. Read the answer in chatgpt.com, not the terminal."
