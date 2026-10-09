import Link from 'next/link';
import { en } from '@/lib/dict/en';

export default function NotFound() {
  return (
    <div className="pt-16 max-w-xl">
      <h1 className="text-3xl font-semibold">{en.notFound.title}</h1>
      <p className="mt-2 text-ink-muted">{en.notFound.body}</p>
      <p className="mt-4"><Link href="/en">{en.notFound.home}</Link> · <Link href="/hi" lang="hi">मुखपृष्ठ</Link></p>
    </div>
  );
}
