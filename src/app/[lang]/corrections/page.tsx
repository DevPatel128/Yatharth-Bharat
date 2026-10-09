import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLang } from '@/lib/i18n';
import { legal } from '@/lib/legal';
import { LegalPage } from '@/components/LegalPage';

export async function generateMetadata({ params }: PageProps<'/[lang]/corrections'>): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: legal('corrections', lang).title } : {};
}

export default async function Page({ params }: PageProps<'/[lang]/corrections'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return <LegalPage page="corrections" lang={lang} />;
}
