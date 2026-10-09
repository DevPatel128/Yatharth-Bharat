import type { MetadataRoute } from 'next';
import { INDICATORS, REGIONS } from '@/lib/data';
import { LANGS } from '@/lib/i18n';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['', '/scorecard', '/sources', '/privacy', '/terms', '/corrections', ...REGIONS.map((r) => `/states/${r.id}`), ...INDICATORS.map((i) => `/scorecard/${i.id}`)];
  return paths.map((p) => ({
    url: `${SITE_URL}/en${p}`,
    alternates: { languages: Object.fromEntries(LANGS.map((l) => [l, `${SITE_URL}/${l}${p}`])) },
  }));
}
