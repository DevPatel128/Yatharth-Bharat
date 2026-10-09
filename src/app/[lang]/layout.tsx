import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Devanagari, Noto_Serif, Noto_Serif_Devanagari } from 'next/font/google';
import '../globals.css';
import { dict, isLang, LANGS } from '@/lib/i18n';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

const plexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex-sans', display: 'swap' });
const plexDeva = IBM_Plex_Sans_Devanagari({ subsets: ['devanagari'], weight: ['400', '500', '600'], variable: '--font-plex-deva', display: 'swap' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex-mono', display: 'swap' });
const notoSerif = Noto_Serif({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-noto-serif', display: 'swap' });
const notoSerifDeva = Noto_Serif_Devanagari({ subsets: ['devanagari'], weight: ['500', '600'], variable: '--font-noto-serif-deva', display: 'swap' });

export const dynamicParams = false;
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const d = dict(lang);
  return {
    title: { default: `${d.siteName}: ${d.tagline}`, template: `%s · ${d.siteName}` },
    description: d.home.lede,
    alternates: { languages: { en: '/en', hi: '/hi' } },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f1e7' },
    { media: '(prefers-color-scheme: dark)', color: '#14181f' },
  ],
};

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const d = dict(lang);
  return (
    <html lang={lang} className={`${plexSans.variable} ${plexDeva.variable} ${plexMono.variable} ${notoSerif.variable} ${notoSerifDeva.variable}`}>
      <body className="min-h-dvh flex flex-col antialiased">
        <a href="#main" className="skip-link">{d.skipToContent}</a>
        <SiteHeader lang={lang} />
        <main id="main" className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6">{children}</main>
        <SiteFooter lang={lang} />
      </body>
    </html>
  );
}
