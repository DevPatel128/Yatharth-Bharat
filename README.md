# Yatharth Bharat · यथार्थ भारत

India, as the official record shows it. A bilingual (English/Hindi), evidence-first public-information site: official statistics and facts about India and its 28 states and 8 Union Territories, every figure linked to its source and passed through an automated verification gate before it appears.

**Status (2026-10-10):** Stage 0 foundation and Stage 1a map are working locally. Eight indicators are live from MoSPI and the World Bank. **Not deployed yet**: it needs Cloudflare credentials. See `PRODUCT.md` for the roadmap.

## What works
- Interactive map of India (36 regions, keyboard and screen-reader accessible, shareable `?region=` links, intro animation that respects reduced motion).
- State/UT pages with official names, status and capitals (National Portal of India); Hindi names from Lok Sabha records where they pass the Hindi gate.
- Scorecard: 12 categories, 8 indicators, with source, period, series, methodology, limitations, trend, full table, revisions and verbatim evidence.
- Daily ingestion pipeline with the Brutal Gate (G1–G8), revision history, stale marking, run reports.
- Disclaimer and reference list on every page; draft privacy/terms/corrections pages in both languages.

## Quick start
```bash
npm ci
npx next typegen
npm run dev
```
Then open http://localhost:3000. More commands are in `RUNBOOK.md`.

## Where things live
`src/app/[lang]` pages · `src/components` UI · `src/lib` schema, sources, i18n, data · `pipeline/` ingestion and gates · `data/records` verified data · `worker/` Cloudflare Worker · `docs/` policies (index: `docs/README.md`) · framework: WOLF (`AGENTS.md`).

## Licence and attribution
Data remains under its publishers' licences (see the Sources page). Map: DataMeet India community, CC BY 4.0; external boundary as depicted by the Survey of India.
