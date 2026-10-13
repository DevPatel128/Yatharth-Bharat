import type { LocalMap } from '@/lib/geo-local';

type Props = {
  map: LocalMap;
  label: string;
  names: Record<string, string>; // district and city ids → display names
  districtHref?: (id: string) => string;
  cityHref?: (id: string) => string;
  focus?: string; // district drawn as the subject; others are context
  showLabels?: boolean;
  legend: { district: string; city: string; block: string };
};

/**
 * A state or district map drawn at build time. Every district and city is a link with a tooltip, so the map works
 * with a keyboard and without JavaScript; the lists on the page give the same links in text.
 */
export function PlaceMap({ map, label, names, districtHref, cityHref, focus, showLabels, legend }: Props) {
  const subject = (id: string) => !focus || id === focus;
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${map.w} ${map.h}`} className="w-full h-auto max-h-[78vh] reveal" role="group" aria-label={label}>
        {map.districts.map((s) => {
          const shape = (
            <path
              d={s.d}
              className={subject(s.id) ? 'fill-[var(--paper-raised)] hover:fill-[color-mix(in_srgb,var(--haldi)_22%,var(--paper-raised))] transition-[fill] duration-150' : 'fill-[var(--paper)]'}
              stroke="var(--ink)" strokeWidth={subject(s.id) ? 1.1 : 0.5} strokeOpacity={subject(s.id) ? 0.9 : 0.35} strokeLinejoin="round"
            />
          );
          return districtHref && s.id !== focus ? (
            <a key={s.id} href={districtHref(s.id)} className="focus:outline-none [&:focus-visible>path]:fill-[color-mix(in_srgb,var(--haldi)_35%,var(--paper-raised))]">
              <title>{names[s.id] ?? s.id}</title>{shape}
            </a>
          ) : <g key={s.id}><title>{names[s.id] ?? s.id}</title>{shape}</g>;
        })}
        {map.blocks.map((s) => <path key={s.id} d={s.d} fill="none" stroke="var(--ink)" strokeWidth="0.4" strokeOpacity="0.35" strokeDasharray="2 2" pointerEvents="none" />)}
        {map.cities.map((s) => {
          const shape = <path d={s.d} className="fill-[var(--peacock)] hover:fill-[var(--sindoor)] transition-[fill] duration-150" fillOpacity="0.7" stroke="var(--peacock)" strokeWidth="0.6" />;
          return cityHref ? (
            <a key={s.id} href={cityHref(s.id)} className="focus:outline-none [&:focus-visible>path]:fill-[var(--sindoor)]"><title>{names[s.id] ?? s.id}</title>{shape}</a>
          ) : <g key={s.id}><title>{names[s.id] ?? s.id}</title>{shape}</g>;
        })}
        {showLabels && map.districts.filter((s) => s.label).map((s) => (
          <text key={`t-${s.id}`} x={s.label![0]} y={s.label![1]} textAnchor="middle" className="fill-[var(--ink)] text-[9px] font-sans pointer-events-none" paintOrder="stroke" stroke="var(--paper-raised)" strokeWidth="2.5">
            {names[s.id] ?? ''}
          </text>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4 h-3 border border-ink bg-paper-raised" aria-hidden="true" />{legend.district}</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4 h-3 bg-peacock opacity-70" aria-hidden="true" />{legend.city}</span>
        {map.blocks.length > 0 && <span className="inline-flex items-center gap-1.5"><span className="inline-block w-4 border-t border-dashed border-ink" aria-hidden="true" />{legend.block}</span>}
      </figcaption>
    </figure>
  );
}
