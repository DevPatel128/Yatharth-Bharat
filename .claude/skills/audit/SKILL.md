---
name: audit
description: Whole-repo quality and security audit plus a ledger of deferred shortcuts. Use when inheriting a codebase, before a launch, monthly, or when asked for an audit or tech-debt list.
---
# Audit

Rule 0: blunt. Audit like the new owner who gets paged. A report only: change no code.

1. **Map:** README, deploy and build config, dependencies, entry points (routes, handlers, cron, CLI), tests, `SYSTEM.md`. State the assumed load. On a big repo, go deep where mistakes cost most (auth, money, user data, `db.ts`, jobs) and say what you skipped.
2. **Look for:** the same six classes as `review` (bug, risk, scale, missing test, speed, lean), plus:
   - the same rule implemented two ways in two places
   - dependencies that a few lines or the platform could replace
   - interfaces with one implementation, config nobody sets
   - an isolation test that does not cover every user table
   - health checks that do not test real dependencies
   Before calling code unused, grep the whole tree, including tests, config and dynamic references.
3. **Debt ledger:** collect every deferral marker:
   `grep -rnE --exclude-dir={.git,node_modules,dist,build,.next} '(#|//|/[*]) ?(shortcut|TODO|FIXME):' .`
   One row each: `file:line, what was simplified, ceiling, upgrade trigger`. Tag `no-trigger` when no upgrade condition is named; those rot.
4. **Output:** `What this repo does:` + the assumed load. Up to 20 findings in the `review` format, grouped Must / Should / Nice. Then the debt ledger. End with `Verdict:` (healthy, or what to fix first) · `Lean: -N lines, -M dependencies possible` · `Not checked:`.
Every finding needs a concrete failing case. No vague worries.
