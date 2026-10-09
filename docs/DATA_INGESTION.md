# Data ingestion and the Brutal Gate

`pipeline/run.ts` runs daily (GitHub Actions, 18:37 UTC = 00:07 IST) and on demand. For each indicator:

1. **Fetch** both representations through `safeFetch` (HTTPS only, host allowlist on every redirect hop, 20 MB / 45 s caps, SHA-256 of exact bytes).
2. **Gate** (`pipeline/gates.ts`), all must pass:
   - **G1 Provenance**: allowlisted host, non-empty, expected type; an HTML error page with HTTP 200 fails.
   - **G2 Sanity**: well-formed unique periods, finite values, per-indicator plausible range, minimum count.
   - **G3 Two readings**: JSON vs CSV (MoSPI PLFS), JSON vs XML (World Bank), or published rate vs rate recomputed from index values (MoSPI CPI, tolerance 0.05). Must agree.
   - **G4 Evidence**: the exact record is cut from the snapshot (`pipeline/anchor.ts`), must be unique, must contain the value; stored verbatim with the snapshot hash.
   - **G5 Cross-check**: against the last verified value (`maxRevision` per indicator) and a second independent source where one exists (`tolerance`). A first ingestion with no second source passes only with a documented reason (`noSecondSourceReason`).
   - **G6 Adversarial review**: a separate model reviews snapshot + record and must find no problem. Unconfigured = pending. Production requires it (`REQUIRE_AI_GATES=true`).
   - **G7 Neutral language**: banned accusatory/hype terms (EN + HI), whole-word.
   - **G8 Hindi**: Devanagari present, no stray nukta, no trailing halant, same numbers and links as English; model back-translation when configured.
3. **Merge**: new periods added; changed values keep the old value in `revisions[]` (never overwritten); unchanged values keep original evidence.
4. **Write** the record and `data/runs/latest.{json,md}` (the PR body).
5. **Fail safe**: a source error marks the record `stale` and leaves values untouched; a held record is not written. Exit code 2 opens or updates an issue. Nothing fails silently.

## Thresholds (per indicator, `pipeline/indicators.ts`)
| Indicator | Range | Max revision | Second source |
|---|---|---|---|
| unemployment-rate | 0–30 | 0.5 pp | none (PLFS is the only official monthly survey) |
| cpi-inflation | −10–25 | 0.3 pp | none (sole publisher); G3 recomputes from index |
| gdp-growth | −15–20 | 1.5 pp | IMF WEO ±1.5 pp |
| gdp-per-capita-usd | 50–20,000 | 150 | IMF WEO ±150 |
| life-expectancy | 30–90 | 1 | none yet (SRS PDF via manual lane) |
| infant-mortality | 1–200 | 3 | none yet (SRS PDF via manual lane) |
| electricity-access | 0–100 | 3 pp | none yet |
| internet-users | 0–100 | 5 pp | none yet |

A large change is a reason to investigate, not proof of error: held values are reviewed against the source, and the threshold or the value is corrected by a code change with a note in `DECISIONS.md`.

## Idempotency
Same inputs give the same records; only `lastVerifiedAt` moves. The workflow uses a concurrency group, so a second run waits instead of racing (scenario 10).
