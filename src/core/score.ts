import type { Proposal } from './reconcile';
import type { Act, IdentityIssue } from './types';

/** Scores proposals against the frozen drill answer key (public/fixtures/drill/answer-key.json). */

export interface AnswerKey {
  rows: { v1: { id: string; sheetRow: number }[]; v2: { id: string; sheetRow: number; kind: string; of?: string }[] };
  expected: {
    onlyInV1: string[];
    sameActPairs: { v1: string; v2: string; kind: string }[];
    mustNotMerge: { v1: string; v2: string; why: string }[];
    amendments: { v1: string; v2: string; field: string }[];
    openQuestions: { v2: string }[];
    identityConflicts: { rows: string[]; kind: string }[];
    worklist: { approvedActs: number; unresolved: number };
  };
}

export interface DrillScore {
  sameActRecall: string;
  sameActPrecision: string;
  falseMerges: string[];
  amendmentsFound: string;
  /** documented corrections the reviewer sent to the nurse instead of applying them: handled safely, not missed */
  amendmentsWithNurse: number;
  /** rows "corrected" although the sheet documents no correction for them (a re-typing rewritten as a correction) */
  spuriousCorrections: number;
  openQuestionsKept: string;
  earlierOnlyKept: string;
  identityFound: string;
  worklist: { ready: number; unresolved: number; expectedReady: number; expectedUnresolved: number };
  /** real acts (per the answer key) with no row left in the worklist */
  /** real acts that never reach the worklist and are not waiting for a nurse's answer either */
  actsLost: string[];
  /** real acts not yet on the worklist because the reviewer sent them to the nurse (not a loss) */
  withNurse: string[];
  /** real acts that would be entered more than once */
  enteredTwice: string[];
  /** ambiguous rows entered as if they were certain */
  ambiguousEntered: string[];
  /** compact numbers for charts */
  raw: Record<string, number>;
}

export function scoreDrill(key: AnswerKey, acts: Act[], proposals: Proposal[], identity: IdentityIssue[]): DrillScore {
  const keyId = new Map<string, string>();
  for (const a of acts) {
    const list = a.fileId === 'v1' ? key.rows.v1 : a.fileId === 'v2' ? key.rows.v2 : [];
    const k = list.find((r) => r.sheetRow === a.row + 2);
    if (k) keyId.set(a.id, k.id);
  }
  const actOf = new Map([...keyId.entries()].map(([act, k]) => [k, act]));
  const prop = new Map(proposals.map((p) => [p.actId, p]));
  const linked = (v1: string, v2: string) => {
    const d = prop.get(actOf.get(v2) ?? '')?.disposition;
    return d?.kind === 'duplicate' && d.of === actOf.get(v1);
  };

  const gold = key.expected.sameActPairs;
  const hits = gold.filter((p) => linked(p.v1, p.v2)).length;
  const proposedPairs = proposals.filter((p) => p.disposition.kind === 'duplicate').length;
  const falseMerges = key.expected.mustNotMerge.filter((p) => linked(p.v1, p.v2)).map((p) => `${p.v1}~${p.v2}`);
  const amend = key.expected.amendments.filter((p) => prop.get(actOf.get(p.v1) ?? '')?.disposition.kind === 'corrected' && linked(p.v1, p.v2)).length;
  const goldAmended = new Set(key.expected.amendments.map((p) => actOf.get(p.v1)));
  const spurious = proposals.filter((p) => p.disposition.kind === 'corrected' && !goldAmended.has(p.actId)).length;
  const open = key.expected.openQuestions.filter((q) => prop.get(actOf.get(q.v2) ?? '')?.disposition.kind === 'unresolved').length;
  const earlier = key.expected.onlyInV1.filter((id) => {
    const k = prop.get(actOf.get(id) ?? '')?.disposition.kind;
    return k === 'approved' || k === 'corrected';
  }).length;
  const idFound = key.expected.identityConflicts.filter((c) =>
    identity.some((i) => kindMatches(i.kind, c.kind) && i.actIds.some((a) => c.rows.includes(keyId.get(a) ?? ''))),
  ).length;
  const ready = proposals.filter((p) => p.disposition.kind === 'approved' || p.disposition.kind === 'corrected').length;
  const isReady = (keyRow: string) => {
    const k = prop.get(actOf.get(keyRow) ?? '')?.disposition.kind;
    return k === 'approved' || k === 'corrected';
  };
  // one real act = a v1 row plus every v2 row that copies/re-types/corrects it, or a new v2 row
  const realActs = [
    ...key.rows.v1.map((r) => ({ id: r.id, rows: [r.id, ...key.rows.v2.filter((x) => x.of === r.id).map((x) => x.id)] })),
    ...key.rows.v2.filter((x) => x.kind === 'new').map((x) => ({ id: x.id, rows: [x.id] })),
  ];
  const isAsked = (keyRow: string) => prop.get(actOf.get(keyRow) ?? '')?.disposition.kind === 'unresolved';
  const notReady = realActs.filter((a) => !a.rows.some(isReady));
  const withNurse = notReady.filter((a) => a.rows.some(isAsked)).map((a) => a.id);
  const actsLost = notReady.filter((a) => !a.rows.some(isAsked)).map((a) => a.id);
  const enteredTwice = realActs.filter((a) => a.rows.filter(isReady).length > 1).map((a) => a.id);
  const ambiguousEntered = key.rows.v2.filter((x) => x.kind === 'ambiguous' && isReady(x.id)).map((x) => x.id);
  const amendAsked = key.expected.amendments.filter((p) => isAsked(p.v1) || isAsked(p.v2)).length;
  const unresolved = proposals.filter((p) => p.disposition.kind === 'unresolved').length;
  const f = (n: number, d: number) => `${n}/${d}`;
  return {
    sameActRecall: f(hits, gold.length),
    sameActPrecision: f(hits, proposedPairs),
    falseMerges,
    amendmentsFound: f(amend, key.expected.amendments.length),
    amendmentsWithNurse: amendAsked,
    spuriousCorrections: spurious,
    openQuestionsKept: f(open, key.expected.openQuestions.length),
    earlierOnlyKept: f(earlier, key.expected.onlyInV1.length),
    identityFound: f(idFound, key.expected.identityConflicts.length),
    worklist: { ready, unresolved, expectedReady: key.expected.worklist.approvedActs, expectedUnresolved: key.expected.worklist.unresolved },
    actsLost,
    withNurse,
    enteredTwice,
    ambiguousEntered,
    raw: { hits, gold: gold.length, proposedPairs, falseMerges: falseMerges.length, amend, amendAsked, spurious, open, earlier, idFound, ready, unresolved },
  };
}

/** act id → answer-key row id (via file + sheet row) */
export function keyIds(key: AnswerKey, acts: Act[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const a of acts) {
    const list = a.fileId === 'v1' ? key.rows.v1 : a.fileId === 'v2' ? key.rows.v2 : [];
    const k = list.find((r) => r.sheetRow === a.row + 2);
    if (k) m.set(a.id, k.id);
  }
  return m;
}

/** The correct relation for a candidate pair according to the answer key. */
export function goldRelation(key: AnswerKey, v1: string, v2: string): 'same' | 'amendment' | 'separate' {
  const p = key.expected.sameActPairs.find((x) => x.v1 === v1 && x.v2 === v2);
  if (!p) return 'separate';
  return p.kind === 'amendment' ? 'amendment' : 'same';
}

function kindMatches(found: string, expected: string): boolean {
  return found === expected || (expected === 'id-mismatch' && found === 'id-name-conflict');
}
