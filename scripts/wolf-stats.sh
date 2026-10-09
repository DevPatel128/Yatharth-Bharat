#!/usr/bin/env bash
# PR and CI health from GitHub (no other storage). Usage: wolf-stats.sh [N=50] [workflow=ci.yml]
# Prints the trend and the VU floor that pr-gate enforces. Run inside the repo.
set -euo pipefail
N=${1:-50}; WF=${2:-ci.yml}
gh pr list --state merged --limit "$N" --json number,title,body,labels,createdAt,mergedAt > /tmp/wolf-prs.json
gh run list --workflow "$WF" --limit "$N" --json conclusion,createdAt,updatedAt > /tmp/wolf-runs.json
jq -r --slurpfile runs /tmp/wolf-runs.json '
  def med: sort | if length == 0 then 0 else .[length/2|floor] end;
  def vu: ((.body // "") | capture("Delivers:\\s*(?<ids>[^\\n]*)").ids // "" | [scan("[A-Z][0-9]+\\.[0-9]+")] | length);
  def tok: ((.body // "") | capture("AI tokens:\\s*(?<n>[0-9]+)").n // null | tonumber? // null);
  def rework: (.title | test("^(fix|hotfix|revert)|Fix CI"; "i")) or ([.labels[].name] | index("hotfix"));
  (map(select(vu > 0)) | .[:5] | map(vu) | med) as $floor
  | ($runs[0] | map(select(.conclusion != null and .conclusion != "")) ) as $r
  | "PRs merged:        \(length)",
    "VU per PR:         median \(map(vu) | med) (PRs with Delivers: \(map(select(vu > 0)) | length))",
    "VU floor (last 5): \([$floor,1] | max)",
    "Rework rate:       \((map(select(rework)) | length) * 100 / ([length,1]|max) | floor)%",
    "Ship time (h):     median \(map(((.mergedAt|fromdate)-(.createdAt|fromdate))/3600) | med | .*10|round/10)",
    "AI tokens per PR:  \(map(tok) | map(select(. != null)) | if length == 0 then "n/a (add AI tokens: to PR bodies)" else "median \(med)" end)",
    "CI first-pass:     \(($r | map(select(.conclusion == "success")) | length) * 100 / ([$r|length,1]|max) | floor)% of \($r|length) runs",
    "CI minutes:        median \($r | map(((.updatedAt|fromdate)-(.createdAt|fromdate))/60) | med | round)"
' /tmp/wolf-prs.json
