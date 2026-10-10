import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dict, fmtNumber, isLang, pick, type Lang } from '@/lib/i18n';
import { BUDGET } from '@/lib/data';
import type { BudgetTable } from '@/lib/schema';
import { budgetItem } from '@/lib/sel-items';
import { SelectButton } from '@/components/SelectButton';
import { Disclaimer, HindiPendingNote } from '@/components/Disclaimer';
import { ReferenceList } from '@/components/ReferenceList';

export async function generateMetadata({ params }: PageProps<'/[lang]/money'>): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: `${dict(lang).money.title}: ${dict(lang).money.subtitle(BUDGET.budgetYear)}` } : {};
}

const table = (id: string) => BUDGET.tables.find((t) => t.id === id)!;
const row = (t: string, key: string) => table(t).rows.find((r) => r.key === key)!;
/** The source prints "Subsidy -" as a heading above fertiliser, food and petroleum; keep that context on the row. */
function rowLabel(r: BudgetTable['rows'][number], lang: Lang) {
  const l = pick(r.label, lang);
  return r.key.endsWith('-subsidy') ? { ...l, text: `${dict(lang).money.subsidy}: ${l.text}` } : l;
}
/** Index of the budget-year Budget Estimates column. */
const beCol = (t: BudgetTable) => t.columns.findIndex((c) => c.year === BUDGET.budgetYear && c.stage === 'be');

function Table({ t, lang }: { t: BudgetTable; lang: Lang }) {
  const d = dict(lang);
  const title = pick(t.title, lang).text;
  const notes = t.rows.filter((r) => r.discrepancy);
  return (
    <section className="mt-12" aria-labelledby={`t-${t.id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={`t-${t.id}`} className="text-2xl font-semibold">{title}</h2>
        <SelectButton item={budgetItem(BUDGET, t, lang)} labels={{ add: d.sel.add, added: d.sel.added }} />
      </div>
      <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label={title}>
        <table className="w-full text-[0.95rem] border-collapse">
          <caption className="sr-only">{title}, {d.money.crore}</caption>
          <thead>
            <tr className="border-b border-ink text-left align-bottom">
              <th scope="col" className="py-1.5 pr-4">{d.money.row}</th>
              {t.columns.map((c) => (
                <th key={`${c.year}${c.stage}`} scope="col" className="py-1.5 pl-3 text-right whitespace-nowrap">
                  <span className="block num">{c.year}</span><span className="block text-sm font-normal text-ink-muted">{d.money.stageShort[c.stage]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((r) => {
              const label = rowLabel(r, lang);
              const isTotal = r.level === 0;
              return (
                <tr key={r.key} className="border-b border-rule">
                  <th scope="row" className={`py-1.5 pr-4 text-left ${isTotal ? 'font-semibold' : 'font-normal'}`} style={{ paddingLeft: `${r.level * 1.25}rem` }} lang={label.fallback ? 'en' : undefined}>
                    {label.text}
                    {r.footnote && <sup className="ml-0.5 text-ink-muted"><a href={`#fn-${t.id}-${r.footnote}`} className="no-underline">{r.footnote}</a></sup>}
                    {r.discrepancy && <sup className="ml-0.5 text-ink-muted"><a href={`#d-${t.id}-${r.key}`} className="no-underline">*</a></sup>}
                  </th>
                  {r.values.map((v, i) => (
                    <td key={i} className={`py-1.5 pl-3 text-right num whitespace-nowrap ${isTotal ? 'font-semibold' : ''}`}>
                      {v === null ? <span title={d.money.notApplicable} aria-label={d.money.notApplicable}>..</span> : fmtNumber(v, lang, 0)}
                      {r.pctGdp?.[i] != null && <span className="block text-xs text-ink-muted font-normal">({fmtNumber(r.pctGdp[i]!, lang, 1)}%)</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-ink-muted">{d.money.crore}{t.rows.some((r) => r.pctGdp) ? `; (%) = ${d.money.cards.ofGdp}` : ''}</p>
      {(Object.keys(t.footnotes).length > 0 || notes.length > 0) && (
        <div className="mt-3 text-sm max-w-3xl space-y-1">
          <p className="font-medium">{d.money.footnotes}</p>
          {Object.entries(t.footnotes).map(([k, v]) => <p key={k} id={`fn-${t.id}-${k}`} lang="en">{k}. {v}</p>)}
          {notes.map((r) => <p key={r.key} id={`d-${t.id}-${r.key}`}><span className="font-medium">* {d.money.note}:</span> <span lang="en">{r.label.en}: {r.discrepancy}</span></p>)}
        </div>
      )}
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-ink-muted">{d.money.evidence}</summary>
        <ul className="mt-2 space-y-2">
          {t.rows.map((r) => (
            <li key={r.key}>
              <span className="text-ink-muted" lang="en">{r.label.en}</span>
              <pre className="mt-1 whitespace-pre-wrap break-all bg-paper-raised border border-rule rounded-[var(--radius-control)] p-2 font-mono text-xs">{r.evidence[0].quote}</pre>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

export default async function Money({ params }: PageProps<'/[lang]/money'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const d = dict(lang);
  const y = BUDGET.budgetYear;
  const s = table('summary');
  const be = beCol(s);
  const spend = row('summary', 'total-expenditure').values[be]!;
  const fd = row('summary', 'fiscal-deficit');
  const interest = row('summary', 'interest').values[be]!;
  const tr = table('transfers');
  const transfers = row('transfers', 'total').values[beCol(tr)]!;
  const major = table('expenditure-major');
  const mbe = beCol(major);
  const items = major.rows.filter((r) => r.key !== 'total').map((r) => ({ r, v: r.values[mbe] ?? 0 })).sort((a, b) => b.v - a.v);
  const mtotal = row('expenditure-major', 'total').values[mbe]!;
  const pct = (v: number) => fmtNumber((v / mtotal) * 100, lang, 1);
  const hindiMissing = lang === 'hi' && BUDGET.tables.some((t) => t.rows.some((r) => r.label.hi === null));
  const refs = [...new Map(BUDGET.tables.map((t) => [t.doc, t.rows[0].evidence[0]])).values()];

  return (
    <div className="pt-8 max-w-5xl">
      <p className="text-sm uppercase tracking-wide text-ink-muted">{d.money.subtitle(y)}</p>
      <h1 className="text-4xl font-semibold">{d.money.title}</h1>
      <p className="mt-3 max-w-3xl text-ink-muted">{d.money.lede}</p>

      <dl className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-sm text-ink-muted">{d.money.cards.spend(y)}</dt><dd className="text-3xl num mt-1">₹{fmtNumber(spend, lang, 0)}</dd><dd className="text-sm text-ink-muted">{d.money.crore}</dd></div>
        <div><dt className="text-sm text-ink-muted">{d.money.cards.deficit(y)}</dt><dd className="text-3xl num mt-1">{fmtNumber(fd.pctGdp![be]!, lang, 1)}%</dd><dd className="text-sm text-ink-muted">{d.money.cards.ofGdp} · ₹{fmtNumber(fd.values[be]!, lang, 0)} {d.money.crore.replace('₹ ', '')}</dd></div>
        <div><dt className="text-sm text-ink-muted">{d.money.cards.interest(y)}</dt><dd className="text-3xl num mt-1">{fmtNumber((interest / spend) * 100, lang, 1)}%</dd><dd className="text-sm text-ink-muted">{d.money.cards.ofSpend} · ₹{fmtNumber(interest, lang, 0)} {d.money.crore.replace('₹ ', '')}</dd></div>
        <div><dt className="text-sm text-ink-muted">{d.money.cards.states(y)}</dt><dd className="text-3xl num mt-1">₹{fmtNumber(transfers, lang, 0)}</dd><dd className="text-sm text-ink-muted">{d.money.crore}</dd></div>
      </dl>

      <section className="mt-10 max-w-3xl border-t border-rule pt-6" aria-labelledby="read-h">
        <h2 id="read-h" className="text-xl font-semibold">{d.money.readHeading}</h2>
        <ul className="mt-2 list-disc pl-5 space-y-1">{d.money.readBody.map((p) => <li key={p}>{p}</li>)}</ul>
      </section>

      <section className="mt-12" aria-labelledby="major-h">
        <h2 id="major-h" className="text-2xl font-semibold">{d.money.majorChart(y)}</h2>
        <ol className="mt-4 space-y-2">
          {items.map(({ r, v }) => {
            const label = rowLabel(r, lang);
            return (
              <li key={r.key} className="grid grid-cols-[minmax(8rem,14rem)_1fr_auto] items-center gap-3 text-[0.95rem]">
                <span lang={label.fallback ? 'en' : undefined}>{label.text}</span>
                <span className="h-3 bg-paper-raised" aria-hidden="true"><span className="block h-3 bg-peacock" style={{ width: `${(v / items[0].v) * 100}%` }} /></span>
                <span className="num text-right whitespace-nowrap">{pct(v)}%</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-sm text-ink-muted">{d.money.computed}</p>
      </section>

      {BUDGET.tables.map((t) => <Table key={t.id} t={t} lang={lang} />)}

      <section className="mt-12 max-w-3xl border-t border-rule pt-6" aria-labelledby="checks-h">
        <h2 id="checks-h" className="text-xl font-semibold">{d.money.checksHeading}</h2>
        <p className="mt-2">{d.money.checksBody(BUDGET.checks.length)}</p>
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-ink-muted">{BUDGET.checks.length}</summary>
          <ul className="mt-2 list-disc pl-5" lang="en">{BUDGET.checks.map((c) => <li key={c.name}>{c.name}</li>)}</ul>
        </details>
        <p className="mt-2 text-sm">{BUDGET.aiReview === 'pass' ? d.money.aiPass : d.money.aiPending}</p>
        <p className="mt-2 text-sm text-ink-muted">{d.money.gdp(BUDGET.gdpEstimate.year, fmtNumber(BUDGET.gdpEstimate.value, lang, 0))}</p>
        {lang === 'hi' && <p className="mt-2 text-sm text-ink-muted">{d.money.englishNotes}</p>}
      </section>

      <p className="mt-8 text-sm text-ink-muted">{d.money.notYet}</p>
      <HindiPendingNote lang={lang} show={hindiMissing} />
      <ReferenceList evidence={refs} lang={lang} />
      <Disclaimer lang={lang} />
    </div>
  );
}
