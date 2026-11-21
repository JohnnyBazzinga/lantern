import type { CanonicalField } from './fields';
import { ct } from './i18n';
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
  /** the reason as data, so it can be shown again in another language */
  why?: Why;
}

export type Why =
  | { k: 'values' }
  | { k: 'no-model' }
  | { k: 'names-only' }
  | { k: 'values-win'; shape: CanonicalField; model: CanonicalField }
  | { k: 'header-wins'; model: CanonicalField; shape: CanonicalField }
  | { k: 'taken'; field: CanonicalField; col: number }
  | { k: 'reviewer' };

/** The reason for a column reading, in the current interface language. */
export function columnReason(c: Pick<FinalColumn, 'why' | 'reason'>): string | undefined {
  if (!c.why) return c.reason;
  const t = ct();
  const F = (f: CanonicalField) => t.fieldLabel[f];
  const w = c.why;
  switch (w.k) {
    case 'values':
      return t.mapping.fromValues;
    case 'no-model':
      return t.mapping.noModel;
    case 'names-only':
      return t.mapping.namesOnly;
    case 'values-win':
      return t.mapping.valuesWin(F(w.shape), F(w.model));
    case 'header-wins':
      return t.mapping.headerWins(F(w.model), F(w.shape));
    case 'taken':
      return t.mapping.taken(F(w.field), w.col);
    case 'reviewer':
      return t.mapping.byReviewer;
  }
}

const said = (why: Why) => ({ why, reason: columnReason({ why }) });

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
      // no model: trust a clear value/header signal, ask the reviewer about the rest
      return shape
        ? { ...base, field: shape, basis: 'shape', needsReview: false, ...said({ k: 'values' }) }
        : { ...base, field: 'ignore', basis: 'default', needsReview: true, ...said({ k: 'no-model' }) };
    }
    // a name-only column misread as "patient" (name + identifier)
    if (model === 'patient' && p.shapes.nameWithId < 0.5 && p.shapes.personName >= 0.7) {
      return { ...base, field: 'patient_name', basis: 'rule', needsReview: false, ...said({ k: 'names-only' }) };
    }
    if (!shape || shape === model) {
      return { ...base, field: model, basis: shape ? 'agree' : 'model', needsReview: op!.confidence === 'low' };
    }
    const strongest = Math.max(...Object.values(p.shapes));
    if (strongest >= STRONG) {
      return { ...base, field: shape, basis: 'shape', needsReview: true, ...said({ k: 'values-win', shape, model }) };
    }
    return { ...base, field: model, basis: 'model', needsReview: true, ...said({ k: 'header-wins', model, shape }) };
  });

  // uniqueness: keep the best-supported column for each unique field, flag the rest
  const rank = (c: FinalColumn) => (c.basis === 'agree' ? 3 : c.basis === 'rule' ? 2 : c.needsReview ? 0 : 1);
  for (const f of UNIQUE) {
    const holders = cols.filter((c) => c.field === f);
    if (holders.length < 2) continue;
    const [keep, ...rest] = [...holders].sort((a, b) => rank(b) - rank(a));
    for (const c of rest) {
      const alt = c.shape && c.shape !== f && !cols.some((o) => o !== c && o.field === c.shape) ? c.shape : f === 'event_time' || f === 'bed' ? 'notes' : 'ignore';
      Object.assign(c, { field: alt, basis: 'rule', needsReview: true, ...said({ k: 'taken', field: f, col: keep!.index + 1 }) });
    }
  }
  return cols;
}
