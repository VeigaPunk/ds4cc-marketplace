#!/bin/bash
set -euo pipefail

if command -v systemctl >/dev/null 2>&1 && systemctl --user cat ds4cc-cdp.service >/dev/null 2>&1; then
  systemctl --user disable --now ds4cc-cdp.service
fi
rm -f "$HOME/.config/systemd/user/ds4cc-cdp.service"
if command -v systemctl >/dev/null 2>&1; then
  systemctl --user daemon-reload
fi
if [[ -L "$HOME/.local/bin/chitchat" ]] \
    && [[ "$(readlink "$HOME/.local/bin/chitchat")" == "$HOME/.local/lib/ds4cc/the-puppeteer/chitchat" ]]; then
  rm -f "$HOME/.local/bin/chitchat"
fi
rm -rf "$HOME/.local/lib/ds4cc/the-puppeteer"
if [[ -L "$HOME/.claude/agents/the-puppeteer.md" ]]; then
  rm -f "$HOME/.claude/agents/the-puppeteer.md"
fi

echo "The Puppeteer CLI, helper, agent link, and CDP user service were removed."
