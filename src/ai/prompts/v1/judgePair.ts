import type { Act, Judgment, Relation } from '../../../core/types';
import type { PromptTask } from '../../models';

/**
 * Pair judgment: do two rows from two versions of the same downtime log describe the same act?
 * Used on-device first (Gemini Nano); disputed pairs get an independent cloud reading in the drill.
 */

export const RELATIONS: Relation[] = ['same', 'amendment', 'separate', 'insufficient'];

export const judgePairTask: PromptTask<Omit<Judgment, 'source' | 'ledgerId'>> = {
  id: 'judge-pair',
  version: 'v1',
  system: `You compare two rows from two versions of a hospital ward's improvised downtime log, for the same patient.
Decide how row B relates to row A:
- "same": the same act recorded twice, even if worded differently, abbreviated or misspelled.
- "amendment": the same act, but row B deliberately corrects something (time, dose, status), usually with a note such as "corrected" or "corr.".
- "separate": two different acts, e.g. a repeated dose at a different time, a different drug, or a different measurement value.
- "insufficient": the rows cannot be safely linked (missing details, ambiguous abbreviations). Prefer this to guessing.
Rules:
- A PRN or repeated medication given at clearly different times is "separate", even if the text is identical.
- A missing time alone does not make rows separate.
- Never decide on bed number alone.
- "changed" lists the fields that differ in an amendment: time, dose, drug, route, status, value.
- "evidence" quotes the words that decided it.
Answer only with JSON that follows the schema.`,
  schema: {
    type: 'object',
    properties: {
      relation: { type: 'string', enum: RELATIONS },
      changed: { type: 'array', items: { type: 'string', enum: ['time', 'dose', 'drug', 'route', 'status', 'value'] } },
      evidence: { type: 'string' },
    },
    required: ['relation', 'changed', 'evidence'],
  },
  parse(json) {
    const o = json as Record<string, unknown>;
    if (!RELATIONS.includes(o.relation as Relation)) throw new Error(`unknown relation ${String(o.relation)}`);
    const changed = Array.isArray(o.changed) ? o.changed.filter((x): x is string => typeof x === 'string') : [];
    return { relation: o.relation as Relation, changed, evidence: typeof o.evidence === 'string' ? o.evidence : '' };
  },
};

const line = (label: string, a: Act) =>
  `${label}: time ${a.eventTime || '(blank)'} | ${a.actText || '(blank)'}${a.notes ? ` | comment: ${a.notes}` : ''} | by ${a.documentedBy || '?'}`;

/** Only the two rows' clinical text: no names, no hospital numbers (identity is checked by code). */
export function judgePairInput(a: Act, b: Act): string {
  return `Same patient (identity already verified by the app).\n${line('Row A (earlier version)', a)}\n${line('Row B (later version)', b)}`;
}
