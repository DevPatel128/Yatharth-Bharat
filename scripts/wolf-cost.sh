#!/usr/bin/env bash
# AI tokens spent on a git branch of THIS repo, from local Claude Code transcripts (matched by branch + working directory). Usage: wolf-cost.sh [branch] [project-dir]
set -euo pipefail
branch=${1:-$(git branch --show-current)}
repo=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
dir=${2:-$HOME/.claude/projects}
grep -rlF --include='*.jsonl' "\"gitBranch\":\"$branch\"" "$dir" | tr '\n' '\0' | xargs -0 cat 2>/dev/null \
| jq -rs --arg b "$branch" --arg r "$repo" '
  map(select(.gitBranch == $b and .message.usage != null and ((.cwd // "") | startswith($r)))) | unique_by(.message.id) | map(.message.usage)
  | { input: (map(.input_tokens // 0) | add // 0),
      cache_write: (map(.cache_creation_input_tokens // 0) | add // 0),
      cache_read: (map(.cache_read_input_tokens // 0) | add // 0),
      output: (map(.output_tokens // 0) | add // 0) }
  | . + { total: (.input + .cache_write + .output) }
  | "branch \($b): total \(.total) (input \(.input), cache write \(.cache_write), output \(.output); cache read \(.cache_read) not counted)"'
