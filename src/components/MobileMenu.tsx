'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';

/** Small-screen menu: a native <details> disclosure that closes after navigation and on Escape. */
export function MobileMenu({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const path = usePathname();
  useEffect(() => { if (ref.current) ref.current.open = false; }, [path]);
  return (
    <details
      ref={ref}
      className="lg:hidden relative"
      onKeyDown={(e) => { if (e.key === 'Escape' && ref.current?.open) { ref.current.open = false; ref.current.querySelector('summary')?.focus(); } }}
    >
      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none border border-rule rounded-[var(--radius-control)] px-2 py-0.5 hover:border-ink">{label}</summary>
      <div className="absolute right-0 z-30 mt-2 w-60 bg-paper-raised border border-rule rounded-[var(--radius-card)] p-3">{children}</div>
    </details>
  );
}
