#!/usr/bin/env bash
# Worker cost signals for the last 24 h from the free Cloudflare GraphQL Analytics API.
# Needs CLOUDFLARE_API_TOKEN (Account Analytics: Read) and CLOUDFLARE_ACCOUNT_ID. Usage: cf-usage.sh [script-name]
set -euo pipefail
name=${1:-$(jq -r '.name // empty' wrangler.jsonc 2>/dev/null || grep -m1 '^name' wrangler.toml | cut -d'"' -f2)}
since=$(date -u -d '-1 day' +%FT%TZ 2>/dev/null || date -u -v-1d +%FT%TZ); until=$(date -u +%FT%TZ)
q='query($a:String!,$n:String!,$s:Time!,$u:Time!){viewer{accounts(filter:{accountTag:$a}){workersInvocationsAdaptive(limit:1,filter:{scriptName:$n,datetime_geq:$s,datetime_leq:$u}){sum{requests errors}quantiles{cpuTimeP50 cpuTimeP99}}}}}'
jq -n --arg q "$q" --arg a "$CLOUDFLARE_ACCOUNT_ID" --arg n "$name" --arg s "$since" --arg u "$until" \
  '{query:$q,variables:{a:$a,n:$n,s:$s,u:$u}}' \
| curl -fsS https://api.cloudflare.com/client/v4/graphql -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H 'Content-Type: application/json' --data @- \
| jq -r '.data.viewer.accounts[0].workersInvocationsAdaptive[0] // {} |
  "cf-usage 24h: requests \(.sum.requests // 0) (\((.sum.requests // 0) * 100 / 100000 | floor)% of free daily), errors \(.sum.errors // 0), CPU p50 \(.quantiles.cpuTimeP50 // 0) us, p99 \(.quantiles.cpuTimeP99 // 0) us (free limit 10000 us)"'
