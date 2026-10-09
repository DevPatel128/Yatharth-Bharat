// Canonical origin for absolute URLs (sitemap, robots). Set NEXT_PUBLIC_SITE_URL when a custom domain exists.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yatharth-bharat.dvpatel.workers.dev').replace(/\/$/, '');
