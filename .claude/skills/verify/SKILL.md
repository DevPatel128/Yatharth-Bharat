---
name: verify
description: Prove or disprove one specific claim with fresh before/after evidence. Use for "did this fix it", "prove it works", performance or cost claims, and before saying anything is done.
---
# Verify

A recap is not verification. Never soften a negative result.
1. Restate the claim so it can be falsified: condition, metric, threshold. A vague claim ("cleaner") gets a request for a measurable one.
2. Pick the smallest surface that could disprove it: a unit test, a repro script, a curl, a Playwright check, a timing, `wolf-stats`, `cf-usage`.
3. **Baseline:** run it on the old state (merge base, or the broken repro).
4. **Treatment:** the same command, data and environment on the new state.
5. Compare the raw outputs, not impressions.
6. Return exactly one verdict:
   - `VERIFIED`: moved in the predicted direction past the threshold, no confound.
   - `NOT VERIFIED`: unchanged, wrong direction, or short of the threshold.
   - `INCONCLUSIVE`: no valid baseline, noisy signal, or an environment difference.

Output:
```
VERDICT
Claim: <falsifiable claim>
Evidence: <metric>: baseline=<…> treatment=<…> delta=<…> threshold=<…>
Reasoning: <one paragraph, confounds named>
```
Keep sensitive artifacts (bodies, screenshots of user data) out of files unless the user agrees.
