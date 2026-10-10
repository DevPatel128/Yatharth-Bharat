# AGENTS.md

<!-- wolf:project:start — wolf-sync never overwrites this block -->
## Project
- **Product:** Yatharth Bharat: bilingual (EN/HI), evidence-first public information about India; every figure linked to its official source and passed through the Brutal Gate.
- **Mode:** website (static export) + small Worker
- **Live:** https://yatharth-bharat.dvpatel.workers.dev (preview, unannounced; deployed manually 2026-10-10) · **Repo:** https://github.com/DevPatel128/Yatharth-Bharat (private)
- **Commands:** `npm run dev` · `npm run check` (db scope + typecheck + eslint + lint:slop + vitest + isolation) · `npm run build` · `npm run e2e` (needs build) · `npm run data:run` · `npm run deploy`
- **Project rules:**
  1. Never invent a fact, number, name, date or translation. Missing data is shown as missing. Unverified Hindi falls back to English.
  2. Data enters only through `pipeline/` and the Brutal Gate (`pipeline/gates.ts`). Never hand-edit `data/records/`.
  3. An international source is never labelled as Indian government. Every source is in `src/lib/sources.ts`.
  4. No evaluative or accusatory words about people or institutions (G7). Facts from official records only.
  5. Every page that presents information ends with `<ReferenceList>` and `<Disclaimer>`.
  6. The data bot may change `data/records/` and `data/runs/` only.
  7. Never change the user-agent or otherwise disguise the client to get past a block (403, captcha, robots). Blocked sources go to the owner via `data/manual-inbox/` or are read in a real browser.
  8. Next.js 16.4 has breaking changes: read `node_modules/next/dist/docs/` before writing Next code.
<!-- wolf:project:end -->

## Rule 0
Be blunt. No sugarcoating. Give the real risk, number and odds. Every answer ends with what was not checked and what could fail.

## Start of every task
1. Read this file. Load only the docs the router in `WOLF/README.md` names.
2. Read the hard rules below. Check `MISTAKES.md` for the same area.
3. If unclear, ask. Never invent requirements or facts; write `UNKNOWN`.

## Hard rules (max 15; each one came from a real incident)
1. Never merge or deploy on red CI. A required job that skipped when it should have run is a failure. Only a skip from a documented path filter (for example a docs-only change) is allowed.
2. Never use `--no-verify`, force-push `main`, or weaken a test to make it pass.
3. User data goes only through `src/db.ts` `forUser()`. Never touch `env.DB` elsewhere. `userId` comes only from the session.
4. `role`, `plan` and `user_id` are never client-writable. Writes use field allowlists.
5. Migrations are applied in order and checked in CI against a fresh DB. Never skip a number.
6. Never return DB errors, stack traces or internals to clients. Return stable error codes.
7. Verify webhook signature and schema, dedupe by event ID, and never trust IDs in the payload.
8. Side effects that can retry (money, orders, email, jobs) use idempotency keys.
9. Escape CSV and Excel exports (cells starting with `= + - @`).
10. No PII, tokens or money values in Sentry or PostHog.
11. Health checks test real dependencies. Never hard-code "Operational".
12. Deploy tokens carry every scope the deploy uses. Check them before a deploy, never during one.
13. Dependency major bumps get their own green CI run before merge.
14. Log a mistake in `MISTAKES.md` and add its enforcing check in the same PR.

## Coding rules
Least code that fully works. Order: skip it if nobody needs it → reuse repo code → use the platform or standard library → use an installed dependency → write one clear line → write the minimum code. No new dependency for a few lines. No wrappers or "for later" code. For bugs, grep every caller and fix the root cause once. Non-trivial logic gets one test. Mark limits with `// shortcut: <limit>, <when to upgrade>`. Split a file before 400 lines (components) or 1000 (any file). No `any` or casts. Never cut validation, security, accessibility or data-loss handling.

## Ship rules
- PR body: `Delivers: <IDs>` (VU at or above the floor in `wolf-stats`), `AI tokens: <n>`, evidence, rollback.
- Update touched docs in the same PR: `PRODUCT.md` status, `SYSTEM.md` for schema or API, `RUNBOOK.md` for ops, `GROWTH.md` for public pages.
- Autonomy limits: `WOLF/GOVERN.md`. When in doubt, stop and ask.

## Docs
`PRODUCT.md` what and why · `SYSTEM.md` how it works · `RUNBOOK.md` operate · `GROWTH.md` reach · `TASK.md` feature card · `DECISIONS.md` · `MISTAKES.md` · `sell/` pitch material · framework: `WOLF/`
