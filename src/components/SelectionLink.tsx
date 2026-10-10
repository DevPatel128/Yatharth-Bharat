'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EVENT, readSelection } from '@/lib/selection';

export function SelectionLink({ lang, label }: { lang: string; label: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const sync = () => setN(readSelection().length);
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  return <Link href={`/${lang}/selection`} className="no-underline hover:underline">{label}{n > 0 && <span className="num"> ({n})</span>}</Link>;
}
