import { dict, type Lang } from '@/lib/i18n';

/** Shown at the end of every page that presents information (owner requirement). */
export function Disclaimer({ lang }: { lang: Lang }) {
  return (
    <aside aria-label="Disclaimer" className="mt-10 border-t border-rule pt-4 text-[0.9rem] leading-relaxed text-ink-muted max-w-3xl">
      {dict(lang).disclaimer}
    </aside>
  );
}

export function HindiPendingNote({ lang, show }: { lang: Lang; show: boolean }) {
  if (!show) return null;
  return <p className="text-sm text-ink-muted border border-rule rounded-[var(--radius-control)] px-3 py-2 my-4">{dict(lang).hindiPending}</p>;
}
