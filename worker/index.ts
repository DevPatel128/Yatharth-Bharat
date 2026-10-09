// Cloudflare Worker in front of the static site. Runs only for "/" and "/api/*" (see wrangler.jsonc
// run_worker_first); every other request is served straight from static assets with no Worker CPU.
import { INDICATORS, REGIONS } from '../src/lib/data.ts';

type Env = { ASSETS: { fetch(req: Request): Promise<Response> } };

function health(): Response {
  // Reflects real state: verified vs stale records and data age. Never a hard-coded "ok" (AGENTS.md rule 11).
  const stale = INDICATORS.filter((i) => i.state !== 'verified').map((i) => i.id);
  const lastVerified = INDICATORS.map((i) => i.lastVerifiedAt).filter((v): v is string => v !== null).sort().at(-1) ?? null;
  const ageHours = lastVerified ? (Date.now() - Date.parse(lastVerified)) / 3.6e6 : Number.POSITIVE_INFINITY;
  const ok = REGIONS.length === 36 && stale.length < INDICATORS.length && ageHours < 24 * 8;
  return Response.json({ ok, regions: REGIONS.length, indicators: INDICATORS.length, stale, lastVerified, dataAgeHours: Math.round(ageHours) }, { status: ok ? 200 : 503, headers: { 'cache-control': 'no-store' } });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/api/health') return req.method === 'GET' ? health() : new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET' } });
    if (url.pathname.startsWith('/api/')) return Response.json({ error: 'not_found' }, { status: 404 });
    if (url.pathname === '/') {
      // Language from the browser preference; Hindi readers land on /hi.
      const hi = /(^|,)\s*hi\b/i.test(req.headers.get('accept-language') ?? '');
      return Response.redirect(new URL(hi ? '/hi' : '/en', url), 302);
    }
    return env.ASSETS.fetch(req);
  },
};
