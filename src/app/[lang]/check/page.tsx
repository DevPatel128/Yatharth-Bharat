import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dict, fmtPeriod, isLang, pick, type Lang } from '@/lib/i18n';
import { BUDGET, DISPLAY_DECIMALS, INDICATORS, REGIONAL, getIndicator, getRegion } from '@/lib/data';
import { getSource } from '@/lib/sources';
import type { ClaimSeries } from '@/lib/claims';
import type { Evidence, Observation } from '@/lib/schema';
import { ClaimChecker, type Topic } from '@/components/ClaimChecker';
import { Disclaimer } from '@/components/Disclaimer';
import { ReferenceList } from '@/components/ReferenceList';

export async function generateMetadata({ params }: PageProps<'/[lang]/check'>): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict(lang).check.title, description: dict(lang).check.lede } : {};
}

const points = (obs: Observation[], lang: Lang) =>
  obs.map((o) => ({
    period: o.period,
    label: fmtPeriod(o.period, lang),
    value: o.value,
    revisions: o.revisions.map((r) => ({ value: r.value, supersededAt: r.supersededAt })),
    url: o.evidence[0].url,
  }));

/** Everything the checker can compare against, reduced to what the browser needs (no evidence text). */
function topics(lang: Lang): Topic[] {
  const d = dict(lang);
  const national: Topic[] = INDICATORS.filter((i) => i.observations.length).map((i) => ({
    id: i.id,
    group: 'national',
    label: pick(i.name, lang).text,
    series: [{
      id: i.id,
      label: pick(i.name, lang).text,
      unit: pick(i.unit, lang).text,
      decimals: DISPLAY_DECIMALS[i.id] ?? 1,
      href: `/${lang}/scorecard/${i.id}`,
      source: getSource(i.sourceId).publisher,
      points: points(i.observations, lang),
    }],
  }));
  const states: Topic[] = REGIONAL.map((r) => {
    const ind = getIndicator(r.indicatorId)!;
    const series: ClaimSeries[] = Object.entries(r.regions)
      .filter(([, v]) => v.observations.length)
      .map(([id, v]) => {
        const region = getRegion(id)!;
        return {
          id,
          label: pick(region.name, lang).text,
          unit: pick(ind.unit, lang).text,
          decimals: DISPLAY_DECIMALS[ind.id] ?? 1,
          href: `/${lang}/states/${id}`,
          source: getSource(ind.sourceId).publisher,
          points: points(v.observations, lang),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, lang === 'hi' ? 'hi' : 'en'));
    return { id: `${ind.id}-states`, group: 'states', label: pick(ind.name, lang).text, sub: 'region', series };
  });
  const budget: Topic[] = BUDGET.tables.map((t) => ({
    id: `budget-${t.id}`,
    group: 'budget',
    label: `${pick(t.title, lang).text} ${BUDGET.budgetYear}`,
    sub: 'row',
    budget: true,
    series: t.rows.flatMap((r) => [{
      id: r.key,
      label: (r.key.endsWith('-subsidy') ? `${d.money.subsidy}: ` : '') + pick(r.label, lang).text,
      unit: d.money.crore,
      decimals: 0,
      href: `/${lang}/money#t-${t.id}`,
      source: getSource(r.evidence[0].sourceId).publisher,
      points: t.columns.map((c, i) => ({
        period: `${c.year}-${c.stage}`,
        label: `${c.year} ${d.money.stageShort[c.stage]}`,
        value: r.values[i],
        revisions: [],
        url: r.evidence[0].url,
      })),
    },
    // Where the Budget prints a row as a share of GDP, that share can be checked too.
    ...(r.pctGdp ? [{
      id: `${r.key}-pct-gdp`,
      label: `${pick(r.label, lang).text} (${d.check.asPctGdp})`,
      unit: d.check.pctGdpUnit,
      decimals: 1,
      href: `/${lang}/money#t-${t.id}`,
      source: getSource(r.evidence[0].sourceId).publisher,
      points: t.columns.map((c, i) => ({
        period: `${c.year}-${c.stage}`,
        label: `${c.year} ${d.money.stageShort[c.stage]}`,
        value: r.pctGdp![i] ?? null,
        revisions: [],
        url: r.evidence[0].url,
      })),
    }] : []),
    ]),
  }));
  return [...national, ...states, ...budget];
}

export default async function Check({ params }: PageProps<'/[lang]/check'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const d = dict(lang);
  const c = d.check;
  // One reference per source the checker draws on.
  const evidence: Evidence[] = [
    ...INDICATORS.map((i) => i.observations.at(-1)?.evidence[0]),
    ...REGIONAL.flatMap((r) => Object.values(r.regions).map((v) => v.observations.at(-1)?.evidence[0])),
    ...BUDGET.tables.map((t) => t.rows[0].evidence[0]),
  ].filter((e): e is Evidence => !!e);
  const refs = [...new Map(evidence.map((e) => [e.sourceId, e])).values()];

  return (
    <div className="pt-8 max-w-4xl">
      <h1 className="text-4xl font-semibold">{c.title}</h1>
      <p className="mt-3 max-w-3xl text-ink-muted">{c.lede}</p>
      <ClaimChecker
        lang={lang}
        topics={topics(lang)}
        labels={{
          topic: c.topic, groups: c.groups, region: c.region, row: c.row, period: c.period, value: c.value, valueHint: c.valueHint,
          unit: c.unit, crore: c.crore, lakhCrore: c.lakhCrore, invalid: c.invalid, consistent: c.consistent, earlier: c.earlier,
          differs: c.differs, notApplicable: c.notApplicable, official: c.official, stated: c.stated, difference: c.difference,
          relative: c.relative, earlierValue: c.earlierValue, revisedOn: c.revisedOn, tolerance: c.tolerance, seeRecord: c.seeRecord,
          openSource: c.openSource, source: c.source,
        }}
      />
      <section className="mt-10 max-w-3xl border-t border-rule pt-6" aria-labelledby="caveats-h">
        <h2 id="caveats-h" className="text-xl font-semibold">{c.caveatsHeading}</h2>
        <ul className="mt-2 list-disc pl-5 space-y-1">{c.caveats.map((p) => <li key={p}>{p}</li>)}</ul>
        <p className="mt-3 text-sm text-ink-muted">{c.privacy}</p>
      </section>
      <ReferenceList evidence={refs} lang={lang} />
      <Disclaimer lang={lang} />
    </div>
  );
}
