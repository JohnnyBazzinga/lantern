import type { Act, SourceFile } from '../core/types';
import { Diff } from './kit';

/**
 * An evidence slip: one row cut out of the improvised spreadsheet, exactly as typed,
 * with its file, version and sheet row. The highlighter marks what differs from the row
 * it is being compared with.
 */
export function Slip({ act, other, file, label }: { act: Act; other?: Act; file?: SourceFile; label: string }) {
  const cells: { head: string; ref?: string; value: string; against?: string; wide?: boolean }[] = [
    { head: 'Time', ref: act.evidence.time?.ref, value: act.eventTime, against: other?.eventTime },
    { head: 'What was done', ref: act.evidence.act?.ref, value: act.actText, against: other ? `${other.actText} ${other.notes}` : undefined, wide: true },
    ...(act.notes || other?.notes ? [{ head: 'Comments', ref: act.evidence.notes?.ref, value: act.notes, against: other ? `${other.actText} ${other.notes}` : undefined, wide: true }] : []),
    { head: 'By', ref: act.evidence.by?.ref, value: act.documentedBy },
  ];
  return (
    <figure className="min-w-0 flex-1">
      <figcaption className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-ink-faint">
          {file?.name ?? act.fileId}, row {act.row + 2}
        </span>
      </figcaption>
      <div className="overflow-hidden rounded-[3px] border border-rule-strong bg-sheet shadow-[0_1px_0_var(--color-rule)]">
        <table className="w-full table-fixed border-collapse text-left">
          <tbody>
            {cells.map((c) => (
              <tr key={c.head} className="border-b border-rule last:border-b-0">
                <th scope="row" className="w-28 border-r border-rule bg-paper px-2.5 py-2 align-top text-[13px] font-normal text-ink-soft">
                  {c.head}
                  {c.ref && <span className="block text-[12px] text-ink-faint">{c.ref}</span>}
                </th>
                <td className="px-3 py-2 align-top font-mono text-[15px] leading-snug break-words">
                  <Diff text={c.value} other={c.against} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

export function PatientLine({ act, override }: { act: Act; override?: { patientName: string; patientId: string } }) {
  const name = override?.patientName ?? act.patientName;
  const id = override?.patientId ?? act.patientId;
  return (
    <p className="text-[15px] text-ink-soft">
      <span className="text-lg font-semibold text-ink">{name || 'No name written'}</span>
      {id && <span className="ml-2">{id}</span>}
      {act.bed && <span className="ml-2">bed {act.bed}</span>}
    </p>
  );
}
