import type { Act } from './types';

/**
 * Plain lexicons, no model: what kind of entry a row is, who may re-enter it, and whether it involves
 * a high-alert medicine. Documentation rules (NMC, Ordem dos Enfermeiros, Joint Commission) expect the
 * clinician who gave or observed the care to document it, as a late entry with the original time. A
 * clinical secretary prepares the list and does the administrative side (admissions, transfers).
 */

export type Category = 'medication' | 'observation' | 'admission-transfer' | 'communication' | 'nursing';

const ADT = /\b(?:admit(?:ted)?|admission|from (?:ED|A&E|theatre)|transferr?(?:ed)?|moved? to (?:bed|ward|side room)|bed move|discharg(?:ed|e))\b/i;
const MEDICATION =
  /\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|micrograms?|g|ml|mL|L|units?|IU|mmol)\b|\b(?:IV|PO|SC|IM|PR|NG|neb(?:uliser)?s?|infusion|bolus|given|withheld)\b/;
const OBSERVATION = /\b(?:BP|HR|RR|SpO2|sats|temp(?:erature)?|NEWS2?|GCS|BM|glucose|pain \d+\/10|urine output|obs|neuro obs)\b/i;
const COMMUNICATION = /\b(?:phoned?|called|rang|family|relatives?|informed|spoke (?:to|with)|NOK)\b/i;

export function categoryOf(a: Pick<Act, 'actText' | 'notes'>): Category {
  const t = `${a.actText} ${a.notes}`;
  if (ADT.test(t)) return 'admission-transfer';
  if (MEDICATION.test(a.actText)) return 'medication';
  if (OBSERVATION.test(a.actText)) return 'observation';
  if (COMMUNICATION.test(a.actText)) return 'communication';
  return 'nursing';
}

export const CATEGORY_LABEL: Record<Category, string> = {
  medication: 'Medication',
  observation: 'Observation',
  'admission-transfer': 'Admission or transfer',
  communication: 'Communication',
  nursing: 'Nursing care',
};

/** Who re-enters it: the clerk does admissions and transfers; everything clinical is entered by the nurse who documented it. */
export function enteredBy(a: Pick<Act, 'actText' | 'notes' | 'documentedBy'>): { role: 'clerk' | 'nurse'; who: string } {
  if (categoryOf(a) === 'admission-transfer') return { role: 'clerk', who: 'clinical secretary' };
  return { role: 'nurse', who: a.documentedBy ? `nurse ${a.documentedBy}` : 'nurse in charge' };
}

/** ISMP-style high-alert medicines that appear on wards (opioids, anticoagulants, insulin, concentrated potassium…). */
const HIGH_ALERT =
  /\b(?:morphine|oxycodone|fentanyl|diamorphine|hydromorphone|tramadol|methadone|enoxaparin|dalteparin|tinzaparin|heparin|warfarin|apixaban|rivaroxaban|insulin|novorapid|actrapid|lantus|humulin|potassium chloride|KCl|digoxin|midazolam)\b/i;

export const isHighAlert = (a: Pick<Act, 'actText' | 'notes'>) => HIGH_ALERT.test(`${a.actText} ${a.notes}`);

/**
 * A correction written by one nurse on someone else's word ("per KS", "as told by KS"): the person it
 * is attributed to must confirm it, because it changes their record.
 */
export function relayedFrom(b: Pick<Act, 'notes' | 'actText' | 'documentedBy'>): string | null {
  const m = `${b.actText} ${b.notes}`.match(/\b(?:per|as per|told by|according to|on behalf of|confirmed by)\s+([A-Z]{2,3})\b/);
  if (!m) return null;
  return m[1] !== b.documentedBy ? m[1]! : null;
}

/** Who a question goes to: the nurse whose initials are on the row, else the nurse in charge. */
export const ownerOf = (a: Pick<Act, 'documentedBy'>) => a.documentedBy || 'nurse in charge';

/** An admission or transfer row that also records clinical care (e.g. "Admitted from ED - obs BP 128/80"): the nurse enters that part. */
export function clinicalPartBy(a: Pick<Act, 'actText' | 'notes' | 'documentedBy'>): string | null {
  if (categoryOf(a) !== 'admission-transfer') return null;
  const rest = a.actText.replace(ADT, '');
  return MEDICATION.test(rest) || OBSERVATION.test(rest) ? (a.documentedBy ? `nurse ${a.documentedBy}` : 'the nurse in charge') : null;
}

/** Follow-ups a re-entry list should not forget. */
export function followUp(a: Pick<Act, 'actText' | 'notes'>): string | null {
  if (/\b(?:fall|fell|found on (?:the )?floor|slipped)\b/i.test(`${a.actText} ${a.notes}`)) return 'A fall: an incident report is needed too.';
  return null;
}
