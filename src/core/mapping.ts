import type { CanonicalField } from './fields';
import type { ColumnProfile } from './profile';

/**
 * Reconciles two independent opinions about each column: Gemini Nano (header + samples) and the
 * deterministic value-shape profile. Agreement is accepted; disagreement is resolved by explicit
 * rules and ALWAYS flagged for the reviewer. The model never has the last word on its own.
 */

export interface ModelOpinion {
  index: number;
  field: CanonicalField;
  confidence: 'high' | 'medium' | 'low';
}

export interface FinalColumn {
  index: number;
  header: string;
  field: CanonicalField;
  basis: 'agree' | 'model' | 'shape' | 'rule' | 'default';
  needsReview: boolean;
  model: CanonicalField | null;
  shape: CanonicalField | null;
  reason?: string;
}

/** Fields that can only belong to one column (act and notes may legitimately span several). */
const UNIQUE: CanonicalField[] = ['bed', 'patient_name', 'patient_id', 'patient', 'event_time', 'documented_by'];

/** Shapes so unambiguous that they override the model's reading of the header. */
const STRONG = 0.9;

export function reconcileMapping(profiles: ColumnProfile[], opinions: ModelOpinion[]): FinalColumn[] {
  const cols: FinalColumn[] = profiles.map((p) => {
    const op = opinions.find((o) => o.index === p.index) ?? null;
    const model = op?.field ?? null;
    const shape = p.suggested;
    const base = { index: p.index, header: p.header, model, shape };

    if (!model) {
      return { ...base, field: shape ?? 'ignore', basis: shape ? 'shape' : 'default', needsReview: true, reason: 'no model answer' };
    }
    // a name-only column misread as "patient" (name + identifier)
    if (model === 'patient' && p.shapes.nameWithId < 0.5 && p.shapes.personName >= 0.7) {
      return { ...base, field: 'patient_name', basis: 'rule', needsReview: false, reason: 'values are names without identifiers' };
    }
    if (!shape || shape === model) {
      return { ...base, field: model, basis: shape ? 'agree' : 'model', needsReview: op!.confidence === 'low' };
    }
    const strongest = Math.max(...Object.values(p.shapes));
    if (strongest >= STRONG) {
      return { ...base, field: shape, basis: 'shape', needsReview: true, reason: `values look like ${shape}, header read as ${model}` };
    }
    return { ...base, field: model, basis: 'model', needsReview: true, reason: `header read as ${model}, values suggest ${shape}` };
  });

  // uniqueness: keep the best-supported column for each unique field, flag the rest
  const rank = (c: FinalColumn) => (c.basis === 'agree' ? 3 : c.basis === 'rule' ? 2 : c.needsReview ? 0 : 1);
  for (const f of UNIQUE) {
    const holders = cols.filter((c) => c.field === f);
    if (holders.length < 2) continue;
    const [keep, ...rest] = [...holders].sort((a, b) => rank(b) - rank(a));
    for (const c of rest) {
      const alt = c.shape && c.shape !== f && !cols.some((o) => o !== c && o.field === c.shape) ? c.shape : f === 'event_time' || f === 'bed' ? 'notes' : 'ignore';
      Object.assign(c, { field: alt, basis: 'rule', needsReview: true, reason: `"${f}" already taken by column ${keep!.index}` });
    }
  }
  return cols;
}
