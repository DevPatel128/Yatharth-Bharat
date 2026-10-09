#!/usr/bin/env bash
# PreToolUse guard: blocks actions WOLF reserves for a human. Exit 2 = block, with the reason shown to the agent.
in=$(cat)
cmd=$(jq -r '.tool_input.command // empty' <<<"$in")
path=$(jq -r '.tool_input.file_path // empty' <<<"$in")
block() { echo "WOLF guard: $1. Ask the human." >&2; exit 2; }
if [ -n "$cmd" ]; then
  grep -qE -- '--no-verify' <<<"$cmd" && block "--no-verify skips the local gate"
  grep -qE 'git push.*(--force|-f\b|--force-with-lease).*\b(main|master)\b|git push.*\b(main|master)\b.*(--force|-f\b)' <<<"$cmd" && block "force-push to main"
  grep -qE 'wrangler (delete|d1 delete|r2 bucket delete|kv namespace delete)' <<<"$cmd" && block "deleting a Cloudflare resource"
  grep -qiE 'wrangler d1 execute.*(drop|delete from|truncate)' <<<"$cmd" && block "destructive SQL on D1"
  grep -qE '(cat|less|head|tail|source|cp) [^|;]*\.(env|dev\.vars)(\.local)?(\s|$)' <<<"$cmd" && block "reading a secrets file"
fi
case "$path" in
  *.env.example) ;;
  *.env|*.env.*|*.dev.vars) block "secrets file $path" ;;
esac
exit 0
