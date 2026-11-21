import { errorProneAbbreviations } from './text';
import type { Act, Disposition, IdentityIssue, MatchCandidate, Relation } from './types';

/**
 * Turns candidates + judgments into a proposal for every row. Proposals are never final:
 * the reviewer confirms or changes each one. Escalation to a second opinion is triggered by
 * observable conditions (abstention, competing matches, numbers that differ under a "same"
 * verdict), never by a model's self-reported confidence.
 */

export type EscalationReason = 'abstained' | 'competing-match' | 'numbers-differ' | 'local-unavailable';

export interface ResolvedPair {
  candidate: MatchCandidate;
  relation: Relation;
  basis: 'exact' | 'local' | 'cloud';
  escalate: EscalationReason[];
}

export interface Proposal {
  actId: string;
  disposition: Disposition;
  /** why Lantern proposes this, in plain words for the reviewer */
  because: string;
  needsReview: boolean;
  group: ReviewGroup;
}

export type ReviewGroup = 'identity' | 'open' | 'changed' | 'likely-same' | 'only-earlier' | 'only-later' | 'copies';

export const GROUP_ORDER: ReviewGroup[] = ['identity', 'open', 'changed', 'likely-same', 'only-earlier', 'only-later', 'copies'];

const numbers = (s: string) => (s.match(/\d+(?:\.\d+)?/g) ?? []).sort().join(',');

/** The verdict to use for a candidate: cloud second opinion if present, else local, else exact. */
export function verdict(c: MatchCandidate): { relation: Relation; basis: ResolvedPair['basis'] } | null {
  if (c.exact) return { relation: 'same', basis: 'exact' };
  if (c.cloud) return { relation: c.cloud.relation, basis: 'cloud' };
  if (c.local) return { relation: c.local.relation, basis: 'local' };
  return null;
}

export function escalations(cands: MatchCandidate[], acts: Map<string, Act>): Map<string, EscalationReason[]> {
  const out = new Map<string, EscalationReason[]>();
  const add = (id: string, r: EscalationReason) => out.set(id, [...(out.get(id) ?? []), r]);
  const linkedB = new Map<string, string[]>();
  for (const c of cands) {
    if (c.exact) continue;
    if (!c.local) add(c.id, 'local-unavailable');
    else if (c.local.relation === 'insufficient') add(c.id, 'abstained');
    if (c.local && (c.local.relation === 'same' || c.local.relation === 'amendment')) {
      linkedB.set(c.a, [...(linkedB.get(c.a) ?? []), c.id]);
      const a = acts.get(c.a)!;
      const b = acts.get(c.b)!;
      if (c.local.relation === 'same' && numbers(`${a.actText} ${a.notes}`) !== numbers(`${b.actText} ${b.notes}`)) add(c.id, 'numbers-differ');
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
    .map((c) => ({ c, v: verdict(c) }))
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
      const judged = c.cloud ?? c.local;
      const fields = judged?.changed.length ? judged.changed : ['details'];
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
        because: c.exact ? `Copy of ${a.versionLabel} row ${a.row + 2}` : `Same act as ${a.versionLabel} row ${a.row + 2} (${v.basis === 'cloud' ? 'cloud second opinion' : 'on-device'})`,
        needsReview: !c.exact || contested,
        group: c.exact ? 'copies' : 'likely-same',
      });
    }
  }

  // 2) unlinked rows
  for (const a of earlier)
    if (!proposals.has(a.id))
      set({ actId: a.id, disposition: { kind: 'approved' }, because: `Missing from ${later[0]?.versionLabel ?? 'the later version'}: keep unless it was deliberately removed`, needsReview: true, group: 'only-earlier' });
  for (const b of later)
    if (!proposals.has(b.id))
      set({ actId: b.id, disposition: { kind: 'approved' }, because: 'Only in the later version: a new act', needsReview: true, group: 'only-later' });

  // 3) open questions override: insufficient verdicts and error-prone abbreviations are never guessed
  for (const c of candidates) {
    const v = verdict(c);
    if (v?.relation !== 'insufficient' || linkedB.has(c.b)) continue;
    const b = byId.get(c.b)!;
    set({ actId: b.id, disposition: { kind: 'unresolved', owner: owner(b), question: 'Cannot be safely linked to the earlier entry' }, because: (c.cloud ?? c.local)?.evidence || 'Not enough detail to link', needsReview: true, group: 'open' });
  }
  for (const act of all) {
    const flags = errorProneAbbreviations(`${act.actText} ${act.notes}`);
    if (flags.length)
      set({ actId: act.id, disposition: { kind: 'unresolved', owner: owner(act), question: `Clarify ${flags.join('; ')}` }, because: 'Error-prone abbreviation: Lantern never interprets these', needsReview: true, group: 'open' });
  }

  // 4) identity issues
  for (const issue of identity)
    for (const id of issue.actIds) {
      const act = byId.get(id);
      if (!act) continue;
      if (issue.kind === 'no-identity' || issue.kind === 'id-name-conflict') {
        set({ actId: id, disposition: { kind: 'unresolved', owner: owner(act), question: issue.detail }, because: 'Patient identity cannot be confirmed from the sheet', needsReview: true, group: 'identity' });
      } else {
        const prev = proposals.get(id);
        set({ ...(prev ?? { actId: id, disposition: { kind: 'approved' }, because: '' }), because: `${issue.detail}${prev?.because ? ` · ${prev.because}` : ''}`, needsReview: true, group: 'identity' });
      }
    }

  return all.map((a) => proposals.get(a.id)!);
}

function owner(act: Act): string {
  return act.documentedBy ? `documenting clinician (${act.documentedBy})` : 'nurse in charge';
}
