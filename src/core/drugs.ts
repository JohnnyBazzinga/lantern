import { getLang } from '../i18n/lang';
import type { Act, Disposition } from './types';

/**
 * Which medicine a row is about, so a reviewer can see every dose of that medicine for the same
 * patient side by side (a timeless re-typed copy next to the dose it copies, a dose missing from the
 * later file). Plain lexicon, English and European Portuguese; no model, no dose interpretation.
 *
 * `controlled` marks opioids kept in a ward controlled-drug register (UK Schedule 2, Portuguese
 * "estupefacientes"): before such a dose is entered from a downtime sheet, it should be checked
 * against that register. Patterns never end on an accented letter (JavaScript's \b is ASCII-only).
 */
interface Drug {
  key: string;
  en: string;
  pt: string;
  rx: RegExp;
  controlled?: true;
}

const d = (key: string, en: string, pt: string, words: string, controlled?: true): Drug => ({
  key,
  en,
  pt,
  rx: new RegExp(String.raw`\b(?:${words})\b`, 'i'),
  ...(controlled ? { controlled } : {}),
});

const DRUGS: Drug[] = [
  // controlled opioids
  d('morphine', 'morphine', 'morfina', 'morphine|morfina|oramorph|sevredol', true),
  d('diamorphine', 'diamorphine', 'diamorfina', 'diamorphine|diamorfina', true),
  d('oxycodone', 'oxycodone', 'oxicodona', 'oxycodone|oxicodona|oxynorm|oxycontin', true),
  d('fentanyl', 'fentanyl', 'fentanil', 'fentanyl|fentanil', true),
  d('alfentanil', 'alfentanil', 'alfentanil', 'alfentanil', true),
  d('remifentanil', 'remifentanil', 'remifentanil', 'remifentanil', true),
  d('hydromorphone', 'hydromorphone', 'hidromorfona', 'hydromorphone|hidromorfona', true),
  d('methadone', 'methadone', 'metadona', 'methadone|metadona', true),
  d('pethidine', 'pethidine', 'petidina', 'pethidine|meperidine|petidina', true),
  d('tapentadol', 'tapentadol', 'tapentadol', 'tapentadol', true),
  // other ward medicines
  d('tramadol', 'tramadol', 'tramadol', 'tramadol'),
  d('codeine', 'codeine', 'codeína', 'codeine|code[ií]na'),
  d('paracetamol', 'paracetamol', 'paracetamol', 'paracetamol|acetaminophen'),
  d('ibuprofen', 'ibuprofen', 'ibuprofeno', 'ibuprofen|ibuprofeno'),
  d('metamizole', 'metamizole', 'metamizol', 'metamizole|metamizol|dipyrone'),
  d('enoxaparin', 'enoxaparin', 'enoxaparina', 'enoxaparin|enoxaparina|clexane|lovenox'),
  d('dalteparin', 'dalteparin', 'dalteparina', 'dalteparin|dalteparina|fragmin'),
  d('tinzaparin', 'tinzaparin', 'tinzaparina', 'tinzaparin|tinzaparina'),
  d('heparin', 'heparin', 'heparina', 'heparin|heparina'),
  d('warfarin', 'warfarin', 'varfarina', 'warfarin|varfarina'),
  d('apixaban', 'apixaban', 'apixabano', 'apixaban|apixabano'),
  d('rivaroxaban', 'rivaroxaban', 'rivaroxabano', 'rivaroxaban|rivaroxabano'),
  d('edoxaban', 'edoxaban', 'edoxabano', 'edoxaban|edoxabano'),
  d('dabigatran', 'dabigatran', 'dabigatrano', 'dabigatran|dabigatrano'),
  d('insulin', 'insulin', 'insulina', 'insulin|insulina|novorapid|actrapid|humalog|humulin|lantus|levemir|toujeo|abasaglar|apidra|fiasp'),
  d('furosemide', 'furosemide', 'furosemida', 'furosemide|frusemide|furosemida'),
  d('metoclopramide', 'metoclopramide', 'metoclopramida', 'metoclopramide|metoclopramida'),
  d('ondansetron', 'ondansetron', 'ondansetrom', 'ondansetron|ondansetrom'),
  d('potassium', 'potassium chloride', 'cloreto de potássio', 'potassium chloride|KCl|cloreto de pot[aá]ssio'),
  d('magnesium', 'magnesium sulfate', 'sulfato de magnésio', 'magnesium(?: sulph?ate)?|sulfato de magn[eé]sio'),
  d('saline', 'sodium chloride', 'cloreto de sódio', 'sodium chloride|NaCl|normal saline|soro fisiol[oó]gico|cloreto de s[oó]dio'),
  d('amoxicillin', 'amoxicillin', 'amoxicilina', 'amoxicillin|amoxicilina|co-amoxiclav|augmentin'),
  d('piperacillin', 'piperacillin/tazobactam', 'piperacilina/tazobactam', 'piperacillin|piperacilina|tazocin'),
  d('ceftriaxone', 'ceftriaxone', 'ceftriaxona', 'ceftriaxone|ceftriaxona'),
  d('vancomycin', 'vancomycin', 'vancomicina', 'vancomycin|vancomicina'),
  d('gentamicin', 'gentamicin', 'gentamicina', 'gentamicin|gentamicina'),
  d('metronidazole', 'metronidazole', 'metronidazol', 'metronidazole|metronidazol'),
  d('salbutamol', 'salbutamol', 'salbutamol', 'salbutamol|albuterol|ventolin'),
  d('ipratropium', 'ipratropium', 'ipratrópio', 'ipratropium|ipratr[oó]pio|atrovent'),
  d('lorazepam', 'lorazepam', 'lorazepam', 'lorazepam'),
  d('diazepam', 'diazepam', 'diazepam', 'diazepam'),
  d('midazolam', 'midazolam', 'midazolam', 'midazolam'),
  d('haloperidol', 'haloperidol', 'haloperidol', 'haloperidol'),
  d('omeprazole', 'omeprazole', 'omeprazol', 'omeprazole|omeprazol'),
  d('pantoprazole', 'pantoprazole', 'pantoprazol', 'pantoprazole|pantoprazol'),
  d('prednisolone', 'prednisolone', 'prednisolona', 'prednisolone|prednisolona'),
  d('hydrocortisone', 'hydrocortisone', 'hidrocortisona', 'hydrocortisone|hidrocortisona'),
  d('dexamethasone', 'dexamethasone', 'dexametasona', 'dexamethasone|dexametasona'),
  d('digoxin', 'digoxin', 'digoxina', 'digoxin|digoxina'),
  d('amiodarone', 'amiodarone', 'amiodarona', 'amiodarone|amiodarona'),
  d('naloxone', 'naloxone', 'naloxona', 'naloxone|naloxona'),
  d('adrenaline', 'adrenaline', 'adrenalina', 'adrenaline|epinephrine|adrenalina'),
];

/**
 * Error-prone abbreviations that may stand for one of these medicines. Lantern never decides which:
 * a row written this way is shown next to each medicine it may be, marked as uncertain.
 */
const MAYBE: { rx: RegExp; keys: string[] }[] = [
  { rx: /\bMS\b/, keys: ['morphine', 'magnesium'] },
  { rx: /\bMSO4\b/i, keys: ['morphine', 'magnesium'] },
  { rx: /\bMgSO4\b/, keys: ['magnesium', 'morphine'] },
];

const byKey = new Map(DRUGS.map((x) => [x.key, x]));
const text = (a: Pick<Act, 'actText' | 'notes'>) => `${a.actText} ${a.notes}`;

/** Medicines named in a row, as lexicon keys. */
export function drugsIn(a: Pick<Act, 'actText' | 'notes'>): string[] {
  const t = text(a);
  return DRUGS.filter((x) => x.rx.test(t)).map((x) => x.key);
}

/** Medicines a row may refer to through an error-prone abbreviation (never interpreted). */
export function maybeDrugsIn(a: Pick<Act, 'actText' | 'notes'>): string[] {
  const t = text(a);
  const named = new Set(drugsIn(a));
  return [...new Set(MAYBE.filter((m) => m.rx.test(t)).flatMap((m) => m.keys))].filter((k) => !named.has(k));
}

export const drugName = (key: string) => byKey.get(key)?.[getLang()] ?? key;
export const isControlled = (key: string) => !!byKey.get(key)?.controlled;

/** The first controlled medicine named in a row, if any. */
export function controlledDrugIn(a: Pick<Act, 'actText' | 'notes'>): string | null {
  return drugsIn(a).find(isControlled) ?? null;
}

export interface DoseRow {
  act: Act;
  /** false: the row only may be this medicine (error-prone abbreviation) */
  sure: boolean;
}

export interface SameDrug {
  key: string;
  controlled: boolean;
  rows: DoseRow[];
}

/**
 * For each medicine in the focus rows: every row in the files for the same patient (resolved
 * identity) that names it or may name it, earliest first, rows with no time last.
 */
export function sameDrugRows(acts: Act[], focus: Act[]): SameDrug[] {
  const patient = focus.find((a) => a.patientKey)?.patientKey;
  if (!patient) return [];
  const keys = [...new Set(focus.flatMap(drugsIn))];
  const mine = acts.filter((a) => a.patientKey === patient);
  const order = (x: DoseRow, y: DoseRow) =>
    (x.act.timeMinutes ?? Infinity) - (y.act.timeMinutes ?? Infinity) || x.act.fileId.localeCompare(y.act.fileId) || x.act.row - y.act.row;
  return keys.map((key) => ({
    key,
    controlled: isControlled(key),
    rows: mine
      .flatMap((a): DoseRow[] => (drugsIn(a).includes(key) ? [{ act: a, sure: true }] : maybeDrugsIn(a).includes(key) ? [{ act: a, sure: false }] : []))
      .sort(order),
  }));
}

export type DoseStatus = 'listed' | 'copy' | 'waiting' | 'left-out' | 'open';

/** Where a row stands now, in the reviewer's decisions. */
export function doseStatus(d: Disposition | undefined): DoseStatus {
  if (!d) return 'open';
  if (d.kind === 'approved' || d.kind === 'corrected') return 'listed';
  if (d.kind === 'duplicate') return 'copy';
  if (d.kind === 'unresolved') return 'waiting';
  return 'left-out';
}
