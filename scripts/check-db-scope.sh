#!/usr/bin/env bash
# Fails if any file other than src/db.ts touches the database directly.
hits=$(grep -rnE 'env\.DB|\.prepare\(|\.batch\(' "${1:-src}" --include='*.ts' --include='*.tsx' | grep -v '/db\.ts:')
[ -z "$hits" ] && echo "db scope: ok" && exit 0
echo "db scope: only src/db.ts may touch env.DB:"; echo "$hits"; exit 1
