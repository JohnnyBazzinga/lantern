import { normText, similarity } from './text';
import type { Act, MatchCandidate } from './types';

/**
 * Candidate pairs between an earlier version (A) and a later one (B) of the same improvised log.
 * Deterministic: exact copies are recognised by normalised text; everything else is only a
 * *candidate* for a model judgment. Pairs are only formed within the same resolved patient,
 * never on bed number alone.
 */

/**
 * An exact copy has the same patient, time, act AND comments. A correction written only in the
 * comments column ("Enoxaparin 40mg SC" + "NOT given, pt refused") must never pass as a copy, or
 * "keep one" would enter a refused dose as given.
 */
const exactKey = (a: Act) => [a.patientKey, normText(a.eventTime), normText(a.actText), normText(a.notes)].join('|');

export function findCandidates(A: Act[], B: Act[], opts: { maxPerAct?: number; minSimilarity?: number } = {}): MatchCandidate[] {
  const maxPerAct = opts.maxPerAct ?? 2;
  const minSim = opts.minSimilarity ?? 0.12;
  const out: MatchCandidate[] = [];
  const exactA = new Map<string, Act>();
  for (const a of A) if (a.patientKey) exactA.set(exactKey(a), a);
  const takenA = new Set<string>();

  // 1) exact copies
  const rest: Act[] = [];
  for (const b of B) {
    const a = b.patientKey ? exactA.get(exactKey(b)) : undefined;
    if (a && !takenA.has(a.id)) {
      takenA.add(a.id);
      out.push({ id: `${a.id}~${b.id}`, a: a.id, b: b.id, exact: true, similarity: 1, timeGap: 0 });
    } else rest.push(b);
  }

  // 2) non-exact candidates within the same patient, ranked by text similarity and time proximity
  for (const b of rest) {
    if (!b.patientKey) continue;
    const scored = A.filter((a) => a.patientKey === b.patientKey && !takenA.has(a.id))
      .map((a) => {
        const sim = similarity(`${a.actText} ${a.notes}`, `${b.actText} ${b.notes}`);
        const gap = a.timeMinutes !== null && b.timeMinutes !== null ? Math.abs(a.timeMinutes - b.timeMinutes) : null;
        // missing time is not evidence either way; a large gap weakens but never excludes
        const timeBoost = gap === null ? 0 : gap === 0 ? 0.25 : gap <= 30 ? 0.1 : gap > 180 ? -0.1 : 0;
        return { a, sim, gap, score: sim + timeBoost };
      })
      .filter((x) => x.sim >= minSim || x.gap === 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, maxPerAct);
    for (const x of scored) out.push({ id: `${x.a.id}~${b.id}`, a: x.a.id, b: b.id, exact: false, similarity: Math.round(x.score * 100) / 100, timeGap: x.gap });
  }
  return out;
}
