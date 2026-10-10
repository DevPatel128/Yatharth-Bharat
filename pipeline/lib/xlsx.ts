// Minimal, dependency-free .xlsx reader: values only (no formulas, styles or scripts are evaluated).
// An .xlsx file is a zip of XML parts; this reads the central directory, inflates the parts it needs,
// and returns each sheet as rows of cell values keyed by column letter. Anything unexpected throws.
import { inflateRawSync } from 'node:zlib';

const MAX_PART = 20 * 1024 * 1024;

function unzip(buf: Buffer): Map<string, Buffer> {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip file (no end of central directory)');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map<string, Buffer>();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('corrupt zip central directory');
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    p += 46 + nameLen + extraLen + commentLen;
    if (usize > MAX_PART) throw new Error(`zip part ${name} too large`);
    if (buf.readUInt32LE(local) !== 0x04034b50) throw new Error('corrupt zip local header');
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + csize);
    if (method === 0) out.set(name, Buffer.from(data));
    else if (method === 8) out.set(name, inflateRawSync(data, { maxOutputLength: MAX_PART }));
    else throw new Error(`unsupported zip compression ${method} in ${name}`);
  }
  return out;
}

const unescape = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&amp;/g, '&');

/** Text of every <t> run inside an element (shared strings and inline strings can be split into runs). */
const textOf = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unescape(m[1])).join('');

export type Sheet = { name: string; rows: Map<number, Map<string, string | number>> };

export function readXlsx(buf: Buffer): Sheet[] {
  const parts = unzip(buf);
  const part = (n: string) => {
    const b = parts.get(n);
    if (!b) throw new Error(`xlsx part missing: ${n}`);
    return b.toString('utf8');
  };
  const shared = parts.has('xl/sharedStrings.xml') ? [...part('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1])) : [];
  const rels = new Map([...part('xl/_rels/workbook.xml.rels').matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  const sheets: Sheet[] = [];
  for (const m of part('xl/workbook.xml').matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    const target = rels.get(m[2]);
    if (!target) throw new Error(`no relationship for sheet ${m[1]}`);
    const xml = part(target.startsWith('/') ? target.slice(1) : `xl/${target}`);
    const rows: Sheet['rows'] = new Map();
    for (const c of xml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const [, col, row, attrs, inner = ''] = c;
      const t = /\bt="([^"]+)"/.exec(attrs)?.[1];
      const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
      let value: string | number | undefined;
      if (t === 's' && v !== undefined) value = shared[Number(v)];
      else if (t === 'inlineStr') value = textOf(inner);
      else if (t === 'str' || t === 'e') value = v === undefined ? undefined : unescape(v);
      else if (v !== undefined) value = Number(v);
      if (value === undefined || value === '') continue;
      const r = Number(row);
      if (!rows.has(r)) rows.set(r, new Map());
      rows.get(r)!.set(col, value);
    }
    sheets.push({ name: unescape(m[1]), rows });
  }
  return sheets;
}
