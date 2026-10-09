# Privacy

- No accounts, no forms, no cookies set by the site today. Search runs in the browser.
- Analytics: Cloudflare Web Analytics (cookieless, no personal data, page-level only) when its beacon token is set (D-009). PostHog is not used; its adapter stays off.
- Errors (when keys are added): Sentry with `sendDefaultPii: false` and query strings stripped.
- Retention: analytics 12 months (PostHog setting), errors 30 days (Sentry free tier).
- Minors: no profiling; career profiles (Stage 2) stay in the browser.
- DPDP Act 2023 / Rules 2025: core duties apply from about 13 May 2027; the site already avoids collecting personal data. A grievance contact must be published before launch (UNKNOWN today).
- Public privacy policy text: `src/lib/legal.ts` (EN + HI), marked draft pending legal review.
