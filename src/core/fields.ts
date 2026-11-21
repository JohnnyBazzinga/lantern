/**
 * The canonical fields every improvised downtime sheet is mapped onto.
 * Real wards invent their own columns during an outage; Lantern maps them, it does not demand a template.
 */
export const CANONICAL_FIELDS = [
  'bed',
  'patient_name',
  'patient_id',
  'patient', // name and identifier written together in one cell
  'event_time',
  'act',
  'notes',
  'documented_by',
  'ignore',
] as const;

export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

export const FIELD_DESCRIPTIONS: Record<CanonicalField, string> = {
  bed: 'bed, room or location of the patient',
  patient_name: "the patient's name only",
  patient_id: "the patient's hospital number / identifier only",
  patient: 'name and identifier written together in the same cell',
  event_time: 'when the act happened (clock time)',
  act: 'what was done: medication given, observation, procedure, event',
  notes: 'extra free-text comments about the act',
  documented_by: 'who recorded it: initials or staff name',
  ignore: 'not clinical content (row numbers, "sent?" flags, empty columns)',
};

/** Kinds of clinical act Lantern recognises when extracting from free text. */
export const ACT_TYPES = [
  'medication',
  'observation',
  'fluids',
  'procedure',
  'specimen',
  'incident',
  'transfer',
  'communication',
  'care',
  'other',
] as const;

export type ActType = (typeof ACT_TYPES)[number];
