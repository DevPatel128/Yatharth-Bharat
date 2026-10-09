---
name: ship
description: Take a finished branch through the local gate, PR, CI, merge and deploy watch, fixing CI one failure at a time. Use when work is ready to go out.
---
# Ship

Never merge on red or skipped CI. Never use `--no-verify` or weaken a test. Respect `AUTOPILOT` and the autonomy table.
1. **Context:** `git fetch origin main && git diff origin/main...HEAD`; status; changed files; intent.
2. **Local gate:** `bash scripts/check-db-scope.sh src && npm run check` (the pre-push hook runs the same). Fix and re-run until green.
3. **Review:** run `review` on the diff. Fix Must findings and re-run the affected tests.
4. **Docs:** `bash scripts/docs-impact.sh origin/main` passes.
5. **Commit:** only the files of this change, with a clear message.
6. **No GitHub remote?** Stop after step 5. Write the body below to `PR_BODY.md`, then run `scripts/pr-gate.sh PR_BODY.md <floor>` locally.
7. **PR body:**
   ```
   Delivers: F3.1, F3.2
   AI tokens: <from scripts/wolf-cost.sh>
   Evidence: <commands + results>
   Rollback: <how>
   Not checked: <…>
   ```
   Check the VU floor with `scripts/wolf-stats.sh`. Below the floor, add more criteria to this branch rather than shipping thin.
8. **CI:** `gh pr checks --watch`. On failure, read the first actionable error in the log, apply the smallest fix, and push. Maximum 3 attempts, then stop and report.
9. **Merge:** only as the autonomy table allows. Otherwise report "ready for your merge" with the PR link.
10. **Deploy watch:** follow the deploy job (`gh run watch`). On failure the job rolls back; open a `MISTAKES.md` entry through `learn`.
11. **Report:** findings fixed, tests run, PR URL, deploy status, `wolf-stats` deltas (VU, CI minutes, ship time, tokens).
