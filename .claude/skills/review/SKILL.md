---
name: review
description: Strict review of a diff for bugs, security, scale, missing tests, speed and needless code. Use before every merge or when asked to review a change or PR.
---
# Review

Rule 0: blunt. Review like the person who gets paged when this breaks. A report only: change no code.
Priority order: correct → safe → holds at expected load → tested → fast → lean.

## 1. Understand
- Scope: what the user names. Otherwise uncommitted changes, otherwise the branch against `main`.
- Read the diff, every caller of each changed function, the tests and the relevant docs. A changed signature or behavior means grep every caller.
- Trace data in → stored → out. State the load you assumed (from README, deploy config, `SYSTEM.md`).

## 2. Look for
1. **Bug:** wrong result, crash, edge cases (empty, zero, last item, rounding, time zones), a broken caller, a fix applied in one caller while the shared code stays broken.
2. **Risk:** injection, missing authz, unscoped DB access outside `db.ts`, secrets, client-writable protected fields, swallowed errors, writes out of order, missing `batch()`.
3. **Scale:** check-then-write races, a query per item, O(n²) on big input, lists that only grow, per-process state that must be shared, free-tier CPU (10 ms).
4. **Missing test:** a risky branch, parser, money, security or data write with no test that fails when it breaks. One good test, not coverage.
5. **Speed:** real slowdowns are problems; micro wins are suggestions.
6. **Structure (code judo):** is there a reframing that deletes whole branches, flags or layers? Flag:
   - special-case `if`s bolted onto shared flows
   - thin wrappers and pass-through helpers
   - `any`, casts and needless optionals hiding the real contract
   - logic in the wrong layer, or a bespoke helper where a canonical one exists
   - serial work that could run in parallel; updates that can half-apply
   - a file pushed past 400 lines (component) or 1000 (any file)
7. **Lean:** delete dead code; reuse (name the path); use the platform or stdlib; YAGNI; merge near-copies; split a function by job, never by line count.
8. **Gaming:** acceptance criteria split only to inflate VU.

## 3. Check before reporting
- Every finding needs a concrete failing case: "this input → this wrong result". No case, no finding.
- Re-read the lines. Confirm the caller exists, the value can be empty, the code is unused.
- A `shortcut:` comment that names its limit is a decision, not a finding, unless the load already crosses it.
- Propose the smallest fix; prefer fixes that delete code. No style taste, no "consider".

## 4. Output (plain English)
`What this change does:` 2–3 sentences.
Numbered findings in groups (skip empty ones): **Must fix** (bug, security, data loss, breaks at load) · **Should fix** (untested risk, real slowness, structure, duplication) · **Nice to have**.
Each finding gives: **title** (`file:line`) · what this is · problem · fix · if we skip it.
End with `Verdict: Ship.` or `Verdict: fix 1 and 3 first.` · `Lean: -N lines possible.` · `Not checked:` one line.
Do not approve just because it works. Block structural regressions, spaghetti growth, unjustified file growth and wrong-layer logic.
