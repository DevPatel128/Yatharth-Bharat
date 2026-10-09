---
name: pitch
description: Build or refresh sell material from live data — sell/USER.md, sell/INVESTOR.md, sell/INTERVIEW.md and three decks (investor, user, marketing). Use when the deck gate is met, before fundraising, interviews or launches.
---
# Pitch

Rule 0: blunt. Traction raises money, decks do not. Never invent traction, market size, customers or quotes. Missing data shows as `UNKNOWN`.
Paths: project root `PRODUCT.md` and `GROWTH.md`; write output to `sell/` at the project root. If the project has no `GROWTH.md`, use the default gate in `WOLF/GROW.md`.
1. **Gate:** decks need 30 days of usage data and 100 signups, or first revenue. The three one-pagers are allowed anytime. If the gate is not met, say so and build only the one-pagers.
   - **Telemetry check first:** if PostHog is wired but holds no events for this product, report that as a Must-fix before pitching. Check whether analytics is opt-in or broken.
2. **Refresh research** (`research`) if the notes in `WOLF/GROW.md` are older than 90 days: what investors want now, stage benchmarks, round and valuation data, buyers' pain language.
3. **Pull numbers** from these sources only:
   - PostHog: funnels, retention, channels incl. AI referrals
   - the app's own database: read-only aggregate counts such as signups and active users, never row data
   - revenue
   - `wolf-stats`
   - `PRODUCT.md`
   Each number gets its source and date. "Gains" compare against the first `wolf-stats` run recorded in `GROWTH.md` as the baseline; with no baseline, give today's value and say so.
4. **Write:**
   - `sell/USER.md`: who it's for · pain in their words · outcome · how it works in 3 steps · proof · price · FAQ · CTA
   - `sell/INVESTOR.md`: problem · why now · solution · market · traction · model · competition · moat · team · ask
   - `sell/INTERVIEW.md`: what I built and why · 3 hard decisions + trade-offs · metrics (incl. PR and ship-time gains) · mistakes → what changed · stack depth
   - `sell/decks/investor.md`: one-liner · problem · solution + demo · why now · ICP · market (bottom-up TAM/SAM/SOM, entry wedge) · traction · business model + unit economics · GTM · competition map + difference · moat · team · 18-month milestones · ask + use of funds · valuation range from comparables, labelled PROJECTION (the founder decides)
   - `sell/decks/user.md`: pain · outcome · 3 steps · demo · proof · price · FAQ · CTA
   - `sell/decks/marketing.md`: audience insights · messaging matrix (pain → message → channel) · 30-day $0 calendar · KPIs
   One narrative per deck, one idea per slide, speaker notes under each slide.
5. **Render:** turn the deck markdown into slides (export .pptx/PDF) when the user asks.
6. **Contradictions:** flag any place where the product's own docs disagree (for example, a README listing AI providers while the site says it runs none).
7. **Self-check:** list every claim without a source, every weak slide, and the 3 questions an investor will ask first, with honest answers.
