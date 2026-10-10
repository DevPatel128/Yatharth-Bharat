// Select & Export: items a reader collects for research. Stored only in the reader's browser (localStorage).
// Each item carries its own sources so an exported snippet is self-contained and citable.
export type SelSource = { publisher: string; title: string; url: string; retrieved: string; ref?: string; sha256?: string };
export type SelItem = {
  id: string; // stable block id, e.g. "indicator:cpi-inflation:2026-08"
  title: string;
  kind: string;
  lines: string[]; // the content, as plain sentences
  table?: { head: string[]; rows: (string | number)[][] };
  sources: SelSource[];
  page: string; // absolute URL of the page on this site
  addedAt: string;
};

const KEY = 'yb-selection-v1';
export const EVENT = 'yb-selection-changed';

export function readSelection(): SelItem[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
function write(items: SelItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable: selection stays in memory for this page */ }
  window.dispatchEvent(new Event(EVENT));
}
export const hasItem = (id: string) => readSelection().some((i) => i.id === id);
export function toggleItem(item: SelItem) {
  const cur = readSelection();
  write(cur.some((i) => i.id === item.id) ? cur.filter((i) => i.id !== item.id) : [...cur, item]);
}
export const removeItem = (id: string) => write(readSelection().filter((i) => i.id !== id));
export const clearSelection = () => write([]);

const SITE = 'Yatharth Bharat';
const year = (iso: string) => iso.slice(0, 4);
const longDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

/** Citation strings for an item's primary source, in four common styles. Deterministic; no model involved. */
export function citations(item: SelItem): { apa: string; mla: string; chicago: string; bibtex: string } {
  const s = item.sources[0];
  if (!s) return { apa: '', mla: '', chicago: '', bibtex: '' };
  const key = `${s.publisher.split(/[ ,(]/)[0].toLowerCase()}${year(s.retrieved)}${item.id.replace(/[^a-z0-9]/gi, '').slice(0, 12)}`;
  return {
    apa: `${s.publisher}. (${year(s.retrieved)}). ${s.title}${s.ref ? `, ${s.ref}` : ''}. Retrieved ${longDate(s.retrieved)}, from ${s.url}`,
    mla: `${s.publisher}. "${s.title}${s.ref ? `, ${s.ref}` : ''}." Accessed ${longDate(s.retrieved)}. ${s.url}.`,
    chicago: `${s.publisher}. "${s.title}${s.ref ? `, ${s.ref}` : ''}." Accessed ${longDate(s.retrieved)}. ${s.url}.`,
    bibtex: `@misc{${key},\n  author = {{${s.publisher}}},\n  title = {${s.title}${s.ref ? `, ${s.ref}` : ''}},\n  year = {${year(s.retrieved)}},\n  howpublished = {\\url{${s.url}}},\n  note = {Accessed ${s.retrieved.slice(0, 10)}; compiled via ${SITE}}\n}`,
  };
}

export function toMarkdown(items: SelItem[], disclaimer: string): string {
  const out: string[] = [];
  for (const i of items) {
    out.push(`## ${i.title}`, '', ...i.lines.map((l) => `${l}`), '');
    if (i.table) out.push(`| ${i.table.head.join(' | ')} |`, `|${i.table.head.map(() => '---').join('|')}|`, ...i.table.rows.map((r) => `| ${r.join(' | ')} |`), '');
    out.push('Sources:', ...i.sources.map((s) => `- ${s.publisher}, ${s.title}${s.ref ? `, ${s.ref}` : ''}. ${s.url} (retrieved ${s.retrieved.slice(0, 10)}${s.sha256 ? `, SHA-256 ${s.sha256.slice(0, 16)}…` : ''})`), `- Page: ${i.page}`, '');
  }
  out.push('---', disclaimer);
  return out.join('\n');
}

export const toText = (items: SelItem[], disclaimer: string) => toMarkdown(items, disclaimer).replace(/^## /gm, '').replace(/^\|.*\|$/gm, (l) => l.replace(/^\| | \|$/g, '').replace(/ \| /g, '\t')).replace(/^\|?-+.*$/gm, '');

/** CSV of every table in the selection. Cells that could be read as spreadsheet formulas are escaped (AGENTS.md rule 9). */
export function toCsv(items: SelItem[]): string {
  const cell = (v: string | number) => {
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines: string[] = [];
  for (const i of items.filter((x) => x.table)) {
    lines.push(cell(i.title), i.table!.head.map(cell).join(','), ...i.table!.rows.map((r) => r.map(cell).join(',')), cell(`Source: ${i.sources.map((s) => `${s.publisher} ${s.url}`).join('; ')}`), '');
  }
  return lines.join('\n');
}
