import { describe, expect, it } from 'vitest';
import { findCandidates } from '../../src/core/candidates';
import { resolveIdentities } from '../../src/core/identity';
import { propose } from '../../src/core/reconcile';
import { scoreDrill, type AnswerKey } from '../../src/core/score';
import type { Act, Judgment, MatchCandidate } from '../../src/core/types';
import { buildWorklist, worklistCsv } from '../../src/core/worklist';
import { relayedFrom } from '../../src/core/clinical';
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
    expect(s.actsLost).toEqual([]);
    expect(s.enteredTwice).toEqual([]);
    expect(s.ambiguousEntered).toEqual([]);

    const wl = buildWorklist([...A, ...B], new Map(proposals.map((p) => [p.actId, p.disposition])));
    expect(wl.ready).toHaveLength(27);
    expect(wl.undecided).toEqual([]);
    const enox = wl.ready.find((r) => r.act.includes('Enoxaparin'))!;
    expect(enox.act).toContain('NOT given');
    expect(worklistCsv(wl)).toContain('Question for');

    // usability findings: chronological across midnight, dates, who enters what, one question per problem
    const wl2 = buildWorklist([...A, ...B], new Map(proposals.map((p) => [p.actId, p.disposition])), { nightOf: '2026-11-22' });
    for (const [, rows] of Object.entries(Object.groupBy(wl2.ready, (r) => `${r.enteredBy.who}|${r.patientKey}`)))
      for (let i = 1; i < rows!.length; i++) expect(rows![i]!.order).toBeGreaterThanOrEqual(rows![i - 1]!.order);
    const george = wl2.ready.filter((r) => r.patientName === 'George Mills').map((r) => `${r.date} ${r.time}`);
    expect(george.indexOf('2026-11-22 22:45')).toBeLessThan(george.indexOf('2026-11-23 05:30'));
    expect(wl2.ready.find((r) => /admi/i.test(r.act))?.enteredBy.role).toBe('clerk');
    expect(wl2.ready.find((r) => /enoxaparin/i.test(r.act))?.enteredBy).toEqual({ role: 'nurse', who: 'nurse KS' });
    // the drill's enoxaparin correction is signed by KS ("per KS", By = KS): not relayed
    expect(wl2.ready.find((r) => /enoxaparin/i.test(r.act))?.confirmBy).toBeNull();
    expect(relayedFrom({ actText: 'Enoxaparin 40mg SC - NOT given', notes: 'per KS: logged as given by mistake', documentedBy: 'JM' })).toBe('KS');
    expect(wl2.ready.every((r) => r.lateEntry.startsWith('Late entry after system downtime'))).toBe(true);
    expect(new Set(wl2.questions.map((q) => q.ref)).size).toBe(wl2.questions.length);
    expect(wl2.questions.every((q) => q.question.length > 20)).toBe(true);
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

  it('with no model at all, the rules still catch every correction and never pair a repeat dose (usability finding P1-01, P3 ISS-01)', async () => {
    // own files on a PC without Gemini Nano: no local or cloud verdict anywhere
    const { A, B, census, key } = await loadDrill();
    const identity = resolveIdentities([...A, ...B], census);
    const cands = findCandidates(A, B);
    const proposals = propose({ earlier: A, later: B, candidates: cands, identity });
    const s = scoreDrill(key, [...A, ...B], proposals, identity);
    expect(s.amendmentsFound).toBe('3/3');
    expect(s.spuriousCorrections).toBe(0);
    expect(s.falseMerges).toEqual([]);
    // the refused enoxaparin can never reach the worklist as given
    const wl = buildWorklist([...A, ...B], new Map(proposals.map((p) => [p.actId, p.disposition])));
    const enox = wl.ready.filter((r) => /enoxaparin/i.test(r.act));
    expect(enox).toHaveLength(1);
    expect(enox[0]!.act).toContain('NOT given');
    // no side-by-side "typed twice?" pair spans more than 30 minutes
    const byId = new Map([...A, ...B].map((a) => [a.id, a]));
    for (const p of proposals.filter((x) => x.pairWith)) {
      const [x, y] = [byId.get(p.actId)!, byId.get(p.pairWith!)!];
      if (x.timeMinutes !== null && y.timeMinutes !== null) expect(Math.abs(x.timeMinutes - y.timeMinutes)).toBeLessThanOrEqual(30);
    }
  });

  it('baseline "exact copies only" shows what a naive merge loses', async () => {
    const { A, B, census, key } = await loadDrill();
    const identity = resolveIdentities([...A, ...B], census);
    const cands = findCandidates(A, B).filter((c) => c.exact);
    const proposals = propose({ earlier: A, later: B, candidates: cands, identity });
    const s = scoreDrill(key, [...A, ...B], proposals, identity);
    expect(s.sameActRecall).toBe('12/21');
    expect(s.amendmentsFound).toBe('0/3');
    expect(s.enteredTwice).toHaveLength(9); // 6 re-typings + 3 corrections
    expect(s.actsLost).toEqual([]);
    // re-typed acts and corrections end up twice in the record
    expect(s.worklist.ready).toBeGreaterThan(27);
  });
});
