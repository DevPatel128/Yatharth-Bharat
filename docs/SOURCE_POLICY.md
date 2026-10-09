# Source policy

## Order of preference
1. Official Indian sources for Indian government records, statistics, laws, budgets and officeholders: MoSPI, RBI, India Code, Union/State budget portals, ECI, Parliament (sansad.in), ministries, LGD, Survey of India, National Archives, ASI, UGC, AICTE, AISHE, NIRF.
2. International primary sources for comparisons only: World Bank, IMF, UNDP, ILO, WHO. Always labelled "International source, not the Government of India".
3. Community open data (e.g. DataMeet) only when no official machine-readable file exists; always labelled, licence credited.
4. News and social media are never the sole evidence for a consequential claim.

## Adding a source
A source is added only as a code change to `src/lib/sources.ts` declaring: publisher, category, homepage, allowed hosts, access method, update frequency, licence, known limitations, and any key env var. The pipeline cannot fetch from a host that is not declared.

## Access rules
- Official APIs first; structured downloads second; controlled document extraction last.
- Never bypass access controls, captchas, robots rules or rate limits. Captcha-protected pages go through the manual-download lane (`RUNBOOK.md`).
- TLS certificates are always verified. MoSPI's server needs legacy TLS renegotiation; that option never disables certificate checks.

## Current registry (2026-10-10)
| Source | Category | Access | Used for |
|---|---|---|---|
| MoSPI eSankhyiki API | Indian government | JSON + CSV API | PLFS unemployment, CPI inflation |
| World Bank WDI API | International | JSON + XML API | GDP growth (interim, D-008), GDP per capita, life expectancy, infant mortality, electricity, internet |
| IMF DataMapper | International | JSON API | cross-check only (actuals ≤ 2025) |
| National Portal of India | Indian government | manual capture | state/UT names, status, capitals |
| Digital Sansad (Lok Sabha) | Parliament | JSON (site's own endpoint) | Hindi state names |
| DataMeet maps | Community | shapefile, pinned commit | state boundaries |

## Observed source problems (kept as evidence of why the gate exists)
- MoSPI NAS endpoint returned PostgreSQL errors (`42P01`) for every query on 2026-10-09.
- MoSPI CPI 2024 endpoint ignores `Format=CSV`; limits differ by parameter combination (100 vs 200).
- Lok Sabha Hindi state names: stray nukta in "Ladakh", truncated "Delhi", incomplete "Dadra and Nagar Haveli and Daman and Diu".
- National Portal's own Hindi version is machine-translated (stated by the portal); not used.
