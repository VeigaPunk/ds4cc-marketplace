#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_REPO:?Set GITHUB_REPO as user/repo"

cd "$(dirname "$0")"

git remote add origin "git@github.com:${GITHUB_REPO}.git" || true
git push -u origin main

echo "Open GitHub repo settings and enable Pages: Source = GitHub Actions"
echo "Then set Custom domain = ds4cc.com in Pages settings"
