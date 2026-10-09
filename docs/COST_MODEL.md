# Cost model (approximate, 2026-10)

| Item | Driver | Estimate |
|---|---|---|
| Cloudflare Workers | Worker runs only for `/` and `/api/*`; static assets are free | $0 on free plan at launch traffic; $5/month Paid if the 100k/day Worker limit is approached |
| GitHub Actions | ~5 min data run/day + CI per PR | free (public repo) or within 2,000 min/month (private) |
| Anthropic (G6) | Sonnet 5.5 ($2/$10 per MTok) on changed records only; snapshot capped at 60k chars | ~$0.10–0.20 per reviewed record; a few records/day → ~$3–15/month |
| Anthropic (AI search, Stage 1f) | Haiku 5.5 ($0.10/$0.50 per MTok) with caching and hard caps | set a monthly cap in code before launch |
| Cloudflare Web Analytics | free | $0 |
| Domain | registrar | ~₹1,000/year |
| Legal review | one-off | UNKNOWN |

Cheaper alternatives if needed: run G6 weekly instead of daily for unchanged sources; use Haiku for G6 with Sonnet escalation on disagreement.
