// Builders that turn records into selection items. Server-side; the result is passed to SelectButton.
import { dict, fmtNumber, fmtPeriod, pick, type Lang } from './i18n.ts';
import { getSource } from './sources.ts';
import type { BudgetFile, BudgetTable, Evidence, Explainer, Indicator, Observation, Responsibility } from './schema.ts';
import type { SelItem, SelSource } from './selection.ts';

type Item = Omit<SelItem, 'page' | 'addedAt'>;
const src = (e: Evidence): SelSource => ({ publisher: getSource(e.sourceId).publisher, title: getSource(e.sourceId).name.en, url: e.url, retrieved: e.retrievedAt.slice(0, 24), sha256: e.snapshotSha256 });

export function indicatorItem(ind: Indicator, obs: Observation[], lang: Lang, decimals: number, scope: string): Item {
  const d = dict(lang);
  const last = obs.at(-1);
  const name = pick(ind.name, lang).text;
  return {
    id: `indicator:${ind.id}:${scope}`,
    title: `${name} (${scope})`,
    kind: d.scorecard.categories[ind.category],
    lines: [
      last ? `${fmtNumber(last.value, lang, decimals)} ${pick(ind.unit, lang).text}, ${fmtPeriod(last.period, lang)} (${last.series}).` : '',
      pick(ind.definition, lang).text,
      `${d.scorecard.limitations}: ${pick(ind.limitations, lang).text}`,
    ].filter(Boolean),
    table: { head: [d.scorecard.period, d.scorecard.value], rows: obs.map((o) => [o.period, o.value]) },
    sources: last ? last.evidence.map(src) : [],
  };
}

export function explainerItem(e: Explainer, lang: Lang): Item {
  const d = dict(lang);
  const coi = getSource('constitution');
  const quotes = Object.values(e.answers).flatMap((a) => a.cite).filter((c) => c.quote);
  return {
    id: `explainer:${e.id}`,
    title: pick(e.title, lang).text,
    kind: d.gov.title,
    lines: [pick(e.summary, lang).text, ...Object.entries(e.answers).map(([q, a]) => `${d.gov.questions[q as keyof typeof d.gov.questions]} ${pick(a.text, lang).text}`)],
    sources: [...new Map(quotes.map((c) => [c.ref, { publisher: coi.publisher, title: coi.name.en, url: coi.homepage, retrieved: '2026-10-10', ref: c.ref } satisfies SelSource])).values()],
  };
}

export function responsibilityItem(r: Responsibility, lang: Lang): Item {
  const d = dict(lang);
  const coi = getSource('constitution');
  return {
    id: `who:${r.id}`,
    title: pick(r.issue, lang).text,
    kind: d.who.title,
    lines: [...r.levels.map((l) => `${d.who.levels[l.where]}: ${pick(l.who, lang).text} (${l.cite.ref}: “${l.cite.quote}”)`), `${d.who.raise}: ${pick(r.where, lang).text}`],
    sources: r.levels.map((l) => ({ publisher: coi.publisher, title: coi.name.en, url: coi.homepage, retrieved: '2026-10-10', ref: l.cite.ref })),
  };
}

export function budgetItem(b: BudgetFile, t: BudgetTable, lang: Lang): Item {
  const d = dict(lang);
  const head = [d.money.row, ...t.columns.map((c) => `${c.year} ${d.money.stageShort[c.stage]}`)];
  return {
    id: `budget:${b.budgetYear}:${t.id}`,
    title: `${pick(t.title, lang).text} (${d.money.subtitle(b.budgetYear)})`,
    kind: d.money.title,
    lines: [`${d.money.crore}.`, ...t.rows.filter((r) => r.discrepancy).map((r) => `${d.money.note}: ${r.label.en}: ${r.discrepancy}`)],
    table: { head, rows: t.rows.map((r) => [pick(r.label, lang).text, ...r.values.map((v) => (v === null ? d.money.notApplicable : v))]) },
    sources: [src(t.rows[0].evidence[0])],
  };
}
