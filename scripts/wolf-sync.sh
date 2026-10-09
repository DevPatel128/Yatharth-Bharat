#!/usr/bin/env bash
# Install or update WOLF in a project.
#   wolf-sync.sh <project-dir>        existing product: framework only (docs, skills, scripts, guard). Never adds app code.
#   wolf-sync.sh <project-dir> --new  new app: also the D1 app skeleton, package.json, CI, Dependabot, pre-push hook.
# Framework-owned files are always updated. Project docs and the project block of AGENTS.md are never overwritten.
set -euo pipefail
src=$(cd "$(dirname "$0")/.." && pwd); wolf=$(dirname "$src"); dst=${1:?project dir}; mode=${2:-}
v=$(cat "$wolf/VERSION")
[ "$(cat "$dst/.wolf-version" 2>/dev/null || true)" = "$v" ] && { echo "wolf-sync: already $v"; exit 0; }
copy_missing() { for f in "$@"; do [ -e "$dst/$f" ] || { mkdir -p "$(dirname "$dst/$f")"; cp -R "$src/$f" "$dst/$f"; }; done; }

# Framework-owned: always updated. A project's own script with the same name is kept.
mkdir -p "$dst/scripts" "$dst/.claude/hooks" "$dst/.claude/skills" "$dst/.cursor/rules"
# A script is WOLF's when it is byte-identical to any version WOLF ever shipped (git history); edited copies are kept.
shipped() { git -C "$wolf" log --format= --raw --no-abbrev -- "kit/scripts/$1" 2>/dev/null | awk '{print $4}'; }
for f in "$src"/scripts/*.sh; do
  n=$(basename "$f"); t="$dst/scripts/$n"
  if [ -e "$t" ] && ! cmp -s "$f" "$t" && ! shipped "$n" | grep -qx "$(git hash-object "$t")"; then echo "wolf-sync: kept project's own scripts/$n (differs from every WOLF version)"; else cp "$f" "$t"; fi
done
cp "$src/.claude/hooks/guard.sh" "$dst/.claude/hooks/"; cp -R "$wolf/skills/." "$dst/.claude/skills/"
cp "$src/.cursor/rules/wolf.mdc" "$dst/.cursor/rules/"

# Guard hook: merged into an existing .claude/settings.json, never replacing it.
s="$dst/.claude/settings.json"
if [ -f "$s" ]; then
  if ! grep -q 'hooks/guard.sh' "$s"; then
    jq --slurpfile k "$src/.claude/settings.json" '.hooks.PreToolUse = ((.hooks.PreToolUse // []) + $k[0].hooks.PreToolUse)
      | .permissions.deny = (((.permissions.deny // []) + $k[0].permissions.deny) | unique)' "$s" > "$s.new" && mv "$s.new" "$s"
  fi
else cp "$src/.claude/settings.json" "$s"; fi

# Project-owned docs: copied only when missing.
copy_missing PRODUCT.md SYSTEM.md RUNBOOK.md GROWTH.md TASK.md DECISIONS.md MISTAKES.md sell
# CLAUDE.md: keep the project's own, and make sure it points at AGENTS.md.
if [ -f "$dst/CLAUDE.md" ]; then grep -q 'AGENTS.md' "$dst/CLAUDE.md" || printf '\nRead and follow `AGENTS.md` (WOLF rules).\n' >> "$dst/CLAUDE.md"
else cp "$src/CLAUDE.md" "$dst/CLAUDE.md"; fi

# AGENTS.md: new framework text around the project block. A pre-WOLF AGENTS.md becomes the project block.
merge_agents() { awk -v f="$1" '/wolf:project:start/{while ((getline l < f) > 0) print l; skip=1} /wolf:project:end/{skip=0; next} !skip' "$src/AGENTS.md" > "$dst/AGENTS.md.new" && mv "$dst/AGENTS.md.new" "$dst/AGENTS.md"; }
block=$(mktemp)
if [ -f "$dst/AGENTS.md" ] && grep -q 'wolf:project:start' "$dst/AGENTS.md"; then
  sed -n '/wolf:project:start/,/wolf:project:end/p' "$dst/AGENTS.md" > "$block"; merge_agents "$block"
elif [ -f "$dst/AGENTS.md" ]; then
  { echo '<!-- wolf:project:start — wolf-sync never overwrites this block -->'; echo '## Project'; cat "$dst/AGENTS.md"; echo '<!-- wolf:project:end -->'; } > "$block"; merge_agents "$block"
else cp "$src/AGENTS.md" "$dst/AGENTS.md"; fi

if [ "$mode" = "--new" ]; then
  mkdir -p "$dst/hooks"; cp "$src/hooks/pre-push" "$dst/hooks/"
  copy_missing src/db.ts migrations test/isolation.test.ts package.json package-lock.json tsconfig.json \
    .env.example .github/workflows/ci.yml .github/dependabot.yml
  # Never replace an existing hooks setup (e.g. husky).
  [ -n "$(git -C "$dst" config core.hooksPath 2>/dev/null || true)" ] || git -C "$dst" config core.hooksPath hooks 2>/dev/null || true
fi
# A .gitignore line like `Wolf/` also hides .claude/skills/wolf/ on case-insensitive filesystems (macOS).
if git -C "$dst" rev-parse --git-dir >/dev/null 2>&1 && git -C "$dst" check-ignore -q .claude/skills/wolf/SKILL.md; then
  echo "wolf-sync: WARNING .claude/skills/wolf is git-ignored by: $(git -C "$dst" check-ignore -v .claude/skills/wolf/SKILL.md | cut -f1)"
  echo "wolf-sync: anchor that pattern to the repo root (e.g. /Wolf/) so the skills get committed"
fi
echo "$v" > "$dst/.wolf-version"
echo "wolf-sync: $dst now on WOLF $v (${mode:-framework only})"
