import { controlledDrugIn, drugName } from './drugs';
import { ct } from './i18n';
import type { Act } from './types';

/**
 * Plain lexicons, no model: what kind of entry a row is, who may re-enter it, and whether it involves
 * a high-alert medicine. Documentation rules (NMC, Ordem dos Enfermeiros, Joint Commission) expect the
 * clinician who gave or observed the care to document it, as a late entry with the original time. A
 * clinical secretary prepares the list and does the administrative side (admissions, transfers).
 *
 * Each lexicon reads English and European Portuguese ward shorthand. Gemini Nano does not accept
 * Portuguese, so on a Portuguese sheet these rules are what keeps a refused dose from being entered as
 * given. Patterns never end on an accented letter (JavaScript's \b only knows ASCII word characters).
 */

export type Category = 'medication' | 'observation' | 'admission-transfer' | 'communication' | 'nursing';

/** Words that make a later row a documented correction rather than a re-typing. */
const CORRECTION_NOTE = new RegExp(
  [
    // English
    String.raw`\b(?:corr(?:ected|ection)?\.?|amend(?:ed|ment)?|error|mistake|wrong(?:ly)?|not given|was not|instead of|should (?:be|read)|actually|by mistake)\b`,
    // Portuguese: corrigido, correção, por engano, NÃO administrada, em vez de, deve ler-se, afinal, anulado…
    String.raw`\b(?:corrigid[oa]s?|corre(?:c)?ção|corrijo|retificad[oa]|rectificad[oa]|erro|engano|por engano|n[aã]o (?:foi )?(?:administrad[oa]|dad[oa]|feit[oa])|em vez de|deveria ser|deve ler-se|afinal|anulad[oa])\b`,
  ].join('|'),
  'i',
);

export const hasCorrectionNote = (b: Pick<Act, 'actText' | 'notes'>) => CORRECTION_NOTE.test(`${b.actText} ${b.notes}`);

const ADT = new RegExp(
  [
    String.raw`\b(?:admit(?:ted)?|admission|from (?:ED|A&E|theatre)|transferr?(?:ed)?|moved? to (?:bed|ward|side room)|bed move|discharg(?:ed|e))\b`,
    String.raw`\b(?:admitid[oa]|admiss[aã]o|vind[oa] d[oa] (?:urg[eê]ncia|SU|bloco|UCI)|transferid[oa]|transfer[eê]ncia|mud(?:ou|a|an[cç]a) (?:de|para (?:a )?)cama|mudou para (?:a |o )?(?:enfermaria|quarto|servi[cç]o)|teve alta|alta cl[ií]nica|alta para)\b`,
  ].join('|'),
  'i',
);
const MEDICATION =
  /\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|micrograms?|g|ml|mL|L|units?|IU|UI|unidades|mmol|gotas)\b|\b(?:IV|EV|PO|SC|IM|PR|NG|SL|neb(?:uliser)?s?|infusion|bolus|given|withheld)\b/;
const MEDICATION_PT = /\b(?:per os|via oral|subcut[aâ]ne[oa]|endoven[oa]s[oa]|perfus[aã]o|b[oó]lus|administrad[oa]|suspens[oa]|nebuliza[cç][aã]o|aerossol)\b/i;
const OBSERVATION =
  /\b(?:BP|HR|RR|SpO2|sats|temp(?:erature)?|NEWS2?|GCS|BM|glucose|pain \d+\/10|urine output|obs|neuro obs|temperatura|glicemia|satura[cç][aã]o|escala de coma|dor \d+\/10|diurese|sinais vitais|avalia[cç][aã]o neurol[oó]gica|vigil[aâ]ncia neurol[oó]gica)\b/i;
/** Portuguese vital-sign abbreviations, upper case only ("TA 128/80", "FC 92", "FR 18", "SSVV"). */
const OBSERVATION_PT = /\b(?:TA|FC|FR|SSVV|SatO2)\b/;
const COMMUNICATION = /\b(?:phoned?|called|rang|family|relatives?|informed|spoke (?:to|with)|NOK|telefonou|contactad[oa]|ligou|fam[ií]lia|familiares|informad[oa]|falou com)\b/i;

const isMedication = (s: string) => MEDICATION.test(s) || MEDICATION_PT.test(s);
const isObservation = (s: string) => OBSERVATION.test(s) || OBSERVATION_PT.test(s);

export function categoryOf(a: Pick<Act, 'actText' | 'notes'>): Category {
  const t = `${a.actText} ${a.notes}`;
  if (ADT.test(t)) return 'admission-transfer';
  if (isMedication(a.actText)) return 'medication';
  if (isObservation(a.actText)) return 'observation';
  if (COMMUNICATION.test(a.actText)) return 'communication';
  return 'nursing';
}

export const categoryLabel = (c: Category) => ct().category[c];

/** Who re-enters it: the clerk does admissions and transfers; everything clinical is entered by the nurse who documented it. */
export function enteredBy(a: Pick<Act, 'actText' | 'notes' | 'documentedBy'>): { role: 'clerk' | 'nurse'; who: string } {
  const t = ct();
  if (categoryOf(a) === 'admission-transfer') return { role: 'clerk', who: t.clerk };
  return { role: 'nurse', who: a.documentedBy ? t.nurse(a.documentedBy) : t.nurseInCharge };
}

/** ISMP-style high-alert medicines that appear on wards (opioids, anticoagulants, insulin, concentrated potassium…), in English and Portuguese. */
const HIGH_ALERT = new RegExp(
  [
    String.raw`\b(?:morphine|oxycodone|fentanyl|diamorphine|hydromorphone|tramadol|methadone|enoxaparin|dalteparin|tinzaparin|heparin|warfarin|apixaban|rivaroxaban|insulin|novorapid|actrapid|lantus|humulin|potassium chloride|KCl|digoxin|midazolam)\b`,
    String.raw`\b(?:morfina|oxicodona|fentanil|diamorfina|hidromorfona|metadona|petidina|enoxaparina|dalteparina|tinzaparina|heparina|varfarina|apixabano|rivaroxabano|edoxabano|dabigatrano|insulina|cloreto de pot[aá]ssio|digoxina)\b`,
  ].join('|'),
  'i',
);

export const isHighAlert = (a: Pick<Act, 'actText' | 'notes'>) => HIGH_ALERT.test(`${a.actText} ${a.notes}`);

/** "per KS", "as told by KS", "segundo enf. KS", "por indicação de KS". The keyword is matched in any case, the initials only in capitals. */
const RELAYED =
  /\b(?:per|as per|told by|according to|on behalf of|confirmed by|segundo|conforme|por indica[cç][aã]o d[aeo]|confirmado por|a pedido d[aeo])\s+(?:(?:enf|enfa|enf\.ª|RN)\.?\s*)?([A-Za-z]{2,3})\b/gi;

/**
 * A correction written by one nurse on someone else's word: the person it is attributed to must
 * confirm it, because it changes their record.
 */
export function relayedFrom(b: Pick<Act, 'notes' | 'actText' | 'documentedBy'>): string | null {
  for (const m of `${b.actText} ${b.notes}`.matchAll(RELAYED)) {
    const who = m[1]!;
    // "per os" (by mouth) is not a person: initials are written in capitals
    if (/^[A-Z]{2,3}$/.test(who) && who !== b.documentedBy) return who;
  }
  return null;
}

/** Who a question goes to: the nurse whose initials are on the row, else the nurse in charge. */
export const ownerOf = (a: Pick<Act, 'documentedBy'>) => a.documentedBy || ct().nurseInCharge;

/** An admission or transfer row that also records clinical care (e.g. "Admitted from ED - obs BP 128/80"): the nurse enters that part. */
export function clinicalPartBy(a: Pick<Act, 'actText' | 'notes' | 'documentedBy'>): string | null {
  if (categoryOf(a) !== 'admission-transfer') return null;
  const rest = a.actText.replace(new RegExp(ADT.source, 'gi'), '');
  const t = ct();
  return isMedication(rest) || isObservation(rest) ? (a.documentedBy ? t.nurse(a.documentedBy) : t.nurseInCharge) : null;
}

const FALL = /\b(?:fall|fell|found on (?:the )?floor|slipped|queda|caiu|encontrad[oa] no ch[aã]o|escorregou)\b/i;

/** Follow-ups a re-entry list should not forget: an incident report for a fall, the register for a controlled drug. */
export function followUp(a: Pick<Act, 'actText' | 'notes'>): string | null {
  const t = ct();
  const cd = controlledDrugIn(a);
  const out = [FALL.test(`${a.actText} ${a.notes}`) && t.fallFollowUp, cd && t.controlledFollowUp(drugName(cd))].filter(Boolean);
  return out.length ? out.join(' ') : null;
}
