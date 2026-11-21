import { describe, expect, it } from 'vitest';
import { findCandidates } from '../../src/core/candidates';
import { resolveIdentities } from '../../src/core/identity';
import { propose } from '../../src/core/reconcile';
import { scoreDrill, type AnswerKey } from '../../src/core/score';
import type { Act, Judgment, MatchCandidate } from '../../src/core/types';
import { buildWorklist, worklistCsv } from '../../src/core/worklist';
import { loadDrill } from './drill.helpers';

/** A judge that knows the answer key: proves the plumbing, not the model. */
function oracle(key: AnswerKey, acts: Act[]) {
  const keyId = (a: Act) => (a.fileId === 'v1' ? key.rows.v1 : key.rows.v2).find((r) => r.sheetRow === a.row + 2)?.id;
  const byId = new Map(acts.map((a) => [a.id, a]));
  return (c: MatchCandidate): Judgment => {
    const a = keyId(byId.get(c.a)!);
    const b = keyId(byId.get(c.b)!);
    const same = key.expected.sameActPairs.find((p) => p.v1 === a && p.v2 === b);
    if (same?.kind === 'amendment') {
      const f = key.expected.amendments.find((m) => m.v2 === b)!.field;
      return { relation: 'amendment', changed: [f], evidence: 'oracle', source: 'rule' };
    }
    if (same) return { relation: 'same', changed: [], evidence: 'oracle', source: 'rule' };
    return { relation: 'separate', changed: [], evidence: 'oracle', source: 'rule' };
  };
}

describe('Ward 7B drill', () => {
  it('finds the four identity problems before any model runs', async () => {
    const { A, B, census } = await loadDrill();
    const issues = resolveIdentities([...A, ...B], census);
    expect(issues.map((i) => i.kind).sort()).toEqual(['id-mismatch', 'name-variant', 'no-identity', 'not-in-census']);
    expect(issues.find((i) => i.kind === 'id-mismatch')?.detail).toContain('transposed');
  });

  it('recognises the 12 unchanged copies deterministically', async () => {
    const { A, B, census } = await loadDrill();
    resolveIdentities([...A, ...B], census);
    const c = findCandidates(A, B);
    expect(c.filter((x) => x.exact)).toHaveLength(12);
    // every gold re-typing/correction is among the candidates offered to the model
    const ids = new Set(c.map((x) => `${x.a.split(':')[1]}~${x.b}`));
    expect(ids.size).toBeGreaterThan(12);
  });

  it('with a perfect judge, produces the expected worklist (plumbing check)', async () => {
    const { A, B, census, key } = await loadDrill();
    const identity = resolveIdentities([...A, ...B], census);
    const cands = findCandidates(A, B);
    const judge = oracle(key, [...A, ...B]);
    for (const c of cands) if (!c.exact) c.local = judge(c);
    const proposals = propose({ earlier: A, later: B, candidates: cands, identity });
    const s = scoreDrill(key, [...A, ...B], proposals, identity);
    expect(s.sameActRecall).toBe('21/21');
    expect(s.falseMerges).toEqual([]);
    expect(s.amendmentsFound).toBe('3/3');
    expect(s.openQuestionsKept).toBe('2/2');
    expect(s.earlierOnlyKept).toBe('3/3');
    expect(s.identityFound).toBe('4/4');
    expect(s.worklist.ready).toBe(27);
    expect(s.worklist.unresolved).toBe(2);

    const wl = buildWorklist([...A, ...B], new Map(proposals.map((p) => [p.actId, p.disposition])));
    expect(wl.ready).toHaveLength(27);
    expect(wl.undecided).toEqual([]);
    const enox = wl.ready.find((r) => r.act.includes('Enoxaparin'))!;
    expect(enox.act).toContain('NOT given');
    expect(worklistCsv(wl)).toContain('Open question');
  });

  it("Lantern's rules neutralise a careless judge (re-typings called corrections, repeats called copies)", async () => {
    const { A, B, census, key } = await loadDrill();
    const identity = resolveIdentities([...A, ...B], census);
    const cands = findCandidates(A, B);
    const truth = oracle(key, [...A, ...B]);
    for (const c of cands) {
      if (c.exact) continue;
      const t = truth(c).relation;
      // the failure modes we worry about in a small on-device model
      const careless = t === 'same' ? 'amendment' : t === 'separate' ? 'same' : 'same';
      c.local = { relation: careless, changed: [], evidence: 'careless', source: 'on_device' };
    }
    const proposals = propose({ earlier: A, later: B, candidates: cands, identity });
    const s = scoreDrill(key, [...A, ...B], proposals, identity);
    expect(s.spuriousCorrections).toBe(0);
    expect(s.amendmentsFound).toBe('3/3');
    expect(s.falseMerges).toEqual([]);
    expect(s.worklist.ready).toBe(27);
    // the corrected time comes from the cells, not from the model
    const henry = proposals.find((p) => p.disposition.kind === 'corrected' && p.disposition.changes.some((ch) => ch.field === 'time'));
    expect(henry?.disposition.kind === 'corrected' && henry.disposition.changes.find((ch) => ch.field === 'time')?.to).toBe('02:30');
  });

  it('reproduces the real on-device run of 2026-11-21 (same-event v1) and reaches the expected worklist', async () => {
    const { A, B, census, key } = await loadDrill();
    const identity = resolveIdentities([...A, ...B], census);
    const cands = findCandidates(A, B);
    const all = [...A, ...B];
    const kid = (id: string) => {
      const a = all.find((x) => x.id === id)!;
      return (a.fileId === 'v1' ? key.rows.v1 : key.rows.v2).find((r) => r.sheetRow === a.row + 2)!.id;
    };
    // verdicts observed on the developer's laptop (Gemini Nano, prompt same-event v1)
    const observed: Record<string, 'same' | 'separate'> = {
      'v1-03~v2-n1': 'same',
      'v1-03~v2-q1': 'separate',
      'v1-03~v2-p03': 'same',
      'v1-11~v2-p11': 'same',
      'v1-16~v2-a16': 'same',
      'v1-23~v2-p23': 'same',
      'v1-01~v2-p01': 'same',
      'v1-13~v2-p13': 'same',
      'v1-18~v2-a18': 'separate',
      'v1-09~v2-p09': 'same',
      'v1-20~v2-a20': 'separate',
    };
    for (const c of cands) {
      if (c.exact) continue;
      const rel = observed[`${kid(c.a)}~${kid(c.b)}`];
      if (rel) c.local = { relation: rel, changed: [], evidence: 'observed', source: 'on_device' };
    }
    const s = scoreDrill(key, all, propose({ earlier: A, later: B, candidates: cands, identity }), identity);
    expect(s.sameActRecall).toBe('21/21');
    expect(s.amendmentsFound).toBe('3/3');
    expect(s.spuriousCorrections).toBe(0);
    expect(s.falseMerges).toEqual([]);
    expect(s.worklist.ready).toBe(27);
  });

  it('baseline "exact copies only" shows what a naive merge loses', async () => {
    const { A, B, census, key } = await loadDrill();
    const identity = resolveIdentities([...A, ...B], census);
    const cands = findCandidates(A, B).filter((c) => c.exact);
    const proposals = propose({ earlier: A, later: B, candidates: cands, identity });
    const s = scoreDrill(key, [...A, ...B], proposals, identity);
    expect(s.sameActRecall).toBe('12/21');
    expect(s.amendmentsFound).toBe('0/3');
    // re-typed acts and corrections end up twice in the record
    expect(s.worklist.ready).toBeGreaterThan(27);
  });
});
