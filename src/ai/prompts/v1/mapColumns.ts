import { CANONICAL_FIELDS, FIELD_DESCRIPTIONS, type CanonicalField } from '../../../core/fields';
import type { PromptTask } from '../../models';

export interface ColumnMapping {
  index: number;
  field: CanonicalField;
  confidence: 'high' | 'medium' | 'low';
}

const fieldList = CANONICAL_FIELDS.map((f) => `- ${f}: ${FIELD_DESCRIPTIONS[f]}`).join('\n');

export const mapColumnsTask: PromptTask<ColumnMapping[]> = {
  id: 'map-columns',
  version: 'v1',
  system: `You help a hospital ward clerk read a spreadsheet that nurses improvised during an IT outage.
Each column must be mapped to exactly one of these fields:
${fieldList}
Rules:
- Decide from the header text AND the sample values.
- Use "patient" only when a single cell holds both a name and an identifier.
- Use "ignore" for columns with no clinical content.
- Every column index appears exactly once in the answer.
- Use "low" confidence when unsure; never guess silently.
Answer only with JSON that follows the schema.`,
  schema: {
    type: 'object',
    properties: {
      columns: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            index: { type: 'integer' },
            field: { type: 'string', enum: [...CANONICAL_FIELDS] },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
          required: ['index', 'field', 'confidence'],
        },
      },
    },
    required: ['columns'],
  },
  parse(json) {
    const cols = (json as { columns?: unknown }).columns;
    if (!Array.isArray(cols)) throw new Error('missing "columns" array');
    return cols.map((c, i) => {
      const o = c as Record<string, unknown>;
      if (typeof o.index !== 'number') throw new Error(`column ${i}: index is not a number`);
      if (!CANONICAL_FIELDS.includes(o.field as CanonicalField)) throw new Error(`column ${i}: unknown field ${String(o.field)}`);
      const confidence = o.confidence === 'high' || o.confidence === 'medium' ? o.confidence : 'low';
      return { index: o.index, field: o.field as CanonicalField, confidence };
    });
  },
};

/** Builds the user prompt: headers plus up to three sample values per column. Never the whole sheet. */
export function mapColumnsInput(headers: string[], sampleRows: string[][]): string {
  const lines = headers.map((h, i) => {
    const samples = sampleRows
      .slice(0, 3)
      .map((r) => (r[i] ?? '').trim())
      .filter(Boolean)
      .map((v) => JSON.stringify(v.length > 60 ? `${v.slice(0, 60)}…` : v));
    return `${i}. header ${JSON.stringify(h)} — samples: ${samples.length ? samples.join(' | ') : '(empty)'}`;
  });
  return `Spreadsheet columns:\n${lines.join('\n')}`;
}
