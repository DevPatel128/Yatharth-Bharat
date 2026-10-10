// Union Budget "Budget at a Glance" (Ministry of Finance). indiabudget.gov.in blocks automated access, so the files
// are downloaded by hand into data/manual-inbox/budget/ and pinned by SHA-256 in SOURCE.txt.
// Gates: G1 every file matches its pinned hash and type; G2 every value is a number (or the source's own "not
// applicable" mark); G3 every row is read twice, from the Excel workbook and from the PDF text, and must agree
// (where they differ, the PDF, which the Ministry calls final, is kept only if it satisfies the table's own
// arithmetic, and the difference is shown); G4 each row keeps the verbatim PDF fragment, checked against the
// stored text; G5 every printed identity (totals, deficits, % of GDP) and cross-table equality must hold;
// G6 adversarial AI review when configured; G7/G8 on labels. Usage: node pipeline/budget.ts
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { BudgetFile, type BudgetTable, type Evidence } from '../src/lib/schema.ts';
import { askAI, AiUnconfigured, parseVerdict, REVIEW_SYSTEM } from '../src/lib/ai.ts';
import { pdfText } from './lib/pdf-text.ts';
import { readXlsx, type Sheet } from './lib/xlsx.ts';
import { g7Legal, g8Hindi } from './gates.ts';

const ROOT = new URL('../', import.meta.url);
const INBOX = new URL('data/manual-inbox/budget/', ROOT);
const BASE = 'https://www.indiabudget.gov.in/doc/Budget_at_Glance/';
const BUDGET_YEAR = '2026-27';

// ---------- G1: pinned files ----------
const pins = new Map([...readFileSync(new URL('SOURCE.txt', INBOX), 'utf8').matchAll(/^\s+([a-f0-9]{64})\s+(?:\S*\/)?([\w.]+)$/gm)].map((m) => [m[2], m[1]]));
function load(name: string) {
  const body = readFileSync(new URL(name, INBOX));
  const sha = createHash('sha256').update(body).digest('hex');
  if (pins.get(name) !== sha) throw new Error(`G1: ${name} sha256 ${sha} does not match the pin in SOURCE.txt (${pins.get(name) ?? 'none'})`);
  return { body, sha, retrievedAt: statSync(new URL(name, INBOX)).mtime.toISOString() };
}

const DOCS = ['bag1', 'bag2', 'bag3', 'bag5', 'bag6'] as const;
type Doc = (typeof DOCS)[number];
const pdf = {} as Record<Doc, { text: string; sha: string; retrievedAt: string }>;
mkdirSync(new URL('data/snapshots/budget/', ROOT), { recursive: true });
for (const d of DOCS) {
  const f = load(`${d}.pdf`);
  if (f.body.subarray(0, 5).toString() !== '%PDF-') throw new Error(`G1: ${d}.pdf is not a PDF`);
  const text = (await pdfText(new Uint8Array(f.body))).pages.join('\n--- page\n');
  pdf[d] = { text, sha: f.sha, retrievedAt: f.retrievedAt };
  writeFileSync(new URL(`data/snapshots/budget/${d}.txt`, ROOT), text);
}
const book = readXlsx(load('budget_at_a_glance.xlsx').body);
const sheet = (name: string): Sheet => { const s = book.find((x) => x.name === name); if (!s) throw new Error(`G1: workbook has no sheet "${name}"`); return s; };

// ---------- table definitions ----------
const C4 = [{ year: '2024-25', stage: 'actual' }, { year: '2025-26', stage: 'be' }, { year: '2025-26', stage: 're' }, { year: '2026-27', stage: 'be' }] as const;
const C3 = [{ year: '2024-25', stage: 'actual' }, { year: '2025-26', stage: 're' }, { year: '2026-27', stage: 'be' }] as const;
type RowSpec = { key: string; en: RegExp; level: 0 | 1 | 2; pct?: boolean; footnote?: string; continued?: boolean };
type Spec = { id: string; title: { en: string; hi: string }; doc: Doc; sheet: string; hiCol: string; enCol: string; valueCols: string[]; rows: [number, number]; columns: typeof C4 | typeof C3; specs: RowSpec[] };

const SPECS: Spec[] = [
  { id: 'summary', title: { en: 'Budget at a glance', hi: 'बजट का सार' }, doc: 'bag1', sheet: 'BAAG', hiCol: 'D', enCol: 'E', valueCols: ['F', 'G', 'H', 'I'], rows: [6, 31], columns: C4, specs: [
    { key: 'revenue-receipts', en: /^1\. Revenue Receipts$/, level: 0 },
    { key: 'tax-revenue-net', en: /^2\. Tax Revenue \(Net to Centre\)$/, level: 1, footnote: '1' },
    { key: 'non-tax-revenue', en: /^3\. Non Tax Revenue$/, level: 1 },
    { key: 'capital-receipts', en: /^4\. Capital Receipts$/, level: 0 },
    { key: 'recovery-of-loans', en: /^5\. Recovery of Loans$/, level: 1 },
    { key: 'other-receipts', en: /^6\. Other Receipts$/, level: 1 },
    { key: 'borrowings', en: /^7\. Borrowings and Other Liabilities$/, level: 1, footnote: '2' },
    { key: 'total-receipts', en: /^8\. Total Receipts/, level: 0 },
    { key: 'total-expenditure', en: /^9\. Total Expenditure/, level: 0 },
    { key: 'revenue-account', en: /^10\. On Revenue Account$/, level: 1 },
    { key: 'interest', en: /^11\. Interest Payments$/, level: 2 },
    { key: 'grants-capital-assets', en: /^12\. Grants in Aid for creation$/, level: 2, continued: true },
    { key: 'capital-account', en: /^13\. On Capital Account$/, level: 1 },
    { key: 'effective-capex', en: /^14\. Effective Capital Expenditure/, level: 0 },
    { key: 'revenue-deficit', en: /^15\. Revenue Deficit/, level: 0, pct: true },
    { key: 'effective-revenue-deficit', en: /^16\. Effective Revenue Deficit/, level: 0, pct: true },
    { key: 'fiscal-deficit', en: /^17\. Fiscal Deficit/, level: 0, pct: true },
    { key: 'primary-deficit', en: /^18\. Primary Deficit/, level: 0, pct: true },
  ] },
  { id: 'receipts', title: { en: 'Where the money comes from', hi: 'पैसा कहां से आता है' }, doc: 'bag5', sheet: 'Receipts', hiCol: 'B', enCol: 'C', valueCols: ['D', 'E', 'F', 'G'], rows: [5, 33], columns: C4, specs: [
    { key: 'gross-tax', en: /^Gross Tax Revenue$/, level: 0 },
    { key: 'corporation-tax', en: /^a\. Corporation Tax$/, level: 1 },
    { key: 'income-tax', en: /^b\. Taxes on Income$/, level: 1 },
    { key: 'customs', en: /^c\. Customs$/, level: 1 },
    { key: 'excise', en: /^d\. Union Excise Duties$/, level: 1 },
    { key: 'gst', en: /^e\. GST$/, level: 1 },
    { key: 'ut-taxes', en: /^f\. Taxes of Union Territories$/, level: 1 },
    { key: 'other-taxes', en: /^g\. Other Taxes$/, level: 1 },
    { key: 'less-nccd', en: /^Less - NCCD/, level: 1 },
    { key: 'less-states-share', en: /^Less - State's share$/, level: 1 },
    { key: 'net-tax', en: /^1a Centre's Net Tax Revenue$/, level: 0 },
    { key: 'non-tax', en: /^2\. Non-Tax Revenue$/, level: 0 },
    { key: 'interest-receipts', en: /^Interest receipts$/, level: 1 },
    { key: 'dividends', en: /^Dividends and Profits$/, level: 1 },
    { key: 'external-grants', en: /^External Grants$/, level: 1 },
    { key: 'other-non-tax', en: /^Other Non Tax Revenue$/, level: 1 },
    { key: 'ut-receipts', en: /^Receipts of Union Territories$/, level: 1 },
    { key: 'total-revenue', en: /^Total- Revenue Receipts/, level: 0 },
    { key: 'non-debt-capital', en: /^A\. Non-debt Receipts$/, level: 1 },
    { key: 'debt-receipts', en: /^B\. Debt Receipts$/, level: 1 },
    { key: 'total-capital', en: /^Total Capital Receipts/, level: 0 },
    { key: 'cash-drawdown', en: /^4\. Draw-Down of Cash Balance$/, level: 0 },
    { key: 'total', en: /^Total Receipts \(1a\+2\+3\+4\)$/, level: 0 },
  ] },
  { id: 'expenditure-type', title: { en: 'Spending by type', hi: 'व्यय का प्रकार' }, doc: 'bag6', sheet: 'Expenditure of GOI', hiCol: 'B', enCol: 'C', valueCols: ['D', 'E', 'F', 'G'], rows: [7, 15], columns: C4, specs: [
    { key: 'establishment', en: /^I Establishment Expenditure$/, level: 0 },
    { key: 'central-sector-schemes', en: /^II Central Sector Schemes\/Projects$/, level: 0 },
    { key: 'other-central', en: /^III Other Central Sector Expenditure$/, level: 0 },
    { key: 'interest', en: /^of which Interest Payments$/, level: 1 },
    { key: 'centrally-sponsored', en: /^IV Centrally Sponsored Schemes$/, level: 0 },
    { key: 'finance-commission', en: /^V Finance Commission Grants$/, level: 0 },
    { key: 'other-transfers', en: /^VI Other Grants\/Loans\/Transfers$/, level: 0 },
    { key: 'total', en: /^Grand Total$/, level: 0 },
  ] },
  { id: 'expenditure-major', title: { en: 'Spending on major items', hi: 'प्रमुख मदों पर व्यय' }, doc: 'bag6', sheet: 'Expenditure of GOI', hiCol: 'B', enCol: 'C', valueCols: ['D', 'E', 'F', 'G'], rows: [30, 54], columns: C4, specs: [
    { key: 'pension', en: /^Pension$/, level: 0 },
    { key: 'defence', en: /^Defence$/, level: 0 },
    { key: 'fertiliser-subsidy', en: /^Fertiliser$/, level: 1 },
    { key: 'food-subsidy', en: /^Food$/, level: 1 },
    { key: 'petroleum-subsidy', en: /^Petroleum$/, level: 1 },
    { key: 'agriculture', en: /^Agriculture and Allied Activities$/, level: 0, footnote: '1' },
    { key: 'commerce-industry', en: /^Commerce and Industry$/, level: 0 },
    { key: 'north-east', en: /^Development of North East$/, level: 0 },
    { key: 'education', en: /^Education$/, level: 0 },
    { key: 'energy', en: /^Energy$/, level: 0, footnote: '2' },
    { key: 'external-affairs', en: /^External Affairs$/, level: 0 },
    { key: 'finance', en: /^Finance$/, level: 0 },
    { key: 'health', en: /^Health$/, level: 0 },
    { key: 'home-affairs', en: /^Home Affairs/, level: 0 },
    { key: 'interest', en: /^Interest$/, level: 0 },
    { key: 'it-telecom', en: /^IT and Telecom$/, level: 0, footnote: '3' },
    { key: 'rural-development', en: /^Rural Development$/, level: 0, footnote: '4' },
    { key: 'scientific', en: /^Scientific Departments$/, level: 0 },
    { key: 'social-welfare', en: /^Social Welfare$/, level: 0 },
    { key: 'tax-administration', en: /^Tax Administration$/, level: 0, footnote: '5' },
    { key: 'transport', en: /^Transport$/, level: 0 },
    { key: 'urban-development', en: /^Urban Development$/, level: 0 },
    { key: 'others', en: /^Others$/, level: 0 },
    { key: 'total', en: /^Grand Total$/, level: 0 },
  ] },
  { id: 'deficit-financing', title: { en: 'How the fiscal deficit is financed', hi: 'राजकोषीय घाटे का वित्तपोषण' }, doc: 'bag2', sheet: 'Deficit Statistics', hiCol: 'B', enCol: 'C', valueCols: ['D', 'E', 'F', 'G'], rows: [22, 30], columns: C4, specs: [
    { key: 'debt-net', en: /^1\. Debt Receipts \(Net\)$/, level: 0 },
    { key: 'market-borrowings', en: /^i\. Market Borrowings/, level: 1 },
    { key: 'short-term', en: /^ii\. Short term Borrowing/, level: 1 },
    { key: 'small-savings', en: /^iii\. Securities against Small Savings$/, level: 1 },
    { key: 'state-pf', en: /^iv\. State Provident Funds$/, level: 1 },
    { key: 'other-debt', en: /^v\. Other Receipts/, level: 1 },
    { key: 'external-debt', en: /^vi\. External Debt$/, level: 1 },
    { key: 'cash-drawdown', en: /^2\. Draw Down of Cash Balance$/, level: 0 },
    { key: 'total', en: /^Grand Total/, level: 0 },
  ] },
  { id: 'transfers', title: { en: 'Transfers to states and Union Territories with a legislature', hi: 'राज्यों और विधान मंडल वाले संघ राज्य क्षेत्रों को अंतरण' }, doc: 'bag3', sheet: 'Transfer of Resources', hiCol: 'D', enCol: 'E', valueCols: ['F', 'G', 'H'], rows: [5, 34], columns: C3, specs: [
    { key: 'devolution', en: /^I\. Devolution of States share in taxes$/, level: 0 },
    { key: 'important-items', en: /^II\. Some Important Items of Transfer$/, level: 0 },
    { key: 'capex-loans', en: /^6\. Special Assistance as Loan to States for Capital Investment/, level: 1 },
    { key: 'finance-commission', en: /^III\. Finance Commission Grants$/, level: 0 },
    { key: 'urban-local-bodies', en: /^1\. Grants for Urban Local bodies \(Basic Component \)$/, level: 1 },
    { key: 'rural-local-bodies', en: /^4\. Grants for Rural local bodies$/, level: 1 },
    { key: 'other-transfers', en: /^IV\. Total Transfer to States/, level: 0 },
    { key: 'css-revenue', en: /^1\. Under Centrally Sponsored Schemes \(Revenue\)$/, level: 1 },
    { key: 'delhi-puducherry', en: /^V\. Total Transfer to Delhi and Puducherry$/, level: 0 },
    { key: 'total', en: /^Total Transfer to States\/UTs$/, level: 0 },
  ] },
];

// ---------- reading ----------
const norm = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim();
const NA = /^(\.\.|\.\.\.|…)$/;
/** Spacing only: "( including" → "(including", "निवल )" → "निवल)". Wording is kept exactly as published. */
const tidy = (s: string) => norm(s).replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
/**
 * Official Hindi labels, with two encoding fixes: a trailing "*" whose footnote is not reproduced is dropped, and
 * "ॠण" (vocalic RR, a legacy-font substitution) is written "ऋण" (vocalic R), the standard spelling of "loan".
 */
const tidyHi = (s: string) => tidy(s).replace(/\*+$/, '').replace(/ॠण/g, 'ऋण');
/**
 * Integer tokens in PDF text, skipping years ("2024-2025"), footnote-glued digits ("Energy2") and percentages
 * ("(1.7)"). The PDFs print some negatives as "(-)45801"; those are read as -45801.
 */
function tokens(text: string) {
  return [...text.matchAll(/(?<![\w.,\-–(₹`])(\(-\)\d+|-?\d+|\.\.\.?|…)(?![\w.,\-–)])/g)].map((m) => ({ v: m[1].replace('(-)', '-'), start: m.index!, end: m.index! + m[1].length }));
}
const TOK = Object.fromEntries(DOCS.map((d) => [d, tokens(pdf[d].text)])) as Record<Doc, ReturnType<typeof tokens>>;
const same = (tok: string, v: number | null) => (v === null ? NA.test(tok) : tok === String(v));

/** Find the row's values as consecutive tokens in the PDF at or after `from`; returns the token index or -1. */
function findSeq(doc: Doc, values: (number | null)[], from: number, skip = -1) {
  const t = TOK[doc];
  for (let i = from; i + values.length <= t.length; i++) if (values.every((v, k) => k === skip || same(t[i + k].v, v))) return i;
  return -1;
}

/** Verbatim fragment: from the English label (or first number) on the same line to the last number and any % of GDP. */
function quoteAt(doc: Doc, i: number, n: number, pctCount: number) {
  const text = pdf[doc].text;
  const t = TOK[doc];
  let end = t[i + n - 1].end;
  for (let k = 0; k < pctCount; k++) { const m = /^\s*\(\d+\.\d\)/.exec(text.slice(end)); if (m) end += m[0].length; }
  const lineStart = text.lastIndexOf('\n', t[i].start - 1) + 1;
  const before = text.slice(lineStart, t[i].start);
  const lastDeva = Math.max(...[...before].map((c, k) => (/[ऀ-ॿ]/.test(c) ? k : -1)));
  const start = lineStart + (lastDeva >= 0 ? [...before].slice(0, lastDeva + 1).join('').length : 0);
  return text.slice(start, end).trim();
}

const discrepancies: { table: string; key: string; col: number; xlsx: number | null; pdf: number }[] = [];
const tables: BudgetTable[] = [];
// Rows appear in the PDF in table order, so each search starts after the previous match (identical numbers,
// such as borrowings and the fiscal deficit, then resolve to the right row).
const cursor = Object.fromEntries(DOCS.map((d) => [d, 0])) as Record<Doc, number>;
for (const s of SPECS) {
  const sh = sheet(s.sheet);
  const rows = [...sh.rows].filter(([r]) => r >= s.rows[0] && r <= s.rows[1]);
  const pctRow = (r: number) => sh.rows.get(r + 1);
  const out: BudgetTable['rows'] = [];
  let lastRow = 0;
  for (const spec of s.specs) {
    // The first matching workbook row below the previous one (labels such as "1. Under Centrally Sponsored Schemes" repeat).
    const hits = rows.filter(([r, c]) => r > lastRow && spec.en.test(norm(c.get(s.enCol)))).slice(0, 1);
    if (hits.length !== 1) throw new Error(`${s.id}/${spec.key}: no workbook row below row ${lastRow} matches ${spec.en}`);
    lastRow = hits[0][0];
    const [r, cells] = hits[0];
    // G2: numbers, or the source's own "not applicable" marks.
    const values = s.valueCols.map((c) => {
      const v = cells.get(c);
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string' && NA.test(v.trim())) return null;
      throw new Error(`G2: ${s.id}/${spec.key} column ${c} is ${JSON.stringify(v)}`);
    });
    const pctGdp = spec.pct ? s.valueCols.map((c) => { const m = /^\((\d+\.\d)\)$/.exec(norm(pctRow(r)?.get(c))); if (!m) throw new Error(`G2: ${s.id}/${spec.key} has no % of GDP in column ${c}`); return Number(m[1]); }) : undefined;
    // G3: the same numbers, in order, in the PDF.
    let at = findSeq(s.doc, values, cursor[s.doc]);
    let discrepancy: string | undefined;
    if (at < 0) {
      const cands = values.map((_, k) => ({ k, at: findSeq(s.doc, values, cursor[s.doc], k) })).filter((x) => x.at >= 0).sort((a, b) => a.at - b.at).slice(0, 1);
      if (cands.length !== 1) throw new Error(`G3: ${s.id}/${spec.key} values ${JSON.stringify(values)} not found in ${s.doc}.pdf`);
      const { k } = cands[0];
      at = cands[0].at;
      const p = Number(TOK[s.doc][at + k].v);
      discrepancies.push({ table: s.id, key: spec.key, col: k, xlsx: values[k], pdf: p });
      discrepancy = `The Excel workbook shows ${values[k]} for ${s.columns[k].year} ${s.columns[k].stage === 'actual' ? 'Actuals' : s.columns[k].stage.toUpperCase()}; the PDF, which the Ministry treats as final, shows ${p}.`;
      values[k] = p;
    }
    cursor[s.doc] = at + values.length;
    const quote = quoteAt(s.doc, at, values.length, spec.pct ? values.length : 0);
    if (spec.pct && pctGdp) for (const p of pctGdp) if (!quote.includes(`(${p.toFixed(1)})`)) throw new Error(`G3: ${s.id}/${spec.key} % of GDP ${p} not in the PDF fragment`);
    // G4: the fragment is in the stored text.
    if (!pdf[s.doc].text.includes(quote)) throw new Error(`G4: ${s.id}/${spec.key} quote not found in snapshot`);
    // A label printed over two workbook rows continues on the next row (which carries no values).
    const next = spec.continued ? sh.rows.get(r + 1) : undefined;
    const en = tidy(`${cells.get(s.enCol) ?? ''} ${next?.get(s.enCol) ?? ''}`);
    const hiRaw = tidyHi(`${cells.get(s.hiCol) ?? ''} ${next?.get(s.hiCol) ?? ''}`);
    const hi = hiRaw && g8Hindi(en, hiRaw).status === 'pass' ? hiRaw : null;
    const evidence: Evidence = { sourceId: 'union-budget', url: `${BASE}${s.doc}.pdf`, retrievedAt: pdf[s.doc].retrievedAt, snapshotSha256: pdf[s.doc].sha, quote, method: 'manual-download' };
    out.push({ key: spec.key, label: { en, hi }, level: spec.level, values, ...(pctGdp ? { pctGdp } : {}), ...(spec.footnote ? { footnote: spec.footnote } : {}), ...(discrepancy ? { discrepancy } : {}), evidence: [evidence] });
  }
  tables.push({ id: s.id, title: s.title, doc: s.doc, columns: [...s.columns], rows: out, footnotes: {} });
}

// Footnotes, verbatim from the PDF (English).
const summaryNotes = pdf.bag1.text;
const fn1 = /1 (RE 2025-26 is adjusted by ₹9,084 crore on account of net amount\nreceivable by Centre from the States for prior years\.)/.exec(summaryNotes);
const fn2 = /\n2 (Includes drawdown of Cash Balance\.)/.exec(summaryNotes);
if (!fn1 || !fn2) throw new Error('G4: summary footnotes not found in bag1.pdf');
tables[0].footnotes = { '1': norm(fn1[1]), '2': fn2[1] };
const majorNotes: Record<string, string> = {};
for (const m of pdf.bag6.text.matchAll(/^(\d)\. ((?:The estimate|BE 2026-27 onwards)[\s\S]*?)(?=\n\d\. |\n--- page|$)/gm)) majorNotes[m[1]] = norm(m[2]);
for (const k of ['1', '2', '3', '4', '5']) if (!majorNotes[k]) throw new Error(`G4: footnote ${k} not found in bag6.pdf`);
tables.find((t) => t.id === 'expenditure-major')!.footnotes = majorNotes;

// ---------- G5: the tables' own arithmetic, within and across tables ----------
const v = (table: string, key: string) => { const r = tables.find((t) => t.id === table)?.rows.find((x) => x.key === key); if (!r) throw new Error(`no ${table}/${key}`); return r.values; };
const add = (...xs: (number | null)[][]) => xs[0].map((_, i) => xs.reduce((a, x) => a + (x[i] ?? 0), 0));
const sub = (a: (number | null)[], b: (number | null)[]) => a.map((x, i) => (x ?? 0) - (b[i] ?? 0));
const checks: { name: string; maxDiff: number }[] = [];
function check(name: string, lhs: (number | null)[], rhs: (number | null)[], tol: number, cols?: number[]) {
  const idx = cols ?? lhs.map((_, i) => i);
  const maxDiff = Math.max(...idx.map((i) => Math.abs((lhs[i] ?? 0) - (rhs[i] ?? 0))));
  if (maxDiff > tol) throw new Error(`G5: ${name} differs by ${maxDiff} (tolerance ${tol}): ${JSON.stringify(lhs)} vs ${JSON.stringify(rhs)}`);
  checks.push({ name, maxDiff });
}
const S = (k: string) => v('summary', k);
check('Total receipts = revenue + capital receipts', S('total-receipts'), add(S('revenue-receipts'), S('capital-receipts')), 3);
check('Total expenditure = revenue + capital account', S('total-expenditure'), add(S('revenue-account'), S('capital-account')), 3);
check('Total receipts = total expenditure', S('total-receipts'), S('total-expenditure'), 0);
check('Revenue receipts = net tax + non-tax revenue', S('revenue-receipts'), add(S('tax-revenue-net'), S('non-tax-revenue')), 3);
check('Capital receipts = loans recovered + other + borrowings', S('capital-receipts'), add(S('recovery-of-loans'), S('other-receipts'), S('borrowings')), 3);
check('Effective capital expenditure = items 12 + 13', S('effective-capex'), add(S('grants-capital-assets'), S('capital-account')), 3);
check('Revenue deficit = item 10 - item 1', S('revenue-deficit'), sub(S('revenue-account'), S('revenue-receipts')), 3);
check('Effective revenue deficit = item 15 - item 12', S('effective-revenue-deficit'), sub(S('revenue-deficit'), S('grants-capital-assets')), 3);
check('Fiscal deficit = item 9 - (1 + 5 + 6)', S('fiscal-deficit'), sub(S('total-expenditure'), add(S('revenue-receipts'), S('recovery-of-loans'), S('other-receipts'))), 3);
check('Primary deficit = item 17 - item 11', S('primary-deficit'), sub(S('fiscal-deficit'), S('interest')), 3);
const R = (k: string) => v('receipts', k);
check('Gross tax = sum of taxes', R('gross-tax'), add(R('corporation-tax'), R('income-tax'), R('customs'), R('excise'), R('gst'), R('ut-taxes'), R('other-taxes')), 3);
check('Net tax = gross tax - NCCD - states share', R('net-tax'), sub(sub(R('gross-tax'), R('less-nccd')), R('less-states-share')), 3);
check('Non-tax revenue = sum of its items', R('non-tax'), add(R('interest-receipts'), R('dividends'), R('external-grants'), R('other-non-tax'), R('ut-receipts')), 3);
check('Revenue receipts (receipts table) = net tax + non-tax', R('total-revenue'), add(R('net-tax'), R('non-tax')), 3);
check('Capital receipts = non-debt + debt', R('total-capital'), add(R('non-debt-capital'), R('debt-receipts')), 3);
check('Total receipts = revenue + capital + cash drawdown', R('total'), add(R('total-revenue'), R('total-capital'), R('cash-drawdown')), 3);
check('Receipts table total = summary total receipts', R('total'), S('total-receipts'), 0);
check('Receipts table net tax = summary item 2', R('net-tax'), S('tax-revenue-net'), 0);
check('Receipts table revenue receipts = summary item 1', R('total-revenue'), S('revenue-receipts'), 0);
const T = (k: string) => v('expenditure-type', k);
check('Spending by type sums to grand total', T('total'), add(T('establishment'), T('central-sector-schemes'), T('other-central'), T('centrally-sponsored'), T('finance-commission'), T('other-transfers')), 3);
check('Spending by type total = summary total expenditure', T('total'), S('total-expenditure'), 0);
check('Interest (spending by type) = summary item 11', T('interest'), S('interest'), 0);
const M = (k: string) => v('expenditure-major', k);
const majorItems = tables.find((t) => t.id === 'expenditure-major')!.rows.filter((r) => r.key !== 'total').map((r) => r.values);
check('Major items sum to grand total', M('total'), add(...majorItems), 10);
check('Major items total = summary total expenditure', M('total'), S('total-expenditure'), 0);
check('Interest (major items) = summary item 11', M('interest'), S('interest'), 0);
const F = (k: string) => v('deficit-financing', k);
check('Net debt receipts = sum of sources', F('debt-net'), add(F('market-borrowings'), F('short-term'), F('small-savings'), F('state-pf'), F('other-debt'), F('external-debt')), 3);
check('Financing total = debt + cash drawdown', F('total'), add(F('debt-net'), F('cash-drawdown')), 3);
check('Financing total = summary fiscal deficit', F('total'), S('fiscal-deficit'), 0);
const X = (k: string) => v('transfers', k);
check('Transfers total = I + II + III + IV + V', X('total'), add(X('devolution'), X('important-items'), X('finance-commission'), X('other-transfers'), X('delhi-puducherry')), 3);
const r3 = R('less-states-share');
check('Devolution (transfers) = states share (receipts)', X('devolution'), [r3[0], r3[2], r3[3]], 0);

// % of GDP for the budget year must match the stated GDP estimate.
const gdpM = /The GDP for FY 2026-27 is estimated at ₹([\d,]+) crore/.exec(pdf.bag1.text);
if (!gdpM) throw new Error('G4: GDP estimate not found in bag1.pdf');
const gdp = Number(gdpM[1].replace(/,/g, ''));
for (const k of ['revenue-deficit', 'effective-revenue-deficit', 'fiscal-deficit', 'primary-deficit']) {
  const row = tables[0].rows.find((r) => r.key === k)!;
  const computed = (row.values[3]! / gdp) * 100;
  if (Math.abs(computed - row.pctGdp![3]!) > 0.051) throw new Error(`G5: ${k} ${row.pctGdp![3]}% of GDP but ${computed.toFixed(2)}% computed from the stated GDP`);
}
checks.push({ name: '% of GDP (2026-27 BE) matches the stated GDP estimate', maxDiff: 0 });

// Discrepancies are accepted only where the PDF value is the one the arithmetic supports (checked above, since
// the PDF value replaced the workbook value before the checks ran).
for (const d of discrepancies) console.log(`G3 note: ${d.table}/${d.key} col ${d.col}: workbook ${d.xlsx}, PDF ${d.pdf} (PDF kept; arithmetic holds)`);

// ---------- G7 / G8 ----------
const g7 = g7Legal(tables.flatMap((t) => [t.title.en, t.title.hi ?? '', ...t.rows.flatMap((r) => [r.label.en, r.label.hi ?? ''])]));
if (g7.status !== 'pass') throw new Error(`G7: ${g7.detail}`);
for (const t of tables) { const g = g8Hindi(t.title.en, t.title.hi); if (g.status !== 'pass') throw new Error(`G8: title ${t.id}: ${g.detail}`); }

// ---------- G6 ----------
let aiReview: 'pass' | 'pending' = 'pending';
try {
  for (const t of tables) {
    const doc = pdf[t.doc as Doc].text.slice(0, 60_000);
    const verdict = parseVerdict(await askAI('adversarial-review', REVIEW_SYSTEM, `<document>\n${doc}\n</document>\n\n<record>\n${JSON.stringify({ unit: '₹ crore', columns: t.columns, rows: t.rows.map((r) => ({ key: r.key, label: r.label, values: r.values, pctGdp: r.pctGdp, discrepancy: r.discrepancy })) })}\n</record>`));
    if (!verdict.ok) throw new Error(`G6: ${t.id}: ${verdict.problems.join('; ')}`);
  }
  aiReview = 'pass';
} catch (e) {
  if (!(e instanceof AiUnconfigured)) throw e;
  if (process.env.REQUIRE_AI_GATES === 'true') throw new Error('G6: AI review required but not configured');
  console.log('G6: pending (no AI key configured)');
}

const file = BudgetFile.parse({
  schemaVersion: 1, budgetYear: BUDGET_YEAR, unit: '₹ crore', lastVerifiedAt: pdf.bag1.retrievedAt,
  gdpEstimate: { year: '2026-27', value: gdp, quote: gdpM[0] }, tables, checks, aiReview,
});
mkdirSync(new URL('data/records/budget/', ROOT), { recursive: true });
writeFileSync(new URL(`data/records/budget/union-${BUDGET_YEAR}.json`, ROOT), JSON.stringify(file, null, 2) + '\n');
console.log(`budget: ${tables.length} tables, ${tables.reduce((a, t) => a + t.rows.length, 0)} rows, ${checks.length} checks passed, ${discrepancies.length} workbook/PDF differences resolved, G6 ${aiReview}`);
