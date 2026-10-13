// G1 transport: fetch only from allowlisted HTTPS hosts, follow redirects only inside the allowlist,
// cap size and time, and hash the exact bytes received. Certificates are always verified.
import { request } from 'node:https';
import { rootCertificates } from 'node:tls';
import { createHash } from 'node:crypto';
import { constants } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';

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
  /** Extra trusted root certificates (PEM), added to Node's built-in roots, never replacing them. */
  extraCa?: string[];
  /**
   * Session cookies for sites whose public download links need one (e.g. a CSRF token tied to a session).
   * Cookies the server sets are stored here and sent back on later requests to the same host.
   */
  cookieJar?: Map<string, string>;
};

const UA = 'YatharthBharatBot/0.1 (+public-interest data verification; respects robots and rate limits)';

export function assertAllowed(url: URL, allowedHosts: string[]) {
  if (url.protocol !== 'https:') throw new FetchError('not-https', `refusing non-HTTPS URL ${url.href}`);
  if (!allowedHosts.includes(url.hostname)) throw new FetchError('host-not-allowed', `host ${url.hostname} is not on the source allowlist`);
}

function once(url: URL, o: Required<Omit<FetchOptions, 'allowedHosts' | 'cookieJar'>> & { cookieJar?: Map<string, string> }): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: 'GET',
        headers: {
          'user-agent': UA,
          accept: 'application/json, application/geo+json, text/csv, text/xml, text/html;q=0.5',
          ...(o.cookieJar?.size ? { cookie: [...o.cookieJar].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
        },
        timeout: o.timeoutMs,
        rejectUnauthorized: true,
        secureOptions: o.legacyTlsRenegotiation ? constants.SSL_OP_LEGACY_SERVER_CONNECT : undefined,
        ca: o.extraCa.length ? [...rootCertificates, ...o.extraCa] : undefined,
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
  const o = { maxBytes: 20 * 1024 * 1024, timeoutMs: 45_000, legacyTlsRenegotiation: false, extraCa: [] as string[], ...opts };
  let url = new URL(rawUrl);
  for (let hop = 0; hop <= 3; hop++) {
    assertAllowed(url, o.allowedHosts);
    const res = await once(url, o);
    if (o.cookieJar) {
      const set = res.headers['set-cookie'];
      for (const c of Array.isArray(set) ? set : set ? [set] : []) {
        const [pair] = c.split(';');
        const i = pair.indexOf('=');
        if (i > 0) o.cookieJar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
      }
    }
    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      url = new URL(String(res.headers.location), url);
      continue;
    }
    if (res.status !== 200) throw new FetchError('http-status', `HTTP ${res.status} from ${url.href}`);
    keepRaw(url, res.body, String(res.headers['content-type'] ?? ''));
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

// Owner rule: everything downloaded from the internet is saved inside the project folder.
// Files land in data/raw/<host>/<YYYY-MM-DD>/<sha256-prefix>-<name>, de-duplicated by content hash,
// and every fetch is listed in data/raw/index.jsonl. data/raw is git-ignored (size); it stays on disk.
const RAW = new URL('../../data/raw/', import.meta.url);
function keepRaw(url: URL, body: Buffer, contentType: string) {
  const hash = createHash('sha256').update(body).digest('hex');
  const ext = /json/.test(contentType) ? '.json' : /csv/.test(contentType) ? '.csv' : /xml/.test(contentType) ? '.xml' : /pdf/.test(contentType) ? '.pdf' : /html/.test(contentType) ? '.html' : '';
  const name = (url.pathname.split('/').filter(Boolean).pop() ?? 'index').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80);
  const day = new Date().toISOString().slice(0, 10);
  const dir = new URL(`${url.hostname}/${day}/`, RAW);
  const file = new URL(`${hash.slice(0, 16)}-${name}${name.endsWith(ext) ? '' : ext}`, dir);
  mkdirSync(dir, { recursive: true });
  if (!existsSync(file)) writeFileSync(file, body);
  appendFileSync(new URL('index.jsonl', RAW), JSON.stringify({ at: new Date().toISOString(), url: url.href, sha256: hash, bytes: body.length, file: file.pathname.split('/data/raw/')[1] }) + '\n');
}
