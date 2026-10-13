# Cloudflare decommission (2026-10-13)

## What happened

On 2026-10-13 all Yatharth Bharat resources were removed from Cloudflare. The site is no longer hosted publicly. The code and all data remain in this GitHub repository and in the local copy on the maintainer's Mac.

Removed from Cloudflare:

- Worker `yatharth-bharat` (including `yatharth-bharat.dvpatel.workers.dev`, preview URLs and version history)
- KV namespace `ASK_KV` (id `672d9eacf04045d5b09616b122e5d623`). It held only a daily-cap counter and 24-hour answer cache, so nothing of value was lost.
- Worker secrets (`OPENROUTER_API_KEY` / `ANTHROPIC_API_KEY`) went with the Worker.

Changed on GitHub:

- Repository variable `PROD_URL` deleted. The `deploy` and `uptime` jobs in `.github/workflows/ci.yml` only run when it is set, so pushes no longer deploy.
- Repository variable `AUTOPILOT` set to `off`. The daily `data-update.yml` job (which opened data PRs and triggered deploys) is paused.

The `verify` CI job is unchanged and still runs on pull requests and pushes.

## Why

The goal was to reduce load and usage on the Cloudflare account while the project is paused. This is a pause, not an abandonment: nothing was deleted from the repo, and the project can be brought back.

## Where everything lives now

- Code and data: this repository (`DevPatel128/Yatharth-Bharat`), `data/` included. There was no database; all records are versioned JSON.
- Local copy: the maintainer's Mac, same folder as this repo. It includes `node_modules` and local `.wrangler/state`.

## Run locally (demo)

Requires Node 24.

```bash
npm ci
npx next typegen
npm run dev
```

Open http://localhost:3000. The Ask feature falls back to plain record search unless an API key is set in `.env.local`. For a production-like run on the Workers runtime locally, use `npm run preview` (`wrangler dev`; no Cloudflare login needed).

## Restore to Cloudflare

1. `npx wrangler login`.
2. Create the KV namespace: `npx wrangler kv namespace create ASK_KV`. Put the new id in `wrangler.jsonc` (the old id in the file is dead).
3. Set the secret: `npx wrangler secret put OPENROUTER_API_KEY` (or `ANTHROPIC_API_KEY`).
4. `npm run deploy`.
5. To restore CI deploys, set the GitHub variable `PROD_URL` to the live URL and make sure the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets exist.
6. To restore daily data updates, set `AUTOPILOT` to `on` (or delete it).
7. Re-attach any custom domain in the Cloudflare dashboard and re-create the Web Analytics site if wanted.
