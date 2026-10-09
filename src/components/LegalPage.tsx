import { legal } from '@/lib/legal';
import type { Lang } from '@/lib/i18n';
import { Disclaimer } from './Disclaimer';

export function LegalPage({ page, lang }: { page: 'privacy' | 'terms' | 'corrections'; lang: Lang }) {
  const l = legal(page, lang);
  return (
    <article className="pt-8 max-w-3xl">
      <h1 className="text-4xl font-semibold">{l.title}</h1>
      <p className="mt-2 text-sm text-sindoor">{l.draft}</p>
      {l.sections.map((s) => (
        <section key={s.h} className="mt-8">
          <h2 className="text-xl font-semibold">{s.h}</h2>
          {s.p.map((p) => <p key={p} className="mt-2">{p}</p>)}
        </section>
      ))}
      <Disclaimer lang={lang} />
    </article>
  );
}
