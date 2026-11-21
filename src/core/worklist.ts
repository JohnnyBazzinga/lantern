import type { Act, Disposition } from './types';

export interface WorklistItem {
  actId: string;
  patientKey: string | null;
  patientName: string;
  bed: string;
  time: string;
  act: string;
  notes: string;
  documentedBy: string;
  source: string; // "v1 row 9" (+ "v2 row 4")
  corrected: { field: string; from: string; to: string; basis: string }[];
}

export interface Worklist {
  ready: WorklistItem[];
  unresolved: { actId: string; owner: string; question: string; source: string; act: string }[];
  excluded: { actId: string; reason: string; source: string }[];
  /** rows that still have no decision; the worklist cannot be exported while this is non-zero */
  undecided: string[];
}

const src = (a: Act) => `${a.versionLabel} row ${a.row + 2}`;

/**
 * Builds the re-entry worklist from final decisions. Each act appears once; duplicates point to the
 * row they repeat; corrections carry old value, new value and basis. "Ready for re-entry" is not
 * "entered in the EHR": Lantern never writes to any record system.
 */
export function buildWorklist(acts: Act[], decisions: Map<string, Disposition | undefined>): Worklist {
  const byId = new Map(acts.map((a) => [a.id, a]));
  const wl: Worklist = { ready: [], unresolved: [], excluded: [], undecided: [] };
  const dupsOf = new Map<string, string[]>();
  for (const a of acts) {
    const d = decisions.get(a.id);
    if (d?.kind === 'duplicate') dupsOf.set(d.of, [...(dupsOf.get(d.of) ?? []), a.id]);
  }
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
      wl.unresolved.push({ actId: a.id, owner: d.owner, question: d.question, source: src(a), act: a.actText });
      continue;
    }
    const corrected = d.kind === 'corrected' ? d.changes : [];
    const time = corrected.find((c) => c.field === 'time')?.to ?? a.eventTime;
    const actText = corrected.find((c) => c.field !== 'time')?.to ?? a.actText;
    const also = (dupsOf.get(a.id) ?? []).map((id) => byId.get(id)).filter((x): x is Act => !!x);
    wl.ready.push({
      actId: a.id,
      patientKey: a.patientKey,
      patientName: a.patientName,
      bed: a.bed,
      time,
      act: actText,
      notes: a.notes,
      documentedBy: a.documentedBy,
      source: [src(a), ...also.map(src)].join(' + '),
      corrected,
    });
  }
  wl.ready.sort((x, y) => (x.patientKey ?? '').localeCompare(y.patientKey ?? '') || x.time.localeCompare(y.time));
  return wl;
}

export function worklistCsv(wl: Worklist): string {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const head = ['Status', 'Hospital number', 'Patient', 'Bed', 'Time', 'Act', 'Notes', 'Documented by', 'Correction', 'Source rows', 'Owner / question'];
  const rows = [
    ...wl.ready.map((r) => [
      'Ready for re-entry',
      r.patientKey ?? '',
      r.patientName,
      r.bed,
      r.time,
      r.act,
      r.notes,
      r.documentedBy,
      r.corrected.map((c) => `${c.field}: ${c.from} → ${c.to} (${c.basis})`).join('; '),
      r.source,
      '',
    ]),
    ...wl.unresolved.map((u) => ['Open question', '', '', '', '', u.act, '', '', '', u.source, `${u.owner}: ${u.question}`]),
  ];
  return [head, ...rows].map((r) => r.map(esc).join(',')).join('\n') + '\n';
}
