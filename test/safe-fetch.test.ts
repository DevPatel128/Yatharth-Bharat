import { expect, it } from 'vitest';
import { assertAllowed, FetchError } from '../pipeline/lib/safe-fetch.ts';

it('allows an allowlisted HTTPS host', () => expect(() => assertAllowed(new URL('https://api.worldbank.org/v2'), ['api.worldbank.org'])).not.toThrow());
it('blocks hosts outside the allowlist (SSRF)', () => expect(() => assertAllowed(new URL('https://169.254.169.254/latest'), ['api.worldbank.org'])).toThrow(FetchError));
it('blocks look-alike hosts', () => expect(() => assertAllowed(new URL('https://api.worldbank.org.evil.com/'), ['api.worldbank.org'])).toThrow(FetchError));
it('blocks plain HTTP', () => expect(() => assertAllowed(new URL('http://api.worldbank.org/'), ['api.worldbank.org'])).toThrow(FetchError));
