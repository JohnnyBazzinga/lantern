import type { Act, Judgment } from '../../../core/types';
import type { PromptTask } from '../../models';
import { judgePairTask } from './judgePair';

/**
 * Cloud second opinion for disputed pairs. It gets the pair plus every other row for the same
 * patient in both versions (the wider context Gemini Nano did not have), and it is NOT told what
 * the on-device model concluded, so the two readings stay independent.
 */
export const secondOpinionTask: PromptTask<Omit<Judgment, 'source' | 'ledgerId'>> = {
  id: 'second-opinion',
  version: 'v1',
  system: `${judgePairTask.system}
You also see the other rows recorded for this patient in both versions. Use them to tell a re-typed copy
from a genuinely repeated act (e.g. a second PRN dose), and to notice when another row is a better match for row A.
If another row is clearly the better match for row A, answer "separate" for this pair.`,
  schema: judgePairTask.schema,
  parse: judgePairTask.parse,
};

const line = (a: Act) =>
  `[${a.versionLabel} row ${a.row + 2}] time ${a.eventTime || '(blank)'} | ${a.actText || '(blank)'}${a.notes ? ` | comment: ${a.notes}` : ''} | by ${a.documentedBy || '?'}`;

/** Clinical text only: names, hospital numbers and beds are never part of the payload. */
export function secondOpinionInput(a: Act, b: Act, context: Act[]): string {
  const others = context.filter((x) => x.id !== a.id && x.id !== b.id).sort((x, y) => (x.timeMinutes ?? 9e9) - (y.timeMinutes ?? 9e9));
  return `Same patient (identity verified by the app).
Row A (earlier version): ${line(a)}
Row B (later version): ${line(b)}
Other rows for this patient:
${others.length ? others.map(line).join('\n') : '(none)'}`;
}
