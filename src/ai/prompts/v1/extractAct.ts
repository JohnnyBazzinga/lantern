import { ACT_TYPES, type ActType } from '../../../core/fields';
import type { PromptTask } from '../../models';

/**
 * Extraction from ONE downtime entry. Every text value must be copied verbatim from the entry,
 * so the reviewer can see exactly which characters it came from; Lantern's code rejects any value
 * that does not occur in the source cell.
 */
export interface ExtractedAct {
  act_type: ActType;
  event_time: string;
  medication: string;
  dose: string;
  route: string;
  measurement: string;
  evidence: string;
}

export const extractActTask: PromptTask<ExtractedAct> = {
  id: 'extract-act',
  version: 'v1',
  system: `You read one entry from a ward's handwritten-style downtime log and pull out facts for re-entry.
Fields:
- act_type: one of ${ACT_TYPES.join(', ')}
- event_time: a clock time written in the entry (e.g. "02:10" or "0210"), else ""
- medication: the drug name exactly as written, else ""
- dose: the amount with its unit exactly as written (e.g. "1g", "40mg", "4u"), else ""
- route: the route exactly as written (e.g. "IV", "po", "SC"), else ""
- measurement: an observation with its value exactly as written (e.g. "BP 92/58", "BM 3.1"), else ""
- evidence: the shortest phrase from the entry that shows what was done
Rules:
- Copy text exactly as it appears. Do not correct spelling, expand abbreviations or convert units.
- If a field is not written in the entry, use "". Never infer or invent.
Answer only with JSON that follows the schema.`,
  schema: {
    type: 'object',
    properties: {
      act_type: { type: 'string', enum: [...ACT_TYPES] },
      event_time: { type: 'string' },
      medication: { type: 'string' },
      dose: { type: 'string' },
      route: { type: 'string' },
      measurement: { type: 'string' },
      evidence: { type: 'string' },
    },
    required: ['act_type', 'event_time', 'medication', 'dose', 'route', 'measurement', 'evidence'],
  },
  parse(json) {
    const o = json as Record<string, unknown>;
    const s = (k: string) => (typeof o[k] === 'string' ? (o[k] as string).trim() : '');
    const act_type = ACT_TYPES.includes(o.act_type as ActType) ? (o.act_type as ActType) : 'other';
    return {
      act_type,
      event_time: s('event_time'),
      medication: s('medication'),
      dose: s('dose'),
      route: s('route'),
      measurement: s('measurement'),
      evidence: s('evidence'),
    };
  },
};

export function extractActInput(entry: { act: string; notes?: string; time?: string }): string {
  const parts = [`Entry: ${entry.act}`];
  if (entry.notes) parts.push(`Comment: ${entry.notes}`);
  if (entry.time) parts.push(`Time column: ${entry.time}`);
  return parts.join('\n');
}

/** Values the model returned that do not occur in the source text (case-insensitive). */
export function unverifiedValues(x: ExtractedAct, source: string): string[] {
  const hay = source.toLowerCase();
  return (['event_time', 'medication', 'dose', 'route', 'measurement', 'evidence'] as const).filter(
    (k) => x[k] !== '' && !hay.includes(x[k].toLowerCase()),
  );
}
