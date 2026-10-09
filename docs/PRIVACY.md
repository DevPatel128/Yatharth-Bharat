# Privacy

- No accounts, no forms, no cookies set by the site today. Search runs in the browser.
- Analytics (when keys are added): PostHog cookieless mode (`persistence: 'memory'`), no autocapture of inputs, no raw search or AI question text; events limited to: page opened, region selected, indicator opened, evidence opened, source link opened, freshness warning viewed, language switched.
- Errors (when keys are added): Sentry with `sendDefaultPii: false` and query strings stripped.
- Retention: analytics 12 months (PostHog setting), errors 30 days (Sentry free tier).
- Minors: no profiling; career profiles (Stage 2) stay in the browser.
- DPDP Act 2023 / Rules 2025: core duties apply from about 13 May 2027; the site already avoids collecting personal data. A grievance contact must be published before launch (UNKNOWN today).
- Public privacy policy text: `src/lib/legal.ts` (EN + HI), marked draft pending legal review.
