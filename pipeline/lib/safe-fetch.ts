// G1 transport: fetch only from allowlisted HTTPS hosts, follow redirects only inside the allowlist,
// cap size and time, and hash the exact bytes received. Certificates are always verified.
import { request } from 'node:https';
import { createHash } from 'node:crypto';
import { constants } from 'node:crypto';

export type FetchResult = {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  contentType: string;
  body: Buffer;
  sha256: string;
  retrievedAt: string;
};

type FetchErrorCode = 'host-not-allowed' | 'not-https' | 'too-many-redirects' | 'too-large' | 'timeout' | 'http-status' | 'network';
export class FetchError extends Error {
  code: FetchErrorCode;
  constructor(code: FetchErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export type FetchOptions = {
  allowedHosts: string[];
  maxBytes?: number;
  timeoutMs?: number;
  /** Some government servers still need legacy TLS renegotiation. This never disables certificate checks. */
  legacyTlsRenegotiation?: boolean;
};

const UA = 'YatharthBharatBot/0.1 (+public-interest data verification; respects robots and rate limits)';

export function assertAllowed(url: URL, allowedHosts: string[]) {
  if (url.protocol !== 'https:') throw new FetchError('not-https', `refusing non-HTTPS URL ${url.href}`);
  if (!allowedHosts.includes(url.hostname)) throw new FetchError('host-not-allowed', `host ${url.hostname} is not on the source allowlist`);
}

function once(url: URL, o: Required<Omit<FetchOptions, 'allowedHosts'>>): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: 'GET',
        headers: { 'user-agent': UA, accept: 'application/json, text/csv, text/xml, text/html;q=0.5' },
        timeout: o.timeoutMs,
        rejectUnauthorized: true,
        secureOptions: o.legacyTlsRenegotiation ? constants.SSL_OP_LEGACY_SERVER_CONNECT : undefined,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (c: Buffer) => {
          size += c.length;
          if (size > o.maxBytes) {
            req.destroy(new FetchError('too-large', `response exceeds ${o.maxBytes} bytes`));
            return;
          }
          chunks.push(c);
        });
        res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }));
        res.on('error', reject);
      },
    );
    req.on('timeout', () => req.destroy(new FetchError('timeout', `timed out after ${o.timeoutMs} ms`)));
    req.on('error', (e) => reject(e instanceof FetchError ? e : new FetchError('network', e.message)));
    req.end();
  });
}

export async function safeFetch(rawUrl: string, opts: FetchOptions): Promise<FetchResult> {
  const o = { maxBytes: 20 * 1024 * 1024, timeoutMs: 45_000, legacyTlsRenegotiation: false, ...opts };
  let url = new URL(rawUrl);
  for (let hop = 0; hop <= 3; hop++) {
    assertAllowed(url, o.allowedHosts);
    const res = await once(url, o);
    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      url = new URL(String(res.headers.location), url);
      continue;
    }
    if (res.status !== 200) throw new FetchError('http-status', `HTTP ${res.status} from ${url.href}`);
    return {
      requestedUrl: rawUrl,
      finalUrl: url.href,
      status: res.status,
      contentType: String(res.headers['content-type'] ?? ''),
      body: res.body,
      sha256: createHash('sha256').update(res.body).digest('hex'),
      retrievedAt: new Date().toISOString(),
    };
  }
  throw new FetchError('too-many-redirects', `more than 3 redirects from ${rawUrl}`);
}

export const sha256 = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
