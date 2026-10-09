# SYSTEM.md (architecture)

## Shape
```
GitHub Actions (daily 18:37 UTC = 00:07 IST)
  pipeline/run.ts ──fetch (allowlisted HTTPS)──▶ MoSPI API · World Bank · IMF · sansad.in
        │  Brutal Gate G1–G8 (pipeline/gates.ts)
        ▼
  data/records/*.json  (versioned, Zod-validated, revisions kept)  ──PR on data/<date>──▶ CI ──auto-merge──▶ main
                                                                                                │
next build (static export, out/) ◀─────────────────────────────────────────────────────────────┘
        │
Cloudflare Worker "yatharth-bharat"
  ├─ static assets (out/): every page, /geo/paths.json, _headers
  └─ worker/index.ts: "/" → /en|/hi (Accept-Language) · GET /api/health
Browser: server-rendered HTML; client JS only for map interaction, search, language switch.
```

## Data model (records in git; no user tables; see `src/lib/schema.ts`)
| Record | File | Key fields | Class |
|---|---|---|---|
| Source | `src/lib/sources.ts` | id, publisher, category (Indian govt / constitutional / international / community), allowedHosts, licence, limitations | public |
| Indicator | `data/records/indicators/<id>.json` | id, category (12), name/definition/unit/methodology/limitations (EN+HI), sourceId, state (verified/stale/unavailable), lastVerifiedAt | public |
| Observation | inside Indicator | period, value, status, series (base year), evidence[], revisions[] | public |
| Evidence | inside Observation/Region | sourceId, url, retrievedAt, snapshotSha256, verbatim quote, method | public |
| Region | `data/records/geo/regions.json` | id (slug), kind (state/UT), name & capital (EN+HI or null), boundaryName, evidence[] | public |
| Run report | `data/runs/latest.{json,md}` | per indicator: result (published/unchanged/held/source-failed), gate results | public |

User tables: **none** (D-004). `src/db.ts` stays the only file allowed to touch `env.DB` when D1 is added.

## Env vars and secrets (names only)
| Name | Where | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | GitHub secret | G6 adversarial review, G8 back-translation (pipeline only; never in the browser) |
| `REQUIRE_AI_GATES` | workflow env | `true` in the scheduled run: nothing publishes until AI gates have run |
| `DATA_BOT_APP_ID` / `DATA_BOT_PRIVATE_KEY` | GitHub variable / secret | GitHub App token so data PRs trigger CI |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | GitHub secrets (env `production`) | `wrangler deploy` |
| `SENTRY_AUTH_TOKEN`, `SENTRY_PROJECT` | GitHub secret / variable | post-deploy error watch |
| `PROD_URL`, `AUTOPILOT` | GitHub variables | deploy target; `off` stops data runs |
| `NEXT_PUBLIC_CF_BEACON_TOKEN`, `NEXT_PUBLIC_SENTRY_DSN` | build env (GitHub variables) | Cloudflare Web Analytics; browser error reports (off until set) |

## Endpoints
| Method path | Auth | Input | Limits | Idempotent | Errors |
|---|---|---|---|---|---|
| GET `/` | none | Accept-Language | edge | yes | 302 only |
| GET `/api/health` | none | none | edge | yes | 503 when data stale > 8 days or all indicators stale |
| GET `/api/*` (other) | none | — | — | yes | 404 JSON |
| GET `/geo/paths.json` | none (static) | — | cached 1 day | yes | — |
| all other GET | static assets | — | cached | yes | 404 page |

## Threat model (lite)
| Asset | Actor | Attack path | Mitigation | Residual risk |
|---|---|---|---|---|
| Published facts | poisoned or compromised source | wrong or injected values | G1 host allowlist + type check, G2 ranges, G3 two readings, G5 history/second source, G6 adversarial review | a coordinated wrong value at an official source passes |
| Pipeline | malicious document text | prompt injection into AI review | documents wrapped as untrusted data; model can only fail a record, never publish or edit | false holds |
| Pipeline host | SSRF via redirect | fetch internal address | allowlisted hosts on every hop, HTTPS only, size/time caps | none known |
| Repo | data bot | ships code | `data-scope` CI job; bot paths limited to `data/` | — |
| Secrets | leak | logs, bundle | secrets only in CI env; static site has none; gitleaks in CI | — |
| Site | XSS | injected text | React escaping; no `dangerouslySetInnerHTML`; CSP in `_headers` | `'unsafe-inline'` scripts needed by Next inline payload |

## Limits and cost
| Resource | Free limit | Current use | Headroom |
|---|---|---|---|
| Workers requests | 100k/day | only `/` and `/api/*` run the Worker | large |
| Static asset requests | unlimited (free) | all pages | — |
| GitHub Actions | unlimited on public repo; 2,000 min/month private | ~5 min/day data run + CI | fine |
| Anthropic | pay per use | G6 on changed records only | see `docs/COST_MODEL.md` |
