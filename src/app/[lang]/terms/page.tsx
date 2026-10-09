import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLang } from '@/lib/i18n';
import { legal } from '@/lib/legal';
import { LegalPage } from '@/components/LegalPage';

export async function generateMetadata({ params }: PageProps<'/[lang]/terms'>): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: legal('terms', lang).title } : {};
}

export default async function Page({ params }: PageProps<'/[lang]/terms'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return <LegalPage page="terms" lang={lang} />;
}
