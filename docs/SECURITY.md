# Security

Baseline: WOLF `SECURITY.md` (OWASP Top 10:2025, API Top 10:2023). Project specifics:

- **Static by default:** pages are prerendered; the Worker runs only for `/` and `/api/*`. No user input reaches a server except the `Accept-Language` header.
- **Headers** (`public/_headers`): HSTS preload, nosniff, strict referrer, frame DENY, Permissions-Policy, CSP (`'unsafe-inline'` for scripts is required by Next's inline payload; no third-party origins).
- **Ingestion:** host allowlist on every redirect hop (SSRF), HTTPS only, certificate verification always on, size and time caps, content-type sniffing (HTML error pages rejected), no execution of fetched content, documents treated as untrusted in AI prompts.
- **Supply chain:** pinned GitHub Action SHAs, Dependabot monthly, `npm audit --audit-level=high` and gitleaks in CI, `npm` install scripts not auto-approved.
- **Least privilege:** data bot limited to `data/` (CI `data-scope` job); `.github/`, wrangler config, `src/db.ts` and dependencies are protected paths (merge needs the owner). Kill switch `AUTOPILOT=off`.
- **Secrets:** CI secrets only; nothing in the static bundle; `.env*`/`.dev.vars` git-ignored and blocked by the WOLF guard hook.
- **Edge (to configure on deploy):** Cloudflare WAF managed rules; rate limit `/api/*` (e.g. 60 req/min/IP) and stricter for the future AI endpoint (e.g. 10/min/IP plus daily cap) with Turnstile. Exact free-plan availability of rate-limiting rules is UNVERIFIED; check in the dashboard.
- **Responsible disclosure:** GitHub private vulnerability reporting (root `SECURITY.md`).
