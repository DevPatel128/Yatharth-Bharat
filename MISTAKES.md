# MISTAKES.md
`date · mode · task · what happened · root cause · impact · detection · fix · enforcing check · verified`

| Date | Task | What happened | Root cause | Fix | Enforcing check | Verified |
|---|---|---|---|---|---|---|
| 2026-10-10 | Hindi region names | The first completeness rule (word count) let the incomplete Lok Sabha Hindi name for "Dadra and Nagar Haveli and Daman and Diu" through. | Heuristic too loose (4 words × 2 = 8, not < 8). | Compare each "and" in the English name with "और" in the Hindi. | `pipeline/regions.ts` rule + `test/data.test.ts` (every published Hindi name passes G8) | yes: name now held |
| 2026-10-10 | Deploy adapter | Chose OpenNext from its peer range without running the built Worker; it crashed on Next 16.4. | Trusted a declared compatibility range. | Static export + Worker (D-002). | CI runs e2e against `wrangler dev` (the production path) | yes |
| 2026-10-10 | G7 lint | "scam" matched inside "scampi"; Hindi "विफल" flagged neutral UI text about checks. | Left word boundary only. | Whole-word match incl. Devanagari marks; reworded UI text. | `test/gates.test.ts` "does not flag words that merely contain a banned term" | yes |
