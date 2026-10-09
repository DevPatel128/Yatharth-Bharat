import { expect, it } from 'vitest';
import { sentryEndpoint } from '../src/lib/telemetry.ts';

it('parses a Sentry DSN into the envelope endpoint', () => {
  expect(sentryEndpoint('https://abc123@o1.ingest.us.sentry.io/456')).toEqual({ url: 'https://o1.ingest.us.sentry.io/api/456/envelope/', key: 'abc123' });
});
it('rejects malformed DSNs', () => expect(sentryEndpoint('http://x@y/1')).toBeNull());
