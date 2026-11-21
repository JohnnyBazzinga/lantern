import { categoryLabel, categoryOf, clinicalPartBy, enteredBy, followUp, isHighAlert, relayedFrom, type Category } from './clinical';
import { ct, shortDate, type FieldName } from './i18n';
import { rowRef } from './reconcile';
import { nightMinutes } from './text';
import type { Act, Disposition } from './types';

/**
 * The re-entry worklist, built from final decisions. Each act appears once; corrections carry old value,
 * new value and basis; every act says who must enter it (the nurse who documented it for clinical care,
 * the clinical secretary for admissions and transfers) and carries late-entry wording with its original
 * date and time. "Ready for re-entry" is not "entered": Lantern never writes to any record system.
 */

export interface WorklistItem {
  actId: string;
  patientKey: string | null;
  patientId: string;
  patientName: string;
  bed: string;
  /** calendar date of the act (YYYY-MM-DD), from the night the outage started; '' when the time is missing */
  date: string;
  time: string;
  /** minutes since 12:00 on the night of the outage, for chronological order across midnight */
  order: number;
  act: string;
  notes: string;
  documentedBy: string;
  source: string; // "version 1 row 9 + version 2 row 4"
  corrected: { field: string; from: string; to: string; basis: string }[];
  category: Category;
  enteredBy: { role: 'clerk' | 'nurse'; who: string };
  highAlert: boolean;
  /** initials of the nurse a relayed correction is attributed to ("per KS"), who must confirm it */
  confirmBy: string | null;
  /** e.g. the nurse's answer that settled an open question */
  note?: string;
  /** an admission row that also records care: who enters the clinical part */
  clinicalPartBy: string | null;
  /** e.g. an incident report for a fall */
  followUp: string | null;
  lateEntry: string;
}

export interface WorklistQuestion {
  ref: string;
  owner: string;
  question: string;
  patientName: string;
  patientId: string;
  bed: string;
  date: string;
  time: string;
  rows: { source: string; text: string; notes: string; time: string; by: string }[];
  actIds: string[];
}

export interface Worklist {
  nightOf: string;
  ready: WorklistItem[];
  questions: WorklistQuestion[];
  excluded: { actId: string; reason: string; source: string }[];
  /** rows that still have no decision; the list is incomplete while this is non-zero */
  undecided: string[];
}

const src = (a: Act) => rowRef(a);

/** The night the outage started: by default 12 hours before the review began (a morning review is about last night). */
export function defaultNightOf(startedAt: number | string): string {
  const d = new Date(new Date(startedAt).getTime() - 12 * 3600_000);
  return isoDate(d);
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Calendar date of a clock time on a night shift that started on `nightOf` (times before noon are the next day). */
export function dateFor(nightOf: string, time: string): { date: string; order: number } {
  const m = time ? nightMinutes(time) : null;
  if (m === null) return { date: '', order: Number.MAX_SAFE_INTEGER };
  const [y, mo, d] = nightOf.split('-').map(Number);
  const day = new Date(y!, mo! - 1, d! + (m >= 12 * 60 ? 1 : 0));
  return { date: isoDate(day), order: m };
}

/** "Sun 22 Nov" / "dom., 22/11", in the interface language. */
export const formatDate = shortDate;

export function buildWorklist(acts: Act[], decisions: Map<string, Disposition | undefined>, opts: { nightOf?: string } = {}): Worklist {
  const nightOf = opts.nightOf ?? defaultNightOf(Date.now());
  const byId = new Map(acts.map((a) => [a.id, a]));
  const wl: Worklist = { nightOf, ready: [], questions: [], excluded: [], undecided: [] };
  const dupsOf = new Map<string, string[]>();
  for (const a of acts) {
    const d = decisions.get(a.id);
    if (d?.kind === 'duplicate') dupsOf.set(d.of, [...(dupsOf.get(d.of) ?? []), a.id]);
  }
  const questions = new Map<string, WorklistQuestion>();

  for (const a of acts) {
    const d = decisions.get(a.id);
    if (!d) {
      wl.undecided.push(a.id);
      continue;
    }
    if (d.kind === 'duplicate') continue;
    if (d.kind === 'excluded') {
      wl.excluded.push({ actId: a.id, reason: d.reason, source: src(a) });
      continue;
    }
    if (d.kind === 'unresolved') {
      // one question per issue: both rows of a pair share the review item's ref
      const ref = d.ref ?? `${d.owner}|${d.question}`;
      const q = questions.get(ref);
      const row = { source: src(a), text: a.actText, notes: a.notes, time: a.eventTime, by: a.documentedBy };
      if (q) {
        q.rows.push(row);
        q.actIds.push(a.id);
        if (!q.time && a.eventTime) Object.assign(q, { time: a.eventTime, date: dateFor(nightOf, a.eventTime).date });
      } else
        questions.set(ref, {
          ref,
          owner: d.owner,
          question: d.question,
          patientName: a.patientName,
          patientId: a.patientId,
          bed: a.bed,
          date: dateFor(nightOf, a.eventTime).date,
          time: a.eventTime,
          rows: [row],
          actIds: [a.id],
        });
      continue;
    }
    const corrected = d.kind === 'corrected' ? d.changes : [];
    const time = corrected.find((c) => c.field === 'time')?.to ?? a.eventTime;
    const actText = corrected.find((c) => c.field !== 'time')?.to ?? a.actText;
    const also = (dupsOf.get(a.id) ?? []).map((id) => byId.get(id)).filter((x): x is Act => !!x);
    const correctionRow = corrected.length ? also.find((x) => x.notes || x.actText) : undefined;
    const { date, order } = dateFor(nightOf, time);
    const view = { actText, notes: a.notes, documentedBy: a.documentedBy };
    const by = enteredBy(view);
    const source = [src(a), ...also.map(src)].join(' + ');
    wl.ready.push({
      actId: a.id,
      patientKey: a.patientKey,
      patientId: a.patientId,
      patientName: a.patientName,
      bed: a.bed,
      date,
      time,
      order,
      act: actText,
      notes: a.notes,
      documentedBy: a.documentedBy,
      source,
      corrected,
      category: categoryOf(view),
      enteredBy: by,
      highAlert: isHighAlert(view),
      confirmBy: correctionRow ? relayedFrom(correctionRow) : null,
      ...(d.kind === 'approved' && d.note && { note: d.note }),
      clinicalPartBy: clinicalPartBy(view),
      followUp: followUp(view),
      lateEntry: ct().lateEntry(time ? `${formatDate(date)} ${time}` : '', a.documentedBy, source, corrected.length > 0),
    });
  }
  wl.ready.sort(
    (x, y) =>
      Number(x.enteredBy.role === 'nurse') - Number(y.enteredBy.role === 'nurse') ||
      x.enteredBy.who.localeCompare(y.enteredBy.who) ||
      (x.patientKey ?? x.patientName).localeCompare(y.patientKey ?? y.patientName) ||
      x.order - y.order,
  );
  wl.questions = [...questions.values()].sort((x, y) => x.owner.localeCompare(y.owner) || x.patientName.localeCompare(y.patientName));
  return wl;
}

/** A correction's field name for people ("time" / "hora"); other values are shown as stored. */
export const fieldName = (f: string) => ct().field[f as FieldName] ?? f;

/**
 * The worklist as CSV, in the interface language. Portuguese files use the semicolon, which is what Excel
 * expects where the comma is the decimal mark; a byte-order mark makes Excel read the accents as UTF-8.
 */
export function worklistCsv(wl: Worklist, opts: { drill?: boolean } = {}): string {
  const t = ct();
  const sep = t.csv.separator;
  const esc = (s: string) => (s.includes(sep) || /["\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const head = t.csv.head;
  const status = (r: WorklistItem) => (r.confirmBy ? t.csv.readyConfirm(r.confirmBy) : t.csv.ready);
  const rows = [
    ...wl.ready.map((r) => [
      status(r),
      r.enteredBy.who,
      categoryLabel(r.category),
      r.date,
      r.time,
      r.patientId,
      r.patientName,
      r.bed,
      r.act,
      [r.notes, r.note, r.clinicalPartBy && t.csv.clinicalPart(r.clinicalPartBy), r.followUp].filter(Boolean).join(' | '),
      r.documentedBy,
      r.corrected.map((c) => `${fieldName(c.field)}: ${c.from} → ${c.to} (${c.basis})`).join('; '),
      r.lateEntry,
      r.source,
      '',
    ]),
    ...wl.questions.map((q) => [
      t.csv.question(q.owner),
      q.owner,
      '',
      q.date,
      q.time,
      q.patientId,
      q.patientName,
      q.bed,
      q.rows.map((x) => x.text).join(' / '),
      '',
      q.rows.map((x) => x.by).filter(Boolean).join(', '),
      '',
      '',
      q.rows.map((x) => x.source).join(' + '),
      q.question,
    ]),
  ];
  const lines = [head, ...rows].map((r) => r.map(esc).join(sep));
  if (opts.drill) lines.unshift(t.csv.drill);
  if (wl.undecided.length) lines.unshift(t.csv.incomplete(wl.undecided.length));
  return '\uFEFF' + lines.join('\n') + '\n';
}
