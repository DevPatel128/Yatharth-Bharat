// Cloudflare Worker in front of the static site. Runs only for "/" and "/api/*" (see wrangler.jsonc
// run_worker_first); every other request is served straight from static assets with no Worker CPU.
import { INDICATORS, REGIONS } from '../src/lib/data.ts';
import { ANSWER_SYSTEM, answerPrompt, guardAnswer, retrieve, warm, type Doc } from '../src/lib/ask.ts';
import { aiProvider, askAI } from '../src/lib/ai.ts';

type Env = {
  ASSETS: { fetch(req: Request): Promise<Response> };
  ASK_LIMIT?: { limit(o: { key: string }): Promise<{ success: boolean }> };
  ASK_KV?: { get(k: string): Promise<string | null>; put(k: string, v: string, o?: { expirationTtl?: number }): Promise<void> };
  ASK_DAILY_CAP?: string;
  OPENROUTER_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
};
type Ctx = { waitUntil(p: Promise<unknown>): void };

// Build the search corpus at startup so a question costs well under a millisecond of request CPU.
warm();

function health(): Response {
  // Reflects real state: verified vs stale records and data age. Never a hard-coded "ok" (AGENTS.md rule 11).
  const stale = INDICATORS.filter((i) => i.state !== 'verified').map((i) => i.id);
  const lastVerified = INDICATORS.map((i) => i.lastVerifiedAt).filter((v): v is string => v !== null).sort().at(-1) ?? null;
  const ageHours = lastVerified ? (Date.now() - Date.parse(lastVerified)) / 3.6e6 : Number.POSITIVE_INFINITY;
  const ok = REGIONS.length === 36 && stale.length < INDICATORS.length && ageHours < 24 * 8;
  return Response.json({ ok, regions: REGIONS.length, indicators: INDICATORS.length, stale, lastVerified, dataAgeHours: Math.round(ageHours) }, { status: ok ? 200 : 503, headers: { 'cache-control': 'no-store' } });
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
const sha256 = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
const result = (d: Doc) => ({ title: d.title, href: d.href, source: d.source, snippet: d.text.length > 280 ? `${d.text.slice(0, 277)}…` : d.text });

/**
 * POST /api/ask {q, lang}. Matching records are always returned; a model-written answer is added only when a key
 * is configured, the visitor is under the rate limit, the daily cap is not reached, and the answer passes
 * guardAnswer. The question is never logged; an answer is cached for 24 h under a hash of the question.
 */
async function ask(req: Request, env: Env, ctx: Ctx): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin) return json({ error: 'cross_origin' }, 403);
  if (!(req.headers.get('content-type') ?? '').startsWith('application/json')) return json({ error: 'json_required' }, 415);
  const raw = await req.text();
  if (raw.length > 2048) return json({ error: 'too_large' }, 413);
  let body: { q?: unknown; lang?: unknown };
  try { body = JSON.parse(raw); } catch { return json({ error: 'bad_json' }, 400); }
  const q = typeof body.q === 'string' ? body.q.replace(/\s+/g, ' ').trim() : '';
  const lang = body.lang === 'hi' ? 'hi' : body.lang === 'en' ? 'en' : null;
  if (!lang || q.length < 3 || q.length > 300) return json({ error: 'bad_question' }, 400);

  const docs = retrieve(q, lang, 6);
  const results = docs.map(result);
  if (!docs.length) return json({ status: 'no-match', results });
  const keys = { OPENROUTER_API_KEY: env.OPENROUTER_API_KEY, ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY };
  if (!aiProvider(keys) || !env.ASK_KV || !env.ASK_LIMIT) return json({ status: 'unconfigured', results });

  const ip = req.headers.get('cf-connecting-ip') ?? 'unknown';
  if (!(await env.ASK_LIMIT.limit({ key: await sha256(`ask:${ip}`) })).success) return json({ status: 'limited', results }, 429);

  const cacheKey = `ans:${await sha256(`${lang}\n${q.toLowerCase()}`)}`;
  const cached = await env.ASK_KV.get(cacheKey);
  if (cached) return json({ ...JSON.parse(cached), results, cached: true });

  const day = `cap:${new Date().toISOString().slice(0, 10)}`;
  const used = Number((await env.ASK_KV.get(day)) ?? 0);
  if (used >= Number(env.ASK_DAILY_CAP ?? 300)) return json({ status: 'capped', results });
  ctx.waitUntil(env.ASK_KV.put(day, String(used + 1), { expirationTtl: 2 * 86400 }));

  let text: string;
  try { text = await askAI('answer', ANSWER_SYSTEM(lang), answerPrompt(q, docs), keys); } catch { return json({ status: 'error', results }, 502); }
  const g = guardAnswer(text, q, docs);
  const out = g.status === 'answered'
    ? { status: 'answered', answer: g.answer, citations: g.cited.map((n) => ({ n, ...result(docs[n - 1]) })) }
    : { status: g.status };
  if (g.status !== 'unverified') ctx.waitUntil(env.ASK_KV.put(cacheKey, JSON.stringify(out), { expirationTtl: 86400 }));
  return json({ ...out, results });
}

const worker = {
  async fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/api/ask') return ask(req, env, ctx);
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

export default worker;
