# Privacy

- No accounts, no forms, no cookies set by the site today. Search runs in the browser.
- Analytics: Cloudflare Web Analytics only (cookieless, no personal data, page-level), when its beacon token is set (D-010). No PostHog, no Sentry, no other third-party scripts.
- Errors: Cloudflare Workers observability logs for the Worker only; no browser error reporting.
- Retention: as set by Cloudflare Web Analytics and Workers logs (Cloudflare defaults).
- Minors: no profiling; career profiles (Stage 2) stay in the browser.
- DPDP Act 2023 / Rules 2025: core duties apply from about 13 May 2027; the site already avoids collecting personal data. A grievance contact must be published before launch (UNKNOWN today).
- Public privacy policy text: `src/lib/legal.ts` (EN + HI), marked draft pending legal review.
