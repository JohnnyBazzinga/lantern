import { describe, expect, it } from 'vitest';
import { followUp } from '../../src/core/clinical';
import { doseStatus, drugsIn, maybeDrugsIn, sameDrugRows } from '../../src/core/drugs';
import { resolveIdentities } from '../../src/core/identity';
import { buildWorklist } from '../../src/core/worklist';
import { findCandidates } from '../../src/core/candidates';
import { propose } from '../../src/core/reconcile';
import { setLang } from '../../src/i18n/lang';
import { loadDrill } from './drill.helpers';

const row = (actText: string, notes = '') => ({ actText, notes });

describe('same-medicine rows (F20)', () => {
  it('names medicines in English and Portuguese, brands included, and never reads MS as morphine', () => {
    expect(drugsIn(row('Morphine 2mg SC PRN'))).toEqual(['morphine']);
    expect(drugsIn(row('Morfina 2 mg SC', 'dor 7/10'))).toEqual(['morphine']);
    expect(drugsIn(row('Novorapid 4 units SC - BM 14.2'))).toEqual(['insulin']);
    expect(drugsIn(row('Clexane 40 mg SC'))).toEqual(['enoxaparin']);
    expect(drugsIn(row('500ml NaCl 0.9% bolus given'))).toEqual(['saline']);
    expect(drugsIn(row('MS 10mg given'))).toEqual([]);
    expect(maybeDrugsIn(row('MS 10mg given'))).toEqual(['morphine', 'magnesium']);
    // metamizol magnésico is not magnesium sulfate
    expect(drugsIn(row('Metamizol magnésico 2 g EV'))).toEqual(['metamizole']);
  });

  it("shows all of Fatima Rahman's morphine rows across both files, the 'MS 10mg' line marked uncertain", async () => {
    const { A, B, census } = await loadDrill();
    resolveIdentities([...A, ...B], census);
    const focus = B.find((a) => a.patientName === 'Fatima Rahman' && a.eventTime === '01:45')!;
    const [morphine] = sameDrugRows([...A, ...B], [focus]);
    expect(morphine!.key).toBe('morphine');
    expect(morphine!.controlled).toBe(true);
    expect(morphine!.rows.map((r) => [r.act.fileId, r.act.eventTime || '-', r.sure])).toEqual([
      ['v1', '22:30', true],
      ['v2', '01:45', true],
      ['v2', '04:20', false], // "F. Rahman", "MS 10mg given": same hospital number, abbreviation not interpreted
      ['v2', '-', true], // the re-typed copy with no time comes last
    ]);
  });

  it('shows nothing for a row with no resolved patient', () => {
    expect(sameDrugRows([], [{ ...row('Morphine 2mg'), patientKey: null } as never])).toEqual([]);
  });

  it('reads where each row stands', () => {
    expect(doseStatus(undefined)).toBe('open');
    expect(doseStatus({ kind: 'approved' })).toBe('listed');
    expect(doseStatus({ kind: 'duplicate', of: 'x' })).toBe('copy');
    expect(doseStatus({ kind: 'unresolved', owner: 'JM', question: '?' })).toBe('waiting');
    expect(doseStatus({ kind: 'excluded', reason: 'r' })).toBe('left-out');
  });
});

describe('controlled-drug register reminder', () => {
  it('is added to opioid rows, in the current language, and combined with a fall', () => {
    setLang('en');
    expect(followUp(row('Oxycodone 10mg PO PRN'))).toBe(
      "Controlled drug (oxycodone): check this dose against the ward's controlled-drug register before entering it.",
    );
    expect(followUp(row('Enoxaparin 40mg SC'))).toBeNull();
    expect(followUp(row('Found on floor, morphine 2mg given'))).toMatch(/^A fall: .* Controlled drug \(morphine\)/);
    setLang('pt');
    expect(followUp(row('Morfina 2 mg SC'))).toBe(
      'Estupefaciente (morfina): confirme esta dose no registo de estupefacientes do serviço antes de a registar.',
    );
    setLang('en');
  });

  it('reaches the drill worklist for the opioid doses only', async () => {
    setLang('en');
    const { A, B, census } = await loadDrill();
    const identity = resolveIdentities([...A, ...B], census);
    const candidates = findCandidates(A, B);
    const proposals = propose({ earlier: A, later: B, candidates, identity });
    const wl = buildWorklist([...A, ...B], new Map(proposals.map((p) => [p.actId, p.disposition])), { nightOf: '2026-11-21' });
    const flagged = wl.ready.filter((r) => r.followUp?.includes('controlled-drug register'));
    expect(flagged.length).toBeGreaterThan(0);
    expect(flagged.every((r) => /morphine|oxycodone/i.test(r.act))).toBe(true);
  });
});
