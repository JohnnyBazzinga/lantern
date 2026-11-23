import { ct } from '../core/i18n';
import { cellRef } from '../core/parse';
import type { Act, SourceFile } from '../core/types';
import { msgs } from '../i18n/lang';
import { useT } from '../i18n/react';
import { Diff } from './kit';

const M = msgs(
  {
    field: { bed: 'Bed', patient: 'Patient', time: 'Time', what: 'What was done', notes: 'Comments', by: 'By' },
    byShort: 'By',
    source: 'Source',
    noTime: 'no time',
    row: (n: number) => `row ${n}`,
    fileRow: (file: string, n: number) => `${file}, row ${n}`,
    notInSource: 'not in this file',
    noName: 'No name written',
    bedN: (b: string) => `bed ${b}`,
    caption: 'The rows as typed, one above the other',
  },
  {
    field: { bed: 'Cama', patient: 'Doente', time: 'Hora', what: 'O que foi feito', notes: 'Observações', by: 'Registado por' },
    byShort: 'Por',
    source: 'Origem',
    noTime: 'sem hora',
    row: (n) => `linha ${n}`,
    fileRow: (file, n) => `${file}, linha ${n}`,
    notInSource: 'não consta deste ficheiro',
    noName: 'Sem nome escrito',
    bedN: (b) => `cama ${b}`,
    caption: 'As linhas tal como foram escritas, umas por cima das outras',
  },
);

type Field = 'bed' | 'patient' | 'time' | 'what' | 'notes' | 'by';
interface Cell {
  value: string;
  /** the sheet cell it was read from, e.g. "E21" */
  ref?: string;
  /** the text it is compared with: what is not in there gets the highlighter */
  against?: string;
  /** shown on separate lines (name over hospital number), so numbers sit above each other down the stack */
  lines?: string[];
  /** what to say when the cell is empty, in Lantern's voice ("no time"); lit when the other row has a value there */
  blank?: string;
  blankDiffers?: boolean;
}

/** One source row in the stack: a row of a version of the log, or the census line it is checked against. */
export interface StackRow {
  key: string;
  /** the name people know the file by: "Version 1, emailed 03:10" */
  label: string;
  /** the short name used where there is no room: "version 1" */
  short: string;
  fileName: string;
  sheetRow: number;
  cells: Partial<Record<Field, Cell>>;
}

const who = (name: string, id: string) => [name, id].filter(Boolean).join(' ');

/** A row of the log as a stack row, compared with `other` (the other version) and, for the patient, with the census when there is one. */
export function actRow(act: Act, other: Act | undefined, file: SourceFile | undefined, label: string, opts: { identity: boolean; census?: string; noTime: string }): StackRow {
  const theirs = other ? `${other.actText} ${other.notes}` : undefined;
  return {
    key: act.id,
    label,
    short: ct().version(act.versionLabel),
    fileName: file?.name ?? act.fileId,
    sheetRow: act.row + 2,
    cells: {
      ...(opts.identity && {
        bed: { value: act.bed, ref: act.evidence.bed?.ref, against: other?.bed },
        patient: {
          value: who(act.patientName, act.patientId),
          lines: [act.patientName, act.patientId].filter(Boolean),
          ref: act.evidence.patient?.ref,
          against: opts.census ?? (other ? who(other.patientName, other.patientId) : undefined),
        },
      }),
      time: { value: act.eventTime, ref: act.evidence.time?.ref, against: other?.eventTime, blank: opts.noTime, blankDiffers: !!other?.eventTime },
      what: { value: act.actText, ref: act.evidence.act?.ref, against: theirs },
      notes: { value: act.notes, ref: act.evidence.notes?.ref, against: theirs },
      by: { value: act.documentedBy, ref: act.evidence.by?.ref },
    },
  };
}

const normId = (s: string) => s.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

/**
 * The census line for a hospital number, read from the census file the reviewer opened, with the
 * cells it came from. Null when the file or the line cannot be found (the caller then shows the
 * identity the rules already matched, without cell addresses).
 */
export function censusRow(files: SourceFile[], patientId: string, label: string, short: string): StackRow | null {
  const file = files.find((f) => f.role === 'census');
  if (!file) return null;
  const col = (...fields: string[]) => file.mapping.find((c) => fields.includes(c.field))?.index;
  const idCol = col('patient_id', 'patient');
  if (idCol === undefined) return null;
  const r = file.rows.findIndex((row) => normId(row[idCol] ?? '').includes(normId(patientId)) && normId(patientId).length > 0);
  if (r < 0) return null;
  const nameCol = col('patient_name');
  const bedCol = col('bed');
  const cell = (c: number | undefined) => (c === undefined ? '' : (file.rows[r]![c] ?? ''));
  const refs = [nameCol, idCol].filter((c, i, a): c is number => c !== undefined && a.indexOf(c) === i).map((c) => cellRef(r, c));
  return {
    key: `census:${r}`,
    label,
    short,
    fileName: file.name,
    sheetRow: r + 2,
    cells: {
      ...(bedCol !== undefined && { bed: { value: cell(bedCol), ref: cellRef(r, bedCol) } }),
      patient:
        nameCol !== undefined && nameCol !== idCol
          ? { value: who(cell(nameCol), cell(idCol)), lines: [cell(nameCol), cell(idCol)].filter(Boolean), ref: refs.join(' ') }
          : { value: cell(idCol), ref: refs.join(' ') },
    },
  };
}

const WIDTH: Record<Field, string> = { bed: '4rem', patient: '12.5rem', time: '5.75rem', what: 'auto', notes: '36%', by: '4.75rem' };
const ORDER: Field[] = ['bed', 'patient', 'time', 'what', 'notes', 'by'];

/**
 * The evidence stack: source rows exactly as typed, one above the other, so the same field sits
 * directly above itself and what differs is what is left over. Every cell carries the address of the
 * sheet cell it was read from. On a narrow pane it turns field-first (each field, then each source's
 * value under it), so nothing scrolls sideways.
 */
export function Stack({ rows }: { rows: StackRow[] }) {
  const t = useT(M);
  const fields = ORDER.filter((f) => f === 'time' || rows.some((r) => r.cells[f]?.value));
  const cellText = (c: Cell) =>
    !c.value && c.blank ? (
      // an empty cell is described in Lantern's words, never in the ward's typeface
      <span className="block whitespace-nowrap text-[15px] italic leading-[1.55] text-ink-soft">{c.blankDiffers ? <mark className="diff">{c.blank}</mark> : c.blank}</span>
    ) : (
    <span className="block font-mono text-[16px] leading-[1.45] tracking-[-0.01em] break-words">
      {c.lines && c.lines.length > 1 ? (
        c.lines.map((line, i) => (
          <span key={i} className="block">
            <Diff text={line} other={c.against} />
          </span>
        ))
      ) : (
        <Diff text={c.value} other={c.against} />
      )}
    </span>
    );
  return (
    <>
      <table className="hidden w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-xl border border-rule bg-card text-left @3xl:table">
        <caption className="sr-only">{t.caption}</caption>
        <colgroup>
          <col style={{ width: '12.5rem' }} />
          {fields.map((f) => (
            <col key={f} style={{ width: f === 'notes' && fields.includes('patient') ? '22%' : WIDTH[f] }} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-well text-[14px] text-ink">
            <th scope="col" className="px-4 py-2.5 font-semibold">
              {t.source}
            </th>
            {fields.map((f) => (
              <th key={f} scope="col" className="px-4 py-2.5 font-semibold">
                {f === 'by' ? t.byShort : t.field[f]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row" className="border-t border-r border-rule bg-well px-4 py-3 align-top font-normal" title={t.fileRow(r.fileName, r.sheetRow)}>
                <span className="block text-[15px] font-semibold leading-snug text-ink">{r.label.replace(/-/g, '\u2011')}</span>
                <span className="mt-0.5 block text-[13.5px] tabular-nums text-ink-soft">{t.row(r.sheetRow)}</span>
              </th>
              {fields.map((f) => {
                const c = r.cells[f];
                if (!c)
                  return (
                    <td key={f} className="no-cell border-t border-l border-rule">
                      <span className="sr-only">{t.notInSource}</span>
                    </td>
                  );
                return (
                  <td key={f} className="border-t border-l border-rule px-4 pb-3.5 pt-2 align-top">
                    <span className="block h-[18px] text-[12px] leading-[18px] tabular-nums text-ink-faint">{c.ref}</span>
                    {cellText(c)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="overflow-hidden rounded-xl border border-rule bg-card @3xl:hidden">
        <ul className="border-b border-rule bg-well px-3 py-2 text-[15px]">
          {rows.map((r) => (
            <li key={r.key}>
              <span className="font-semibold">{r.label}</span> <span className="text-ink-soft">{t.fileRow(r.fileName, r.sheetRow)}</span>
            </li>
          ))}
        </ul>
        <dl>
          {fields.map((f) => (
            <div key={f} className="border-b border-rule last:border-b-0">
              <dt className="bg-well/60 px-3 py-1 text-[14px] text-ink-soft">{t.field[f]}</dt>
              {rows.map((r) => {
                const c = r.cells[f];
                if (!c) return null;
                return (
                  <dd key={r.key} className="grid grid-cols-[5.25rem_minmax(0,1fr)] gap-2 border-t border-rule px-3 py-1.5">
                    <span className="pt-0.5 text-[13px] leading-tight text-ink-soft">
                      {r.short}
                      <span className="block tabular-nums text-ink-faint">{c.ref}</span>
                    </span>
                    {cellText(c)}
                  </dd>
                );
              })}
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}

export function PatientLine({ act, override }: { act: Act; override?: { patientName: string; patientId: string } }) {
  const t = useT(M);
  const name = override?.patientName ?? act.patientName;
  const id = override?.patientId ?? act.patientId;
  return (
    <p className="flex flex-wrap items-baseline gap-x-5 text-[19px] text-ink-soft">
      <span className="font-display text-[38px] font-semibold leading-[1.1] tracking-[-0.015em] text-ink sm:text-[46px]">{name || t.noName}</span>
      {id && <span className="font-mono text-[19px] tabular-nums">{id}</span>}
      {act.bed && <span className="text-[19px]">{t.bedN(act.bed)}</span>}
    </p>
  );
}

/** "no time", for a row with no time written, in the current language. */
export const useNoTime = () => useT(M).noTime;
