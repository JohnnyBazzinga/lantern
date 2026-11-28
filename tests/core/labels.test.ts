import { describe, expect, it } from 'vitest';
import { findCandidates } from '../../src/core/candidates';
import { categoryOf } from '../../src/core/clinical';
import { resolveIdentities } from '../../src/core/identity';
import { propose } from '../../src/core/reconcile';
import type { Judgment } from '../../src/core/types';
import { loadDrill } from './drill.helpers';

describe('what kind of entry a row is (drill findings, 28/11)', () => {
  const act = (actText: string, notes = '') => ({ actText, notes });

  it('a volume that comes out of the patient is an observation, not a dose', () => {
    expect(categoryOf(act('Urine output 30ml in 2h - catheter flushed'))).toBe('observation');
    expect(categoryOf(act('Drain output 150 mL since 22:00'))).toBe('observation');
    expect(categoryOf(act('Diurese 400 ml no turno'))).toBe('observation');
  });

  it('an NG tube is a device: pulling it out is nursing care, not medication', () => {
    expect(categoryOf(act('Pulled out NG tube - reinserted, position checked'))).toBe('nursing');
  });

  it('doses, fluids and drugs given down an NG tube stay medication', () => {
    for (const t of [
      'Metoclopramide 10mg IV - vomited x2',
      '500ml NaCl 0.9% bolus given - BP 104/66 after',
      'NaCl 0.9% 1L IV started',
      'Ondansetron 4mg NG',
      'Omeprazole via NG',
      'Furosemide 40mg IV - urine output 200ml after',
    ])
      expect(categoryOf(act(t)), t).toBe('medication');
  });
});

describe('a "same act" suggestion names where its opinion ran', () => {
  async function anaRibeiro(source: Judgment['source']) {
    const { A, B, census } = await loadDrill();
    const identity = resolveIdentities([...A, ...B], census);
    const candidates = findCandidates(A, B);
    const earlier = A.find((a) => a.actText.startsWith('Paracetamol 1g IV given'))!;
    const later = B.find((b) => b.actText === 'PCM 1g IV')!;
    const pair = candidates.find((c) => c.a === earlier.id && c.b === later.id)!;
    pair.local = { relation: 'same', changed: [], evidence: 'PCM 1g IV', source };
    const proposals = propose({ earlier: A, later: B, candidates, identity });
    return proposals.find((p) => p.actId === later.id)!.because;
  }

  it('Gemini Nano on this PC', async () => {
    expect(await anaRibeiro('on_device')).toMatch(/\(on-device\)$/);
  });

  it('the cloud fallback on a PC without Nano is never called on-device', async () => {
    const because = await anaRibeiro('in_cloud');
    expect(because).toMatch(/\(Gemini in the cloud\)$/);
    expect(because).not.toContain('on-device');
  });
});
