import { CANONICAL_FIELDS, FIELD_DESCRIPTIONS, type CanonicalField } from '../../../core/fields';
import { describeProfile, type ColumnProfile } from '../../../core/profile';
import type { PromptTask } from '../../models';

/**
 * Per-column mapping: one small decision per call, with every header as context and the
 * deterministic value-shape profile as a hint. Small on-device models are far more reliable
 * on one focused decision than on a whole table at once.
 */
export interface SingleColumnMapping {
  field: CanonicalField;
  confidence: 'high' | 'medium' | 'low';
}

const fieldList = CANONICAL_FIELDS.map((f) => `- ${f}: ${FIELD_DESCRIPTIONS[f]}`).join('\n');

export const mapColumnTask: PromptTask<SingleColumnMapping> = {
  id: 'map-column',
  version: 'v1',
  system: `You help a hospital ward clerk read a spreadsheet that nurses improvised during an IT outage.
You classify ONE column into exactly one field:
${fieldList}
How to decide:
- Read the header, the sample values and the value shapes measured by the app.
- "patient" only when one cell holds a name AND an identifier; a name alone is "patient_name".
- A column of staff initials (e.g. "KS", "RN JM") is "documented_by", whatever the header says.
- A column of yes/no flags is "ignore".
- Free-text columns: the main description of what was done is "act"; secondary comments are "notes".
Answer only with JSON that follows the schema.`,
  schema: {
    type: 'object',
    properties: {
      field: { type: 'string', enum: [...CANONICAL_FIELDS] },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    },
    required: ['field', 'confidence'],
  },
  parse(json) {
    const o = json as Record<string, unknown>;
    if (!CANONICAL_FIELDS.includes(o.field as CanonicalField)) throw new Error(`unknown field ${String(o.field)}`);
    const confidence = o.confidence === 'high' || o.confidence === 'medium' ? o.confidence : 'low';
    return { field: o.field as CanonicalField, confidence };
  },
};

export function mapColumnInput(headers: string[], p: ColumnProfile): string {
  const all = headers.map((h, i) => `${i}: ${JSON.stringify(h)}`).join(', ');
  const samples = p.samples.map((v) => JSON.stringify(v.length > 60 ? `${v.slice(0, 60)}…` : v)).join(' | ');
  return `All columns: ${all}
Column to classify: ${p.index} ${JSON.stringify(p.header)}
Sample values: ${samples || '(empty)'}
Value shapes: ${describeProfile(p)}`;
}
