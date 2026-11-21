import type { Act, Judgment, Relation } from '../../../core/types';
import type { PromptTask } from '../../models';

/**
 * On-device pair question, deliberately narrow: "is this the same clinical act, written twice?"
 * This is the part only a language model can do (PCM = paracetamol, "nasal specs" = NP, a typo in a
 * drug name). Whether it is a *correction* is decided by code from the sheet's own correction notes,
 * and repeated doses are separated by a time rule (src/core/reconcile.ts `guard`).
 */
export const sameEventTask: PromptTask<Omit<Judgment, 'source' | 'ledgerId'>> = {
  id: 'same-event',
  version: 'v2',
  system: `Two rows from a hospital ward's improvised downtime log describe care for the same patient.
Question: do both rows describe the SAME clinical act, written twice (possibly in different words, abbreviations or with typos)?
- "yes": same drug/observation/event, e.g. "PCM 1g IV" and "Paracetamol 1g IV given", or "O2 2L via nasal specs" and "O2 2L NP started".
- "no": clearly different acts: another drug, another kind of observation, or a new measurement.
- "unsure": too little detail, or an abbreviation that could mean different things.
If row B's comment says it corrects row A (e.g. "corrected", "corr.", "dose was", "not given", "logged by mistake"),
it is the SAME act being corrected: answer "yes", even though a value or status differs.
Ignore differences in wording, abbreviations, spelling, capitalisation and extra comments.
"evidence" quotes the words that decided it.
Answer only with JSON that follows the schema.`,
  schema: {
    type: 'object',
    properties: {
      same_act: { type: 'string', enum: ['yes', 'no', 'unsure'] },
      evidence: { type: 'string' },
    },
    required: ['same_act', 'evidence'],
  },
  parse(json) {
    const o = json as Record<string, unknown>;
    const map: Record<string, Relation> = { yes: 'same', no: 'separate', unsure: 'insufficient' };
    const relation = map[String(o.same_act)];
    if (!relation) throw new Error(`unknown answer ${String(o.same_act)}`);
    return { relation, changed: [], evidence: typeof o.evidence === 'string' ? o.evidence : '' };
  },
};

const line = (label: string, a: Act) =>
  `${label}: ${a.actText || '(blank)'}${a.notes ? ` | comment: ${a.notes}` : ''}`;

/** Clinical text only. Times are left out on purpose: the time rule is applied by code. */
export function sameEventInput(a: Act, b: Act): string {
  return `${line('Row A', a)}\n${line('Row B', b)}`;
}
