# PRODUCT.md

## Brief
- **User (staged):** 1 ordinary citizens → 2 students → 3 young professionals → 4 journalists, researchers, teachers.
- **Problem (in their words):** "Who is responsible for the road outside my house?" · "Are the numbers real?" · "Is studying abroad worth the debt?" (pain language from press coverage of Reddit threads and civic guides, 2024–26).
- **Today they:** read partisan news and social media; official data sits in portals and PDFs built for experts (data.gov.in, MoSPI, NDAP, India Data Portal); PRS, ADR, Factly, Open Budgets India each cover one slice.
- **Outcome we promise:** plain-language, bilingual (English/Hindi) facts about India, every figure linked to its official source and passed through automated checks.
- **Why now:** MoSPI's open API and MCP server (2026) make official statistics machine-readable; new GDP (2022-23) and CPI (2024=100) series in Feb 2026 make series-aware explanation necessary; trust in official data is contested (IMF "C" rating for national accounts, Nov 2025).
- **Different because:** evidence-first (verbatim source quote stored for every value), no composite score, no opinion, neutral and bilingual; free public good.
- **Non-goals:** news feed, opinion, political scores, a chatbot that answers from memory, user accounts (Stages 0–3).
- **North Star metric:** weekly visitors who open a source link or evidence panel (they checked a fact).
- **Falsifiers (we are wrong if):** < 2% of visits open any evidence/source in the first 3 months; or corrections show > 1 confirmed wrong published value per month.
- **Go / pivot / kill thresholds (set before launch):** Go: ≥ 5,000 monthly visitors and ≥ 5% evidence-open rate by month 3. Pivot (to journalist/teacher tools first): < 1,000 visitors but ≥ 10% evidence-open. Kill/re-plan: < 1,000 visitors and < 2% evidence-open.

## Status
- Stage 0 Foundation — **Done** (local; deploy pending credentials)
- Stage 1a Map — **Done** (states/UTs; districts Next)
- Stage 1b Scorecard — **Now** (8 indicators live; 12 categories shown, empty ones say so)
- 1d Your representatives — **Done (MPs)**: 540 sitting members + 3 seats without a sitting member; MLAs/councillors Next
- Region pages — **Done**: state CPI inflation for all 36 + MPs per region
- 1c Government explained · 1d Who fixes this · 1e Public money · 1f AI search · 2 Students · 3 Young professionals · 4 Researchers — **Next/Later**
- Select & Export (PDF/snippet with citations) — **Later** (data model already has stable ids and evidence for it)

## Features (acceptance criteria get IDs; PRs deliver IDs)
### F1 Foundation — Done
- F1.1 Given any page, when it renders, then it shows a reference list and the formal disclaimer (EN/HI). (e2e)
- F1.2 Given a Hindi page, when a Hindi string is unverified, then English is shown with `lang="en"` and a notice. (e2e)
- F1.3 Given a record that fails the schema, when the site builds, then the build fails. (data.test.ts)
- F1.4 Given `/`, when the browser prefers Hindi, then it redirects to `/hi`, else `/en`. (e2e)
- States: loading · empty · error · success — map shows the region list when geometry fails to load.

### F2 India map — Done (state level)
- F2.1 Given the home page, when the map loads, then all 28 states and 8 UTs are selectable by mouse, touch and keyboard. (e2e)
- F2.2 Given a selection, when made, then the map zooms to the region, shows name/type/capital, and the URL carries `?region=<id>`. (e2e)
- F2.3 Given Escape or "Back", when pressed, then the map returns to India. (e2e)
- F2.4 Given reduced motion, when the page loads, then no intro animation plays. (e2e)
- F2.5 Given an unknown region id, when requested, then the response is 404. (e2e)
- F2.6 Given the boundary build, when run, then file hashes, 36 features and the SoI external-boundary extent are verified. (pipeline/geo.ts)
- F2.7 (Next) Districts from LGD codes, loaded per state.

### F3 Scorecard — Now
- F3.1 Given an indicator, when shown, then value, unit, period, series, status, source, methodology, limitations, trend and full table are visible. (page)
- F3.2 Given a category with no verified indicator, when shown, then it says so; nothing is filled in. (page)
- F3.3 Given an international source, when shown, then it is labelled "not the Government of India". (page)
- F3.4 Given a revised value, when published, then the earlier value stays visible in "Revisions". (pipeline)
- F3.5 Given values from different series, when charted, then they are never joined into one line. (LineChart + data.test.ts)

### F5 Representatives — Done (Lok Sabha)
- F5.1 Given the representatives page, when a user types a state, constituency or name, then the table filters in the browser. (e2e)
- F5.2 Given a member record, when stored, then it contains no contact or personal details. (data.test.ts)
- F5.3 Given the nightly run, when more than 10% of members change or seats do not sum to 543, then the update is held. (people.ts)

### F4 Daily data pipeline — Done (local); scheduled run pending secrets
- F4.1 Given the daily run, when a source fails, then its last verified record stays and is marked stale, and an issue is opened. (run.ts, workflow)
- F4.2 Given two independent readings that differ, when gated, then the record is held. (gates.test.ts)
- F4.3 Given a quote not present in the snapshot, when gated, then the record is held. (gates.test.ts)
- F4.4 Given the same run twice, when executed, then only verification timestamps change. (verified 2026-10-09)
- F4.5 Given a data PR, when it touches any path outside `data/records` or `data/runs`, then CI fails. (ci.yml data-scope)

## Design tokens (Visual direction — anti-AI-slop; enforced by `npm run lint:slop`)
- Type: IBM Plex Sans + IBM Plex Sans Devanagari (UI/body, 17px floor); Noto Serif + Noto Serif Devanagari (headings); IBM Plex Mono tabular figures (numbers).
- Color (light / dark): paper `#F6F1E7` / `#14181F`, ink `#1F2A44` / `#ECE6DA`, sindoor `#B4472B` / `#E07A5C` (selection only), peacock `#1D6B6B` / `#5FB3B0` (data line), haldi `#9A6B12` / `#D8A948` (warnings), rule `#D9D0BF` / `#333A46`. No tricolour palette (reads as political).
- Space: 4 / 8 / 12 / 16 / 24 / 32 / 48. Radius: 0 maps & tables, 4 controls, 8 cards. Hairline rules, no glows or heavy shadows.
- Motion: 160 / 240 / 400 ms, one easing curve `cubic-bezier(0.2,0,0,1)`. Map outline draws once (1.2 s), states settle, zoom 600 ms. Off under reduced motion. Banned: scroll-jacking, parallax, pulse badges, count-up numbers.
- Tone: plain, precise, calm. Do: "Unemployment rate (monthly)". Don't: "Unlock India's jobs story".
