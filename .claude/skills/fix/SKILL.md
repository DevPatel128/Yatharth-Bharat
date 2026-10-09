---
name: fix
description: Pull new production errors from Sentry, reproduce each with a failing test, fix the root cause and ship. Low-risk fixes may auto-merge. Use on a daily schedule or when an error alert arrives.
---
# Fix production errors

Stop at once if `AUTOPILOT=off`. Expect to fix simple, reproducible bugs; hand everything else to the human.
1. **Pull:** new and unresolved Sentry issues for the latest releases (Sentry MCP `search_issues`, or the linked GitHub issues). Group duplicates.
2. **Triage** each one: impact (users, data, money), reproducible or not, suspect release. Security or data-loss issues go straight to the human, with no auto-merge.
3. **Reproduce:** write a test that fails exactly as production fails. If you cannot, comment on the issue with what you tried and stop.
4. **Fix** the root cause once, in shared code, with the least change. Grep all callers.
5. **Ship** on a branch `fix/<issue>` via `ship`. The PR body links the Sentry issue and shows the test failing before and passing after.
6. **Auto-merge check:** `bash scripts/autofix-check.sh origin/main` (≤20 lines, test present, no protected path) AND all CI green. If both pass, run `gh pr merge --squash --admin` and record it in the PR comment. Otherwise leave the PR for the human.
7. **After merge:** watch the deploy. If the same Sentry issue returns within 24 h, revert the PR and run `learn`.
Report: issues seen, fixed, auto-merged, waiting for the human, not reproducible.
