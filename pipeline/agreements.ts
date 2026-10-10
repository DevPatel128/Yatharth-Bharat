// India's trade agreements from the Department of Commerce's own list.
// commerce.gov.in blocks automated clients (and this project never disguises its client), so the list's JSON is
// captured in a browser into data/manual-inbox/agreements/ and pinned by hash. Every title is kept verbatim and
// must appear in the stored capture (G4); titles pass the neutral-language lint (G7).
// Usage: node pipeline/agreements.ts
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { AgreementsFile } from '../src/lib/schema.ts';
import { g4Quote, g7Legal } from './gates.ts';

const ROOT = new URL('../', import.meta.url);
const INBOX = new URL('data/manual-inbox/agreements/commerce-trade-agreements.json', ROOT);
const OUT = new URL('data/records/agreements/commerce.json', ROOT);
const SNAP = new URL('data/snapshots/agreements/', ROOT);
const HOST = 'https://www.commerce.gov.in';
const LIST_URL = `${HOST}/#/international-trade/trade-agreements`;
// When the capture was taken in the browser (see data/manual-inbox/agreements/SOURCE.txt).
const CAPTURED_AT = '2026-10-11T00:05:00+05:30';

const GROUPS: Record<string, 'concluded' | 'europe-economic' | 'other'> = {
  'Agreements already concluded': 'concluded',
  'Agreements signed with European Countries for Economic Cooperation': 'europe-economic',
  'Other Agreements/ Negotiations': 'other',
};

type Raw = { nid: string; title: string; field_date: string; field_attatched_file: string; field_trade_terms: string; field_visit_page_link: string };

const buf = readFileSync(INBOX);
const text = buf.toString('utf8');
const sha = createHash('sha256').update(buf).digest('hex');
const raw = JSON.parse(text) as Raw[];
if (!Array.isArray(raw) || raw.length < 50) throw new Error(`expected at least 50 entries, got ${raw.length}`);

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
/** "/files/…" is a document on the site; "/ministryofcommerce/x" is the page the site shows at "/#/x". */
function link(r: Raw): { url: string; kind: 'document' | 'page' } {
  if (r.field_attatched_file) return { url: `${HOST}${r.field_attatched_file.startsWith('/') ? '' : '/'}${r.field_attatched_file}`, kind: 'document' };
  const p = r.field_visit_page_link.replace(/^\/ministryofcommerce\/?/, '').replace(/\/$/, '');
  return { url: p ? `${HOST}/#/${p}` : LIST_URL, kind: 'page' };
}
const date = (d: string) => {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(d.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

/** Verbatim slice of the capture from "nid" through the end of the "title" value, exactly as the site served it. */
function titleFragment(nid: string): string | null {
  const start = text.indexOf(`"nid":"${nid}","title":"`);
  if (start < 0) return null;
  let i = start + `"nid":"${nid}","title":"`.length;
  while (i < text.length && text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
  return i < text.length ? text.slice(start, i + 1) : null;
}

const seen = new Set<string>();
const problems: string[] = [];
const agreements = raw
  .filter((r) => GROUPS[r.field_trade_terms])
  .map((r) => {
    const title = clean(r.title);
    // G4: the raw fragment `"nid":…,"title":…` exists in the stored capture and decodes to this title.
    const quote = titleFragment(r.nid);
    let decoded: string | undefined;
    try { decoded = quote ? (JSON.parse(`{${quote}}`) as { title: string }).title : undefined; } catch { decoded = undefined; }
    if (!quote || g4Quote(quote, text).status !== 'pass' || decoded !== r.title) problems.push(`G4: title not anchored in capture: ${title}`);
    if (g7Legal([title]).status !== 'pass') problems.push(`G7: ${title}`);
    let id = `${slug(title)}-${r.nid}`;
    while (seen.has(id)) id += '-x';
    seen.add(id);
    return {
      id, title, group: GROUPS[r.field_trade_terms], listedOn: date(r.field_date), ...link(r),
      evidence: [{ sourceId: 'commerce-trade-agreements', url: LIST_URL, retrievedAt: CAPTURED_AT, snapshotSha256: sha, quote, method: 'browser-capture' as const }],
    };
  });
if (problems.length) throw new Error(`agreements held:\n${problems.join('\n')}`);

const file = AgreementsFile.parse({ schemaVersion: 1, lastVerifiedAt: CAPTURED_AT, listUrl: LIST_URL, agreements });
mkdirSync(new URL('data/records/agreements/', ROOT), { recursive: true });
mkdirSync(SNAP, { recursive: true });
writeFileSync(new URL('commerce-trade-agreements.sha256', SNAP), `${sha}  commerce-trade-agreements.json\n`);
writeFileSync(OUT, `${JSON.stringify(file, null, 2)}\n`);
const by = (g: string) => agreements.filter((a) => a.group === g).length;
console.log(`agreements: ${agreements.length} (concluded ${by('concluded')}, Europe economic cooperation ${by('europe-economic')}, other ${by('other')}); capture sha256 ${sha.slice(0, 12)}…`);
