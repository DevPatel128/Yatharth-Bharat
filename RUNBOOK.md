# RUNBOOK.md (deployment and operations)

## Local development
```
npm ci && npx next typegen
npm run dev            # http://localhost:3000
npm run check          # all fast gates
npm run build && npm run e2e   # production artefact under wrangler dev + Playwright + axe
npm run data:run       # live pipeline (local mode: AI gates may be pending)
```

## Deploy (Cloudflare Workers + static assets)
1. One-time: create the Worker by running `npx wrangler deploy` once while logged in (`npx wrangler login`), or let CI do it.
2. GitHub → Settings → Environments → `production`: secrets `CLOUDFLARE_API_TOKEN` (scopes: Workers Scripts Edit, Account Settings Read), `CLOUDFLARE_ACCOUNT_ID`; variables `PROD_URL`, `SENTRY_PROJECT`.
3. Push to `main` → `ci.yml` verify → deploy → `deploy-watch.sh` smoke + 10-minute Sentry watch → auto-rollback on failure.
4. Custom domain: Cloudflare dashboard → Workers → yatharth-bharat → Domains & Routes.

## Daily data update
- `data-update.yml` at 18:37 UTC (00:07 IST). Needs: `ANTHROPIC_API_KEY` secret, GitHub App (`DATA_BOT_APP_ID` variable + `DATA_BOT_PRIVATE_KEY` secret) with Contents + Pull requests + Issues read/write, repo setting "Allow auto-merge", branch protection on `main` requiring the `verify` check, label `data`.
- Kill switch: repository variable `AUTOPILOT=off`.
- A held or failed source opens/updates the issue "Data pipeline: held or failed sources". The site keeps the last verified value and marks it stale.

## Manual-download lane (login, captcha or PDF-only sources)
1. Download the file yourself in a browser (never bypass a captcha programmatically).
2. Put it in `data/manual-inbox/<source-id>/` with a `SOURCE.txt` containing the URL and download date.
3. Add or extend a parser in `pipeline/`, run it; the Brutal Gate applies unchanged (method `manual-download`).
Pending for this lane: Constitution of India Hindi text (fixes 3 Hindi state names), LGD district codes, SRS bulletins, Survey of India outline.

## Rollback
- Site: `npx wrangler rollback` (or revert the merge commit; CI redeploys).
- Data: revert the data PR merge commit. Records keep revision history, so a revert restores the previous verified values exactly.

## Alerts → first move
| Alert | First move |
|---|---|
| `/api/health` 503 | Check the latest "Data pipeline" issue; a stale source is expected to recover; if all stale, check Actions logs |
| Data issue opened | Read `data/runs/latest.md`; source down → wait/retry; gate held → investigate the value against the source; never hand-edit records |
| Sentry spike after deploy | Auto-rollback should have fired; if not, `npx wrangler rollback` |
| MoSPI NAS endpoint recovers | Switch `gdp-growth` primary to MoSPI (D-008) |

## Incidents
`detect → assess → contain → fix → verify → communicate → learn` → entry in `MISTAKES.md`. A confirmed wrong published value is corrected through the pipeline and noted on the corrections page.
