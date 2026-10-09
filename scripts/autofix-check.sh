#!/usr/bin/env bash
# Decides if an auto-fix PR may auto-merge. Usage: autofix-check.sh <base-ref>
# Rule: <=20 changed non-test lines, a test changed, no protected path. CI green is checked by the caller.
set -euo pipefail
base=${1:-origin/main}
[ "$(gh variable get AUTOPILOT 2>/dev/null || true)" = "off" ] && { echo "autofix: AUTOPILOT=off"; exit 1; }
files=$(git diff --name-only "$base"...HEAD)
protected='(^|/)(db\.ts|schema\.sql|migrations/|auth|payment|billing|\.github/|wrangler\.(toml|jsonc?)|package(-lock)?\.json|pnpm-lock\.yaml)'
hit=$(printf '%s\n' "$files" | grep -E "$protected" || true)
[ -n "$hit" ] && { echo "autofix: protected path, human review: $hit"; exit 1; }
printf '%s\n' "$files" | grep -qE '(\.test\.|/test/|\.spec\.)' || { echo "autofix: no test changed"; exit 1; }
lines=$(git diff --numstat "$base"...HEAD -- . ':!*test*' ':!*spec*' | awk '{s+=$1+$2} END {print s+0}')
[ "$lines" -gt 20 ] && { echo "autofix: $lines lines > 20, human review"; exit 1; }
echo "autofix: low risk ($lines lines), may auto-merge after CI is green"
