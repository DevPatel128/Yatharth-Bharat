#!/usr/bin/env bash
# After deploy: smoke test, then watch Sentry for new issues in this release. Usage: deploy-watch.sh <url> <sha> [minutes=10]
set -euo pipefail
url=$1; sha=$2; mins=${3:-10}; start=$(date +%s)
for p in / /api/health; do curl -fsS --max-time 10 -o /dev/null "$url$p" || { echo "watch: $p failed"; exit 1; }; done
echo "watch: smoke ok"
if [ -n "${SENTRY_AUTH_TOKEN:-}" ] && [ -n "${SENTRY_PROJECT:-}" ]; then
  for _ in $(seq "$mins"); do
    sleep 60
    n=$(curl -fsS -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
      "https://sentry.io/api/0/projects/$SENTRY_PROJECT/issues/?query=firstRelease:$sha&statsPeriod=1h" | jq length)
    [ "$n" -gt 0 ] && { echo "watch: $n new Sentry issue(s) in release $sha"; exit 1; }
  done
else
  echo "watch: Sentry not configured, smoke only"
fi
echo "watch: ok in $(( ($(date +%s) - start) / 60 )) min"
