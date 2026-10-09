---
name: wolf
description: Run the full WOLF loop. "/wolf idea <idea>" tests a new product idea; "/wolf <requirement>" takes a change from requirement to production. Use when the user states a new idea, feature or requirement.
---
# WOLF autopilot

Rule 0: be blunt. Real risks, real numbers, no sugarcoating. Kill weak ideas with evidence.
First check the repo variable `AUTOPILOT`. If it is `off`, plan only, change nothing.
Read `AGENTS.md`. Respect the autonomy table in `WOLF/GOVERN.md`. Leave a trace for every step: a PR comment or a doc line.

## Idea mode: `/wolf idea <idea>`
1. **Interview.** Ask at most 7 questions in one message: user, problem in their words, evidence it exists, what they do today, constraints, outcome, what would prove us wrong. Never invent the answers.
2. **Research** (`research` skill): market, competitors, demand signals (Reddit/X threads, search, what LLMs answer today), pain language. One page.
3. **Verdict:** GO, TEST or KILL, with the reason in one line each. Be honest about the odds.
4. **Test (if TEST):** the cheapest proof. A Vite landing page + D1 waitlist + Turnstile + PostHog, plus `post` drafts. Write the go/pivot/kill thresholds into `PRODUCT.md` BEFORE launch.
5. **Decide:** GO fills the `PRODUCT.md` brief. PIVOT or KILL goes in `DECISIONS.md`.

## Change mode: `/wolf <requirement>`
1. **Research** only if facts are unknown. Keep only facts that change a decision.
2. **Plan:** add acceptance criteria with IDs to `PRODUCT.md` and write a `TASK.md` card. Bundle enough IDs to meet the VU floor (`scripts/wolf-stats.sh`). Ask only when blocked.
3. **Build** with the coding rules in `AGENTS.md` (least code; `db.ts` scoping; file caps).
4. **Review:** run `review`, fix the Must/Should findings, then `verify` the main claim.
5. **Docs:** update every touched doc in the same branch (`scripts/docs-impact.sh` must pass).
6. **Ship:** run `ship` (local gate, PR with `Delivers:` + `AI tokens:`, CI, merge per autonomy, deploy watch).
7. **Measure:** run `scripts/wolf-stats.sh` and `scripts/wolf-cost.sh` and post the deltas as a PR comment.
8. **Learn:** for any mistake, or any metric more than 20% worse than its 5-PR median, run `learn`.
9. **Grow** (user-facing changes): `post` drafts, a `GROWTH.md` page log line, and `pitch` if the deck gate is met.

## Stop and ask when
Requirements conflict · data or money could be lost · a new provider or dependency is needed · 3 CI fixes failed · token cost passes 2× the median · confidence is low.
Auth, payments, `db.ts` and migration changes: build and test them, then stop **before merge** and ask.

## Report (end of every run)
Delivered IDs · evidence · metrics delta · what was not checked · what could fail.
