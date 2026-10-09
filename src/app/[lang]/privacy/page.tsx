import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLang } from '@/lib/i18n';
import { legal } from '@/lib/legal';
import { LegalPage } from '@/components/LegalPage';

export async function generateMetadata({ params }: PageProps<'/[lang]/privacy'>): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: legal('privacy', lang).title } : {};
}

export default async function Page({ params }: PageProps<'/[lang]/privacy'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return <LegalPage page="privacy" lang={lang} />;
}
