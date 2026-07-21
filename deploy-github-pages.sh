#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_REPO:?Set GITHUB_REPO as user/repo}"
CUSTOM_DOMAIN="${CUSTOM_DOMAIN:-ds4cc.com}"

cd "$(dirname "$0")"

printf '%s\n' "$CUSTOM_DOMAIN" > CNAME

git remote add origin "git@github.com:${GITHUB_REPO}.git" || true
git push -u origin main

owner="${GITHUB_REPO%%/*}"
echo "Pages deploys via .github/workflows/pages.yml (Source = GitHub Actions)."
echo "Custom domain: ${CUSTOM_DOMAIN}"
echo "DNS (apex ${CUSTOM_DOMAIN}):"
echo "  A    @ -> 185.199.108.153"
echo "  A    @ -> 185.199.109.153"
echo "  A    @ -> 185.199.110.153"
echo "  A    @ -> 185.199.111.153"
echo "  AAAA @ -> 2606:50c0:8000::153"
echo "  AAAA @ -> 2606:50c0:8001::153"
echo "  AAAA @ -> 2606:50c0:8002::153"
echo "  AAAA @ -> 2606:50c0:8003::153"
echo "DNS (www): CNAME www -> ${owner}.github.io"
