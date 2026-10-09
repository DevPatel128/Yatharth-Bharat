import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dict, fmtDate, isLang, pick } from '@/lib/i18n';
import { LOK_SABHA, REGIONS } from '@/lib/data';
import { MemberSearch } from '@/components/MemberSearch';
import { Disclaimer } from '@/components/Disclaimer';
import { ReferenceList } from '@/components/ReferenceList';

export async function generateMetadata({ params }: PageProps<'/[lang]/representatives'>): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict(lang).reps.title } : {};
}

export default async function Representatives({ params }: PageProps<'/[lang]/representatives'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const d = dict(lang);
  const regionName = new Map(REGIONS.map((r) => [r.id, pick(r.name, lang).text]));
  const tag = (f: boolean) => (f ? 'en' : lang);
  const rows = LOK_SABHA.members
    .map((m) => {
      const c = pick(m.constituency, lang), n = pick(m.name, lang), p = pick(m.party, lang);
      return { id: m.id, constituency: c.text, name: n.text, party: p.text, state: regionName.get(m.regionId) ?? m.regionId, constLang: tag(c.fallback), nameLang: tag(n.fallback), partyLang: tag(p.fallback),
        terms: [c.text, n.text, p.text, m.constituency.en, m.name.en, regionName.get(m.regionId), m.regionId.replace(/-/g, ' ')].join(' ').toLowerCase() };
    })
    .sort((a, b) => a.state.localeCompare(b.state, lang) || a.constituency.localeCompare(b.constituency, lang));
  return (
    <div className="pt-8 max-w-5xl">
      <h1 className="text-4xl font-semibold">{d.reps.title}</h1>
      <p className="mt-3 max-w-3xl text-ink-muted">{d.reps.lede}</p>
      <p className="mt-1 text-sm text-ink-muted">{d.reps.verified} {fmtDate(LOK_SABHA.lastVerifiedAt, lang)}</p>
      <section className="mt-6 max-w-3xl border-t border-rule pt-4">
        <h2 className="text-lg font-semibold">{d.reps.whatMpDoes}</h2>
        <p className="mt-1">{d.reps.whatMpDoesBody}</p>
        <p className="mt-3 text-sm text-ink-muted">{d.reps.notYet}</p>
      </section>
      <div className="mt-8">
        <MemberSearch rows={rows} labels={{ search: d.reps.search, placeholder: d.reps.searchPlaceholder, constituency: d.reps.constituency, member: d.reps.member, party: d.reps.party, state: d.reps.state, count: d.reps.count }} />
      </div>
      {LOK_SABHA.noSittingMember.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">{d.reps.noSitting}</h2>
          <ul className="mt-2 list-disc pl-5">{LOK_SABHA.noSittingMember.map((s) => <li key={s.constituency.en}>{pick(s.constituency, lang).text}, {regionName.get(s.regionId)}</li>)}</ul>
        </section>
      )}
      <ReferenceList evidence={LOK_SABHA.members[0].evidence} lang={lang} />
      <p className="mt-2 text-sm"><a href={LOK_SABHA.sourceUrl} rel="noopener noreferrer">{d.reps.officialList}</a></p>
      <Disclaimer lang={lang} />
    </div>
  );
}
