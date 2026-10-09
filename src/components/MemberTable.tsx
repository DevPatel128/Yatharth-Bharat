import { pick, type Lang } from "@/lib/i18n";
import type { Member } from '@/lib/schema';
import { Bi } from './Bi';

export type MemberRow = Member & { regionName: string };

/** Accessible table of members: constituency, member, party (and state when listing several regions). */
export function MemberTable({ rows, lang, labels, showState }: { rows: MemberRow[]; lang: Lang; labels: { constituency: string; member: string; party: string; state: string }; showState: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[0.95rem] border-collapse">
        <thead>
          <tr className="border-b border-ink text-left">
            <th scope="col" className="py-1.5 pr-4">{labels.constituency}</th>
            <th scope="col" className="py-1.5 pr-4">{labels.member}</th>
            <th scope="col" className="py-1.5 pr-4">{labels.party}</th>
            {showState && <th scope="col" className="py-1.5">{labels.state}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className="border-b border-rule align-top">
              <th scope="row" className="py-1.5 pr-4 font-normal"><Bi value={m.constituency} lang={lang} /></th>
              <td className="py-1.5 pr-4"><Bi value={m.name} lang={lang} /></td>
              <td className="py-1.5 pr-4 text-ink-muted"><Bi value={m.party} lang={lang} /></td>
              {showState && <td className="py-1.5 text-ink-muted">{m.regionName}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const memberText = (m: Member, lang: Lang) => [pick(m.name, lang).text, pick(m.constituency, lang).text, pick(m.party, lang).text, m.name.en, m.constituency.en].join(' ').toLowerCase();
