// Privacy-first telemetry with no SDK. Off unless NEXT_PUBLIC_POSTHOG_KEY / NEXT_PUBLIC_SENTRY_DSN are set at build.
// PostHog: cookieless, no person profiles, a random id that lives only in memory for this page view,
// no query strings, no free text. Sentry: message + stack + path only (sendDefaultPii off by construction).
// Allowed events are a closed list (docs/PRIVACY.md); anything else is dropped.
const PH_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const PH_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export type TrackEvent = '$pageview' | 'region_selected' | 'indicator_opened' | 'evidence_opened' | 'source_opened' | 'language_switched' | 'stale_warning_viewed';
type Props = Record<string, string | number | boolean>;

const sessionId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random());
const path = () => (typeof location === 'undefined' ? '' : location.pathname); // never the query string

export function track(event: TrackEvent, props: Props = {}) {
  if (!PH_KEY || typeof window === 'undefined') return;
  const body = JSON.stringify({ api_key: PH_KEY, event, distinct_id: sessionId, properties: { ...props, $current_url: `${location.origin}${path()}`, $process_person_profile: false, $lib: 'yb-web' } });
  const sent = navigator.sendBeacon?.(`${PH_HOST}/i/v0/e/`, new Blob([body], { type: 'application/json' }));
  if (!sent) fetch(`${PH_HOST}/i/v0/e/`, { method: 'POST', body, keepalive: true }).catch(() => {});
}

/** Parse a Sentry DSN into its envelope endpoint. Exported for tests. */
export function sentryEndpoint(dsn: string): { url: string; key: string } | null {
  const m = /^https:\/\/([a-f0-9]+)@([^/]+)\/(\d+)$/.exec(dsn);
  return m ? { url: `https://${m[2]}/api/${m[3]}/envelope/`, key: m[1] } : null;
}

export function reportError(err: unknown) {
  const ep = SENTRY_DSN ? sentryEndpoint(SENTRY_DSN) : null;
  if (!ep || typeof window === 'undefined') return;
  const e = err instanceof Error ? err : new Error(String(err));
  const event = { event_id: crypto.randomUUID().replace(/-/g, ''), timestamp: Date.now() / 1000, platform: 'javascript', level: 'error', request: { url: `${location.origin}${path()}` }, exception: { values: [{ type: e.name, value: e.message.slice(0, 500), stacktrace: e.stack ? { frames: [] } : undefined }] }, extra: { stack: e.stack?.slice(0, 2000) } };
  const envelope = `${JSON.stringify({ event_id: event.event_id, sent_at: new Date().toISOString() })}\n${JSON.stringify({ type: 'event' })}\n${JSON.stringify(event)}`;
  fetch(`${ep.url}?sentry_key=${ep.key}&sentry_version=7`, { method: 'POST', body: envelope, keepalive: true }).catch(() => {});
}
