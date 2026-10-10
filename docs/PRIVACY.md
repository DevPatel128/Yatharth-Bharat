# Privacy

- No accounts, no forms, no cookies set by the site today. Home search and Check a figure run in the browser. The research selection is kept in your browser's local storage only and is never sent to us.
- Ask (`/api/ask`): the question goes to the Worker; with a key set, the question plus matching records go to Anthropic's model via OpenRouter (routing limited to Anthropic, `data_collection: deny`). The Worker never logs the question; answers are cached in KV for 24 h under a SHA-256 of the question; the IP is hashed and used only by the rate limiter.
- Analytics: Cloudflare Web Analytics only (cookieless, no personal data, page-level), when its beacon token is set (D-010). No PostHog, no Sentry, no other third-party scripts.
- Errors: Cloudflare Workers observability logs for the Worker only; no browser error reporting.
- Retention: as set by Cloudflare Web Analytics and Workers logs (Cloudflare defaults).
- Minors: no profiling; career profiles (Stage 2) stay in the browser.
- DPDP Act 2023 / Rules 2025: core duties apply from about 13 May 2027; the site already avoids collecting personal data. Grievance contact: vroelabs@gmail.com (published on the legal pages).
- Public privacy policy text: `src/lib/legal.ts` (EN + HI), marked draft pending legal review.
