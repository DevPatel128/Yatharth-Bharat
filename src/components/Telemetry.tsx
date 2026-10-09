'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { reportError, track } from '@/lib/telemetry';

/** Page views, uncaught errors, and clicks on elements marked data-track="<event>". No-op without keys. */
export function Telemetry() {
  const pathname = usePathname();
  useEffect(() => { track('$pageview'); }, [pathname]);
  useEffect(() => {
    const onError = (e: ErrorEvent) => reportError(e.error ?? e.message);
    const onRejection = (e: PromiseRejectionEvent) => reportError(e.reason);
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest('[data-track]');
      const name = el?.getAttribute('data-track');
      if (name === 'source_opened' || name === 'evidence_opened' || name === 'region_selected' || name === 'language_switched') track(name, { id: el?.getAttribute('data-track-id') ?? '' });
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    document.addEventListener('click', onClick);
    return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRejection); document.removeEventListener('click', onClick); };
  }, []);
  return null;
}
