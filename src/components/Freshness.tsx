import { dict, fmtDate, type Lang } from '@/lib/i18n';
import type { Indicator } from '@/lib/schema';

/** Plain-text freshness: never a decorative "live" badge. */
export function Freshness({ indicator, lang }: { indicator: Pick<Indicator, 'state' | 'lastVerifiedAt'>; lang: Lang }) {
  const d = dict(lang);
  const tone = indicator.state === 'verified' ? 'text-peacock' : 'text-sindoor';
  return (
    <p className="text-sm">
      <span className={`font-medium ${tone}`}>{d.freshness[indicator.state]}</span>
      {indicator.lastVerifiedAt && <span className="text-ink-muted"> · {d.freshness.lastChecked} {fmtDate(indicator.lastVerifiedAt, lang)}</span>}
    </p>
  );
}
