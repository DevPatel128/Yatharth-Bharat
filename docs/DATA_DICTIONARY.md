# Data dictionary

Canonical definitions are the Zod schemas in `src/lib/schema.ts`; this page explains them.

| Field | Meaning |
|---|---|
| `period` | Reporting period as published: `YYYY-MM` (month), `YYYY` (year). Fiscal years are labelled as the source labels them; World Bank years for India follow World Bank convention. |
| `value` | The number exactly as published (World Bank values rounded to 3 decimals for storage; display precision per `DISPLAY_DECIMALS`). |
| `status` | `provisional` / `revised` / `final` / `estimate` / `unknown`. `unknown` means the source does not state it; we never guess. `revised` means we observed the source change the value. |
| `series` | Base year or series (e.g. `CPI 2024=100`). Values from different series are never joined. |
| `publishedAt` | Source publication date if the source states it, else null. |
| `evidence[].retrievedAt` | When we fetched it. |
| `evidence[].quote` | Verbatim record from the source snapshot that contains the value. |
| `evidence[].snapshotSha256` | Hash of the exact bytes fetched. |
| `evidence[].method` | `pipeline` / `manual-download` / `browser-capture`. |
| `revisions[]` | Earlier values with when they were superseded and their evidence. |
| `lastVerifiedAt` | Last time a run confirmed the source still says this. |
| `state` | `verified` / `stale` (last check failed) / `unavailable`. |
| Region `id` | URL slug from the official English name; `boundaryName` joins to the boundary file. LGD codes will be added from the LGD file (manual lane), never typed by hand. |

Dates: observation date ≠ reporting period ≠ publication date ≠ retrieval date ≠ last verification. Each is stored separately where the source provides it.
