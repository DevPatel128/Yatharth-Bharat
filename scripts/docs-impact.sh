#!/usr/bin/env bash
# Fails when code changes need a doc update that is missing from the same PR. Usage: docs-impact.sh <base-ref>
set -euo pipefail
f=$(git diff --name-only "${1:-origin/main}"...HEAD)
has() { printf '%s\n' "$f" | grep -qE "$1"; }
fail=0
if has '(db\.ts|schema\.sql|migrations/|/api/)' && ! has '^SYSTEM\.md$'; then echo "docs-impact: schema/API changed, update SYSTEM.md"; fail=1; fi
if has '(^|/)(pages|app|routes)/' && has '\.(html|tsx|mdx?)$' && ! has '^GROWTH\.md$'; then echo "docs-impact: public page changed, log it in GROWTH.md (SEO/AEO)"; fail=1; fi
if has '(wrangler\.(toml|jsonc?)|\.github/workflows/)' && ! has '^RUNBOOK\.md$'; then echo "docs-impact: ops changed, update RUNBOOK.md"; fail=1; fi
[ $fail = 0 ] && echo "docs-impact: ok"; exit $fail
