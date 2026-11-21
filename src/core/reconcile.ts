import { ownerOf } from './clinical';
import { identityQuestion, singleQuestion } from './questions';
import { errorProneAbbreviations, normText, similarity } from './text';
import type { Act, Disposition, IdentityIssue, MatchCandidate, Relation } from './types';

/**
 * Turns candidates + judgments into a proposal for every row. Proposals are never final:
 * the reviewer confirms or changes each one. Escalation to a second opinion is triggered by
 * observable conditions (abstention, competing matches, numbers that differ under a "same"
 * verdict), never by a model's self-reported confidence.
 */

export type EscalationReason = 'abstained' | 'competing-match' | 'numbers-differ' | 'local-unavailable' | 'rule-override';

export interface ResolvedPair {
  candidate: MatchCandidate;
  relation: Relation;
  basis: 'exact' | 'local' | 'cloud' | 'rule';
  escalate: EscalationReason[];
}

export interface Proposal {
  actId: string;
  disposition: Disposition;
  /** why Lantern proposes this, in plain words for the reviewer */
  because: string;
  needsReview: boolean;
  group: ReviewGroup;
  /** for a possible duplicate the model never judged: the earlier row to show next to it */
  pairWith?: string;
}

export type ReviewGroup = 'identity' | 'open' | 'changed' | 'likely-same' | 'only-earlier' | 'only-later' | 'copies';

export const GROUP_ORDER: ReviewGroup[] = ['identity', 'open', 'changed', 'likely-same', 'only-earlier', 'only-later', 'copies'];

const numbers = (s: string) => (s.match(/\d+(?:\.\d+)?/g) ?? []).sort().join(',');

/** Words that make a later row a documented correction rather than a re-typing. */
const CORRECTION_NOTE =
  /\b(?:corr(?:ected|ection)?\.?|amend(?:ed|ment)?|error|mistake|wrong(?:ly)?|not given|was not|instead of|should (?:be|read)|actually|by mistake)\b/i;

export const hasCorrectionNote = (b: Act) => CORRECTION_NOTE.test(`${b.actText} ${b.notes}`);

/** Same-act verdicts cannot span recorded times further apart than this unless the sheet documents a correction. */
const MAX_COPY_GAP_MIN = 30;

/** Text similarity above which a documented correction at the same time is taken to amend the earlier row. */
const MIN_CORRECTION_SIMILARITY = 0.3;

/**
 * Deterministic guardrails around every model verdict (local or cloud):
 *  - a correction must be documented in the sheet ("corrected", "corr.", "not given"…)
 *  - a documented correction for the same patient, at the same recorded time (±30 min), with similar
 *    text, amends the earlier row even if the model saw "a different value"
 *  - two rows recorded more than 30 minutes apart, with no correction note, are separate acts
 *    (a repeated PRN dose is not a duplicate, however identical the text)
 */
export function guard(relation: Relation, a: Act, b: Act): { relation: Relation; rule?: string } {
  const marked = hasCorrectionNote(b);
  const gap = a.timeMinutes !== null && b.timeMinutes !== null ? Math.abs(a.timeMinutes - b.timeMinutes) : null;
  if (
    (relation === 'separate' || relation === 'insufficient') &&
    marked &&
    gap !== null &&
    gap <= MAX_COPY_GAP_MIN &&
    similarity(a.actText, b.actText) >= MIN_CORRECTION_SIMILARITY
  )
    return { relation: 'amendment', rule: 'a documented correction of the same entry (same time, similar text)' };
  if ((relation === 'same' || relation === 'amendment') && gap !== null && gap > MAX_COPY_GAP_MIN && !marked)
    return { relation: 'separate', rule: `recorded ${Math.floor(gap / 60)}h${String(gap % 60).padStart(2, '0')} apart with no correction note: a repeated act, not a copy` };
  if (relation === 'amendment' && !marked) return { relation: 'same', rule: 'no correction note in the sheet: a re-typed copy, not a correction' };
  if (relation === 'same' && marked) return { relation: 'amendment', rule: 'the later row documents a correction' };
  return { relation };
}

/**
 * What the rules can decide on their own, with no model at all (imported files on a PC without
 * Gemini Nano). Safety must not depend on the model being present:
 *  - a later row that documents a correction ("NOT given", "corr.", "by mistake"…) of a similar entry
 *    at the same recorded time is a correction, never "typed twice"
 *  - two rows recorded more than 30 minutes apart with no correction note are separate acts
 * Anything else stays undecided and goes to the reviewer side by side, with no suggestion.
 */
export function ruleVerdict(a: Act, b: Act): { relation: Relation; rule: string } | null {
  const marked = hasCorrectionNote(b);
  const gap = a.timeMinutes !== null && b.timeMinutes !== null ? Math.abs(a.timeMinutes - b.timeMinutes) : null;
  if (marked && (gap === null || gap <= MAX_COPY_GAP_MIN) && similarity(a.actText, b.actText) >= MIN_CORRECTION_SIMILARITY)
    return { relation: 'amendment', rule: 'the later row documents a correction of this entry' };
  if (!marked && gap !== null && gap > MAX_COPY_GAP_MIN)
    return { relation: 'separate', rule: `recorded ${Math.floor(gap / 60)}h${String(gap % 60).padStart(2, '0')} apart with no correction note: a repeated act, not a copy` };
  return null;
}

/** The verdict to use for a candidate: cloud second opinion if present, else local, else exact, else the rules alone; always guarded. */
export function verdict(
  c: MatchCandidate,
  acts: Map<string, Act>,
): { relation: Relation; basis: ResolvedPair['basis']; rule?: string } | null {
  if (c.exact) return { relation: 'same', basis: 'exact' };
  const a = acts.get(c.a)!;
  const b = acts.get(c.b)!;
  const j = c.cloud ?? c.local;
  if (!j) {
    const r = ruleVerdict(a, b);
    return r && { relation: r.relation, basis: 'rule', rule: r.rule };
  }
  const g = guard(j.relation, a, b);
  return { relation: g.relation, basis: c.cloud ? 'cloud' : 'local', ...(g.rule && { rule: g.rule }) };
}

export function escalations(cands: MatchCandidate[], acts: Map<string, Act>): Map<string, EscalationReason[]> {
  const out = new Map<string, EscalationReason[]>();
  const add = (id: string, r: EscalationReason) => out.set(id, [...(out.get(id) ?? []), r]);
  const linkedB = new Map<string, string[]>();
  for (const c of cands) {
    if (c.exact) continue;
    if (!c.local) {
      add(c.id, 'local-unavailable');
      continue;
    }
    const a = acts.get(c.a)!;
    const b = acts.get(c.b)!;
    const g = guard(c.local.relation, a, b);
    if (g.relation !== c.local.relation) add(c.id, 'rule-override');
    if (g.relation === 'insufficient') add(c.id, 'abstained');
    if (g.relation === 'same' || g.relation === 'amendment') {
      linkedB.set(c.a, [...(linkedB.get(c.a) ?? []), c.id]);
      if (g.relation === 'same' && numbers(`${a.actText} ${a.notes}`) !== numbers(`${b.actText} ${b.notes}`)) add(c.id, 'numbers-differ');
    }
  }
  for (const ids of linkedB.values()) if (ids.length > 1) ids.forEach((id) => add(id, 'competing-match'));
  return out;
}

export interface ReconcileInput {
  earlier: Act[];
  later: Act[];
  candidates: MatchCandidate[];
  identity: IdentityIssue[];
}

export function propose({ earlier, later, candidates, identity }: ReconcileInput): Proposal[] {
  const all = [...earlier, ...later];
  const byId = new Map(all.map((a) => [a.id, a]));
  const proposals = new Map<string, Proposal>();
  const set = (p: Proposal) => proposals.set(p.actId, p);

  // 1) pairs, strongest first (exact, then most similar); each act links at most once
  const linkedA = new Set<string>();
  const linkedB = new Set<string>();
  const ranked = candidates
    .map((c) => ({ c, v: verdict(c, byId) }))
    .filter((x): x is { c: MatchCandidate; v: NonNullable<ReturnType<typeof verdict>> } => !!x.v && (x.v.relation === 'same' || x.v.relation === 'amendment'))
    .sort((x, y) => Number(y.c.exact) - Number(x.c.exact) || y.c.similarity - x.c.similarity);
  const competing = new Set(
    [...escalations(candidates, byId).entries()].filter(([, r]) => r.includes('competing-match')).map(([id]) => id),
  );

  for (const { c, v } of ranked) {
    if (linkedA.has(c.a) || linkedB.has(c.b)) continue;
    const a = byId.get(c.a)!;
    const b = byId.get(c.b)!;
    linkedA.add(c.a);
    linkedB.add(c.b);
    const contested = competing.has(c.id) && v.basis !== 'cloud';
    if (v.relation === 'amendment') {
      // what changed is computed from the cells themselves, not taken from the model
      const fields = [
        ...(b.eventTime && normText(a.eventTime) !== normText(b.eventTime) ? ['time'] : []),
        ...(normText(a.actText) !== normText(b.actText) ? ['details'] : []),
      ];
      if (!fields.length) fields.push('details');
      set({
        actId: a.id,
        disposition: {
          kind: 'corrected',
          changes: fields.map((f) => ({
            field: f,
            from: f === 'time' ? a.eventTime : a.actText,
            to: f === 'time' ? b.eventTime : b.actText,
            basis: b.notes || `later version (${b.versionLabel})`,
          })),
        },
        because: `Corrected in ${b.versionLabel}: “${b.notes || b.actText}”`,
        needsReview: true,
        group: 'changed',
      });
      set({ actId: b.id, disposition: { kind: 'duplicate', of: a.id }, because: `Correction of ${a.versionLabel} row ${a.row + 2}`, needsReview: true, group: 'changed' });
    } else {
      set({
        actId: a.id,
        disposition: { kind: 'approved' },
        because: c.exact ? `Identical in ${b.versionLabel}` : `Same act re-typed in ${b.versionLabel}`,
        needsReview: !c.exact || contested,
        group: c.exact ? 'copies' : 'likely-same',
      });
      set({
        actId: b.id,
        disposition: { kind: 'duplicate', of: a.id },
        because: c.exact
          ? `Copy of ${a.versionLabel} row ${a.row + 2}`
          : `Same act as ${a.versionLabel} row ${a.row + 2} (${v.basis === 'cloud' ? 'cloud second opinion' : v.basis === 'rule' ? 'Lantern’s rules' : 'on-device'})`,
        needsReview: !c.exact || contested,
        group: c.exact ? 'copies' : 'likely-same',
      });
    }
  }

  // 2) unlinked rows; first, possible duplicates no model judged (shown side by side, decided by hand)
  const unjudgedFor = new Map<string, string>();
  for (const b of later) {
    if (proposals.has(b.id)) continue;
    const c = candidates.find((x) => x.b === b.id && !verdict(x, byId) && !linkedA.has(x.a) && ![...unjudgedFor.values()].includes(x.a));
    if (c) unjudgedFor.set(b.id, c.a);
  }
  for (const [bId, aId] of unjudgedFor) {
    const b = byId.get(bId)!;
    set({ actId: aId, disposition: { kind: 'approved' }, because: `Possibly re-typed in ${b.versionLabel} row ${b.row + 2}; no on-device model was available, decide manually`, needsReview: true, group: 'likely-same', pairWith: bId });
  }
  for (const a of earlier)
    if (!proposals.has(a.id))
      set({ actId: a.id, disposition: { kind: 'approved' }, because: `Missing from ${later[0]?.versionLabel ?? 'the later version'}: keep unless it was deliberately removed`, needsReview: true, group: 'only-earlier' });
  for (const b of later) {
    if (proposals.has(b.id)) continue;
    // a pair the model never judged (no local model): keep the act, but put the possible duplicate in front of the reviewer
    const aId = unjudgedFor.get(b.id);
    if (aId) {
      const a = byId.get(aId)!;
      set({ actId: b.id, disposition: { kind: 'approved' }, because: `Possibly the same act as ${a.versionLabel} row ${a.row + 2}; no on-device model was available, decide manually`, needsReview: true, group: 'likely-same', pairWith: a.id });
    } else set({ actId: b.id, disposition: { kind: 'approved' }, because: `Not in ${earlier[0]?.versionLabel ?? 'the earlier version'}: keep it if it happened`, needsReview: true, group: 'only-later' });
  }

  // 3) open questions override: insufficient verdicts and error-prone abbreviations are never guessed
  for (const c of candidates) {
    const v = verdict(c, byId);
    if (v?.relation !== 'insufficient' || linkedB.has(c.b)) continue;
    const b = byId.get(c.b)!;
    const a = byId.get(c.a)!;
    set({
      actId: b.id,
      disposition: { kind: 'unresolved', owner: ownerOf(b), question: `${singleQuestion('open', b)} It may be the same act as “${a.actText}” at ${a.eventTime || 'no time'}, but there is not enough detail to link them.`, ref: b.id },
      because: (c.cloud ?? c.local)?.evidence || 'Not enough detail to link',
      needsReview: true,
      group: 'open',
    });
  }
  for (const act of all) {
    const flags = errorProneAbbreviations(`${act.actText} ${act.notes}`);
    if (flags.length)
      set({ actId: act.id, disposition: { kind: 'unresolved', owner: ownerOf(act), question: singleQuestion('open', act, flags), ref: act.id }, because: 'Error-prone abbreviation: Lantern never interprets these', needsReview: true, group: 'open' });
  }

  // 4) identity issues
  for (const issue of identity)
    for (const id of issue.actIds) {
      const act = byId.get(id);
      if (!act) continue;
      if (issue.kind === 'no-identity' || issue.kind === 'id-name-conflict') {
        set({ actId: id, disposition: { kind: 'unresolved', owner: ownerOf(act), question: identityQuestion(issue, act), ref: id }, because: 'Patient identity cannot be confirmed from the sheet', needsReview: true, group: 'identity' });
      } else {
        const prev = proposals.get(id);
        set({ ...(prev ?? { actId: id, disposition: { kind: 'approved' }, because: '' }), because: prev?.because || 'Check the patient identity first', needsReview: true, group: 'identity' });
      }
    }

  return all.map((a) => proposals.get(a.id)!);
}

