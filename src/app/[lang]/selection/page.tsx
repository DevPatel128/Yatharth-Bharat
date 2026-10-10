import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dict, isLang } from '@/lib/i18n';
import { SelectionView } from '@/components/SelectionView';
import { Disclaimer } from '@/components/Disclaimer';

export async function generateMetadata({ params }: PageProps<'/[lang]/selection'>): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict(lang).sel.title, robots: { index: false } } : {};
}

export default async function Selection({ params }: PageProps<'/[lang]/selection'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const d = dict(lang);
  return (
    <div className="pt-8 max-w-4xl">
      <h1 className="text-4xl font-semibold">{d.sel.title}</h1>
      <p className="mt-3 text-ink-muted no-print">{d.sel.lede}</p>
      <SelectionView labels={d.sel} disclaimer={d.disclaimer} />
      <Disclaimer lang={lang} />
    </div>
  );
}
