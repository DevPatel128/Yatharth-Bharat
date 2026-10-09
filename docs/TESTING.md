# Testing

| Command | What it proves |
|---|---|
| `npm run check` | db scope, typecheck, eslint, anti-slop lint, 66 unit/data/i18n tests, WOLF isolation test |
| `npm run build` | every record parses; 100+ static pages generate |
| `npm run e2e` | against the Worker (`wrangler dev`): language redirect, 36 keyboard-selectable regions, shareable URLs, Escape, 404s, language switch keeps page, Hindi fallback marking, disclaimer on every page type, axe WCAG 2.1 AA with zero violations, reduced motion, health endpoint; desktop and Pixel 7 |
| `npm run data:run` | live end-to-end ingestion |

Spec scenarios covered: invalid JSON (G1), HTML instead of data (G1), revised figure (G5, merge keeps revisions), no new data (unchanged result), two sources disagree (G5), source unavailable (stale + issue; observed live with MoSPI NAS), fabricated citation (G4), suspicious jump (G5), duplicate rows (G2), workflow run twice (idempotency + concurrency), invalid geographic id (404), data bot touching code (CI data-scope).

Not yet covered: PDF parsing (no PDF source yet), AI rate limiting (no AI endpoint yet), preview/production deploy failure paths (need Cloudflare credentials), required-approval enforcement (needs branch protection on the GitHub repo).
