'use client';
import { useEffect, useState } from 'react';
import { EVENT, hasItem, toggleItem, type SelItem } from '@/lib/selection';

/** Adds or removes one block from the reader's selection. The page URL is filled in at click time. */
export function SelectButton({ item, labels }: { item: Omit<SelItem, 'page' | 'addedAt'>; labels: { add: string; added: string } }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(hasItem(item.id));
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, [item.id]);
  return (
    <button type="button" aria-pressed={on} onClick={() => toggleItem({ ...item, page: window.location.href.split('#')[0], addedAt: new Date().toISOString() })}
      className={`no-print text-sm border rounded-[var(--radius-control)] px-2.5 py-1 ${on ? 'border-peacock text-peacock' : 'border-rule hover:border-ink'}`}>
      {on ? `✓ ${labels.added}` : `+ ${labels.add}`}
    </button>
  );
}
