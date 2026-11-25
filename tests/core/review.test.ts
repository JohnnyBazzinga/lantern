import { describe, expect, it } from 'vitest';
import { mergeSessionLedger, type LedgerEntry } from '../../src/ai/ledger';
import { buildItems, identityChoice } from '../../src/app/review';
import { findCandidates } from '../../src/core/candidates';
import { resolveIdentities } from '../../src/core/identity';
import { propose } from '../../src/core/reconcile';
import { loadDrill } from './drill.helpers';

async function drillReview() {
  const { A, B, census } = await loadDrill();
  const acts = [...A, ...B];
  const identity = resolveIdentities(acts, census);
  const proposals = propose({ earlier: A, later: B, candidates: findCandidates(A, B), identity });
  return { acts, identity, items: buildItems(acts, proposals, identity) };
}

describe('settling a patient identity', () => {
  it('confirming a patient who is not on the census as a new admission also keeps the row (drill finding, 24/11)', async () => {
    const { acts, identity, items } = await drillReview();
    const admission = identity.find((i) => i.kind === 'not-in-census')!;
    const decisions = identityChoice(admission, admission.id, 'as-written', acts, {}, items);
    for (const id of admission.actIds) expect(decisions[id]).toEqual({ kind: 'approved' });
  });

  it('never decides a row the reviewer has already decided', async () => {
    const { acts, identity, items } = await drillReview();
    const admission = identity.find((i) => i.kind === 'not-in-census')!;
    const id = admission.actIds[0]!;
    const decisions = identityChoice(admission, admission.id, 'as-written', acts, { [id]: { kind: 'excluded', reason: 'not an act' } }, items);
    expect(decisions[id]).toEqual({ kind: 'excluded', reason: 'not an act' });
  });

  it('other identity choices leave the rows to the reviewer', async () => {
    const { acts, identity, items } = await drillReview();
    const variant = identity.find((i) => i.kind === 'name-variant')!;
    expect(identityChoice(variant, variant.id, 'census', acts, {}, items)).toEqual({});
  });

  it('asking the nurse blocks the rows, and settling the identity releases them', async () => {
    const { acts, identity, items } = await drillReview();
    const admission = identity.find((i) => i.kind === 'not-in-census')!;
    const asked = identityChoice(admission, admission.id, 'ask', acts, {}, items);
    for (const id of admission.actIds) expect(asked[id]).toMatchObject({ kind: 'unresolved', ref: `identity:${admission.id}` });
    const settled = identityChoice(admission, admission.id, 'as-written', acts, asked, items);
    for (const id of admission.actIds) expect(settled[id]).toEqual({ kind: 'approved' });
  });
});

describe("a review's own record of model calls", () => {
  const entry = (id: string, at: string, dataOrigin: LedgerEntry['dataOrigin'] = 'bundled-fixture'): LedgerEntry => ({
    id,
    at,
    task: 'judge-pair',
    promptVersion: 'v3',
    mode: 'prefer_on_device',
    inferenceSource: 'on_device',
    model: 'gemini-nano',
    latencyMs: 1800,
    coldStart: false,
    dataOrigin,
    outgoingRefs: [],
    inferenceRequests: 0,
    googleRequests: [],
    schemaValid: true,
  });

  it('keeps the saved calls after a reload and adds new ones, without diagnostics or older calls', () => {
    const opened = '2026-11-24T21:20:00.000Z';
    const saved = [entry('a', '2026-11-24T21:21:00.000Z'), entry('b', '2026-11-24T21:22:00.000Z')];
    const page = [
      entry('b', '2026-11-24T21:22:00.000Z'), // already saved
      entry('c', '2026-11-24T21:30:00.000Z'), // a new call in this review
      entry('d', '2026-11-24T21:31:00.000Z', 'diagnostic'), // the IT check page's local test
      entry('e', '2026-11-24T20:00:00.000Z'), // before the review was opened
    ];
    expect(mergeSessionLedger(saved, page, opened).map((e) => e.id)).toEqual(['c', 'b', 'a']);
    expect(mergeSessionLedger(saved, [], opened)).toBe(saved);
  });
});
