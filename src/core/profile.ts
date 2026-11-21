import type { CanonicalField } from './fields';

/**
 * Deterministic column profiling: what do the VALUES in a column look like, regardless of its header?
 * This is an independent signal next to Gemini Nano's reading of the header. When the two disagree,
 * Lantern asks the reviewer instead of guessing.
 */

export interface ColumnProfile {
  index: number;
  header: string;
  filled: number;
  /** share of non-empty values matching each shape (0..1) */
  shapes: {
    hospitalId: number; // H-204811, MRN123456
    nameWithId: number; // "Ana Ribeiro H-204811"
    personName: number; // "Ana Ribeiro", "R. Costa"
    clockTime: number; // 22:15, 2215
    startsWithTime: number; // "04:10 repeat temp…"
    initials: number; // KS, RN JM
    yesNo: number; // yes/no/y/n/✓
    bedNumber: number; // 7, 12A
    freeText: number; // longer phrases
    dash: number; // "-" placeholders
  };
  /** the field the value shapes alone suggest, if any shape is dominant */
  suggested: CanonicalField | null;
  samples: string[];
}

const RX = {
  hospitalId: /^(?:[A-Z]{1,4}-?\d{4,}|\d{6,})$/,
  nameWithId: /^[A-Za-zÀ-ÿ.' -]+\s+\(?(?:[A-Z]{1,4}-?\d{4,}|\d{6,})\)?$/,
  personName: /^(?:[A-Z][a-zà-ÿ']+|[A-Z]\.)(?:\s+(?:[A-Z][a-zà-ÿ']+|[A-Z]\.|de|da|do|dos|das))+$/,
  clockTime: /^(?:[01]?\d|2[0-3]):?[0-5]\d$/,
  startsWithTime: /^(?:[01]?\d|2[0-3]):[0-5]\d\b/,
  initials: /^(?:(?:RN|EN|Dr|Enf)\.?\s+)?[A-Z]{2,3}$/,
  yesNo: /^(?:yes|no|y|n|sim|não|nao|ok|x|✓|✔|done|sent)$/i,
  bedNumber: /^(?:(?:bed|cama)\s*)?\d{1,3}[A-Za-z]?$/i,
  dash: /^[-–—]+$/,
};

export function profileColumns(headers: string[], rows: string[][]): ColumnProfile[] {
  return headers.map((header, index) => {
    const values = rows.map((r) => (r[index] ?? '').trim()).filter(Boolean);
    const n = values.length || 1;
    const share = (rx: RegExp) => values.filter((v) => rx.test(v)).length / n;
    const shapes = {
      hospitalId: share(RX.hospitalId),
      nameWithId: share(RX.nameWithId),
      personName: share(RX.personName),
      clockTime: share(RX.clockTime),
      startsWithTime: share(RX.startsWithTime),
      initials: share(RX.initials),
      yesNo: share(RX.yesNo),
      bedNumber: share(RX.bedNumber),
      freeText: values.filter((v) => v.split(/\s+/).length >= 3).length / n,
      dash: share(RX.dash),
    };
    return { index, header, filled: values.length, shapes, suggested: suggest(shapes, values.length, header), samples: values.slice(0, 3) };
  });
}

/**
 * Words wards actually use for free-text columns, in English and Portuguese; a third, model-free signal
 * for act vs notes. In Portuguese forms "Observações" is the remarks column.
 */
const NOTES_HEADER = /\b(comments?|notes?|remarks?|obs(?:ervations)? ?\/? ?comments?|notas?|observa[cç](?:[aã]o|[oõ]es)|coment[aá]rios?)\b/i;
const ACT_HEADER =
  /\b(what|done|acts?|actions?|details?|descr\w*|interventions?|tasks?|drugs?|meds?|medications?|treatments?|given|care|entry|events?|procedures?|atos?|a[cç](?:[aã]o|[oõ]es)|interven[cç](?:[aã]o|[oõ]es)|registos?|procedimentos?|terap[eê]utica|medica[cç](?:[aã]o|[oõ]es)|f[aá]rmacos?|cuidados|ocorr[eê]ncias?|descri[cç][aã]o|efetuado|feito)\b/i;

function suggest(s: ColumnProfile['shapes'], filled: number, header = ''): CanonicalField | null {
  if (filled === 0) return 'ignore';
  const dominant = 0.7;
  if (s.nameWithId >= dominant) return 'patient';
  if (s.hospitalId >= dominant) return 'patient_id';
  if (s.clockTime >= dominant) return 'event_time';
  if (s.yesNo >= dominant) return 'ignore';
  if (s.initials >= dominant) return 'documented_by';
  if (s.bedNumber >= dominant) return 'bed';
  if (s.personName >= dominant) return 'patient_name';
  // free-text columns are 'act' or 'notes': value shapes cannot tell which, so the header decides
  if (s.freeText + s.dash >= 0.5 || s.startsWithTime >= 0.5) {
    if (NOTES_HEADER.test(header)) return 'notes';
    if (ACT_HEADER.test(header)) return 'act';
  }
  return null;
}

/** One-line human/LLM-readable description of a column's value shapes. */
export function describeProfile(p: ColumnProfile): string {
  const named = Object.entries(p.shapes)
    .filter(([, v]) => v >= 0.5)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${Math.round(v * 100)}%`);
  return named.length ? named.join(', ') : 'mixed values';
}
