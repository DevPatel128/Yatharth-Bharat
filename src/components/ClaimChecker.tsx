'use client';
import Link from 'next/link';
import { useId, useSyncExternalStore } from 'react';
import { compareClaim, parseClaim, type ClaimSeries } from '@/lib/claims';
import { fmtDate, fmtNumber } from '@/lib/format';
import type { Lang } from '@/lib/i18n';

export type Topic = { id: string; group: 'national' | 'states' | 'budget'; label: string; sub?: 'region' | 'row'; budget?: boolean; series: ClaimSeries[] };

type L = {
  topic: string; groups: Record<Topic['group'], string>; region: string; row: string; period: string; value: string; valueHint: string;
  unit: string; crore: string; lakhCrore: string; invalid: string; consistent: string; earlier: string; differs: string; notApplicable: string;
  official: string; stated: string; difference: string; relative: string; earlierValue: string; revisedOn: string; tolerance: string;
  seeRecord: string; openSource: string; source: string;
};

const field = 'w-full bg-paper-raised border border-rule rounded-[var(--radius-control)] px-3 py-2 text-base focus:border-ink';

const EVENT = 'yb-check-url';
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener('popstate', cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener('popstate', cb); };
};
/** Write some query parameters (null removes one) without adding a history entry. */
function update(patch: Record<string, string | null>) {
  const q = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(patch)) if (v === null || v === '') q.delete(k); else q.set(k, v);
  window.history.replaceState(null, '', `${window.location.pathname}${q.size ? `?${q}` : ''}`);
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Compares a stated number with the verified record. Runs entirely in the browser. The address is the only
 * state: it holds the topic, period and number (nothing else), so a check can be shared or bookmarked.
 */
export function ClaimChecker({ lang, topics, labels }: { lang: Lang; topics: Topic[]; labels: L }) {
  const id = useId();
  const search = useSyncExternalStore(subscribe, () => window.location.search, () => '');
  const q = new URLSearchParams(search);
  const topic = topics.find((t) => t.id === q.get('t')) ?? topics[0];
  const series = topic.series.find((s) => s.id === q.get('s')) ?? topic.series[0];
  const point = series.points.find((p) => p.period === q.get('p')) ?? series.points.at(-1)!;
  const raw = (q.get('v') ?? '').slice(0, 24);
  const lakh = !!topic.budget && q.get('u') === 'lakh';

  const chooseTopic = (tid: string) => update({ t: tid, s: null, p: null, u: null });
  const chooseSeries = (sid: string) => update({ t: topic.id, s: sid });
  const setPeriod = (p: string) => update({ t: topic.id, s: series.id, p });
  const setRaw = (v: string) => update({ t: topic.id, s: series.id, p: point.period, v });
  const setLakh = (on: boolean) => update({ u: on ? 'lakh' : null });

  const claim = raw.trim() ? parseClaim(raw) : null;
  const scale = lakh ? 1e5 : 1;
  const verdict = claim ? compareClaim(claim, point, series.decimals, scale) : null;
  const dec = series.decimals;
  // Decimals the claim carries once converted to the record's unit (e.g. 50.65 lakh crore = 5065000 crore: 0).
  const claimDec = claim ? Math.max(0, claim.decimals - Math.round(Math.log10(scale))) : 0;
  const tolDec = (t: number) => Math.max(0, -Math.floor(Math.log10(t)));
  const n = (v: number, places = dec) => fmtNumber(v, lang, places);
  const groups = (['national', 'states', 'budget'] as const).map((g) => [g, topics.filter((t) => t.group === g)] as const).filter(([, ts]) => ts.length);

  return (
    <form className="mt-8 grid gap-5 max-w-2xl" onSubmit={(e) => e.preventDefault()}>
      <div>
        <label htmlFor={`${id}-t`} className="block text-sm font-medium mb-1">{labels.topic}</label>
        <select id={`${id}-t`} className={field} value={topic.id} onChange={(e) => chooseTopic(e.target.value)}>
          {groups.map(([g, ts]) => (
            <optgroup key={g} label={labels.groups[g]}>
              {ts.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      {topic.sub && (
        <div>
          <label htmlFor={`${id}-s`} className="block text-sm font-medium mb-1">{topic.sub === 'region' ? labels.region : labels.row}</label>
          <select id={`${id}-s`} className={field} value={series.id} onChange={(e) => chooseSeries(e.target.value)}>
            {topic.series.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-p`} className="block text-sm font-medium mb-1">{labels.period}</label>
          <select id={`${id}-p`} className={field} value={point.period} onChange={(e) => setPeriod(e.target.value)}>
            {[...series.points].reverse().map((p) => <option key={p.period} value={p.period}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-v`} className="block text-sm font-medium mb-1">{labels.value} <span className="font-normal text-ink-muted">({topic.budget ? (lakh ? labels.lakhCrore : labels.crore) : series.unit})</span></label>
          <input
            id={`${id}-v`} className={`${field} num`} inputMode="decimal" autoComplete="off" maxLength={24}
            value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={labels.valueHint} aria-describedby={`${id}-r`}
          />
        </div>
      </div>
      {topic.budget && (
        <fieldset>
          <legend className="text-sm font-medium mb-1">{labels.unit}</legend>
          <div className="flex gap-5">
            <label className="flex items-center gap-2"><input type="radio" name={`${id}-u`} checked={!lakh} onChange={() => setLakh(false)} />{labels.crore}</label>
            <label className="flex items-center gap-2"><input type="radio" name={`${id}-u`} checked={lakh} onChange={() => setLakh(true)} />{labels.lakhCrore}</label>
          </div>
        </fieldset>
      )}

      <div id={`${id}-r`} aria-live="polite">
        {raw.trim() && !claim && <p className="text-sindoor">{labels.invalid}</p>}
        {verdict && (
          <section className="border border-rule rounded-[var(--radius-card)] bg-paper-raised p-4">
            <p className="text-lg font-semibold">
              {verdict.kind === 'consistent' ? labels.consistent : verdict.kind === 'earlier' ? labels.earlier : verdict.kind === 'differs' ? labels.differs : labels.notApplicable}
            </p>
            {verdict.kind !== 'not-applicable' && (
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[0.95rem]">
                <dt className="text-ink-muted">{labels.official}</dt>
                <dd className="num">{n(verdict.official)} <span className="text-ink-muted">{series.unit}</span></dd>
                <dt className="text-ink-muted">{labels.stated}</dt>
                <dd className="num">{n(claim!.value * scale, claimDec)} <span className="text-ink-muted">{series.unit}</span></dd>
                <dt className="text-ink-muted">{labels.difference}</dt>
                <dd className="num">{verdict.diff > 0 ? '+' : ''}{n(verdict.diff, Math.max(dec, claimDec))}{verdict.relPct !== null && <span className="text-ink-muted"> ({labels.relative}: {verdict.relPct > 0 ? '+' : ''}{n(verdict.relPct, 1)}%)</span>}</dd>
                <dt className="text-ink-muted">{labels.tolerance}</dt>
                <dd className="num">±{n(verdict.tolerance, tolDec(verdict.tolerance))}</dd>
                {verdict.kind === 'earlier' && (
                  <>
                    <dt className="text-ink-muted">{labels.earlierValue}</dt>
                    <dd className="num">{n(verdict.earlier)} · {labels.revisedOn} {fmtDate(verdict.supersededAt, lang)}</dd>
                  </>
                )}
              </dl>
            )}
            <p className="mt-3 text-sm">
              {series.label !== topic.label && <span>{topic.label} · {series.label} · </span>}{point.label} · {labels.source}: {series.source}
            </p>
            <p className="mt-1 text-sm flex flex-wrap gap-x-4">
              <Link href={series.href}>{labels.seeRecord}</Link>
              <a href={point.url} rel="noopener noreferrer">{labels.openSource}</a>
            </p>
          </section>
        )}
      </div>
    </form>
  );
}
