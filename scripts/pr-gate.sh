#!/usr/bin/env bash
# Fails a PR whose Delivers: IDs are below the VU floor or missing from PRODUCT.md.
# Usage: pr-gate.sh <pr-body-file> <floor> [labels]
set -euo pipefail
body=$1; floor=${2:-1}; labels=${3:-}
case ",$labels," in *,hotfix,*|*,dependencies,*) echo "pr-gate: exempt ($labels)"; exit 0;; esac
ids=$(grep -m1 -i '^Delivers:' "$body" | grep -oE '[A-Z][0-9]+\.[0-9]+' | sort -u || true)
vu=$(printf '%s' "$ids" | grep -c . || true)
# An ID counts only when its criterion is real text, not the template placeholder.
missing=$(for i in $ids; do grep "^- $i " PRODUCT.md | grep -vqE '…|<[a-z]' || echo "$i"; done)
[ -n "$missing" ] && { echo "pr-gate: IDs not in PRODUCT.md: $missing"; exit 1; }
[ "$vu" -lt "$floor" ] && { echo "pr-gate: VU $vu < floor $floor. Ship a fuller slice, or record a decision to lower the floor."; exit 1; }
echo "pr-gate: ok (VU $vu >= floor $floor)"
