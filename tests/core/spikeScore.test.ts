import { describe, expect, it } from 'vitest';
import { scoreExtraction, scoreMapping } from '../../src/lab/spikeScore';

describe('spike scoring', () => {
  it('scores column mapping per column', () => {
    const s = scoreMapping(
      [
        { index: 0, field: 'bed', confidence: 'high' },
        { index: 1, field: 'patient', confidence: 'medium' },
      ],
      ['bed', 'patient_name'],
    );
    expect(s.correct).toBe(1);
    expect(s.total).toBe(2);
  });

  it('accepts equivalent times and flags values that are not in the source', () => {
    const source = 'Entry: amoxiclav 1.2g iv\nTime column: 2215';
    const s = scoreExtraction(
      { act_type: 'medication', event_time: '22:15', medication: 'Amoxiclav', dose: '1.2g', route: 'IV', measurement: '', evidence: 'amoxiclav 1.2g iv' },
      { act_type: ['medication'], event_time: ['2215'], medication: ['amoxiclav'], dose: ['1.2g'], route: ['iv'], measurement: null },
      source,
    );
    expect(s.correct).toBe(5);
    expect(s.total).toBe(5);
    // "22:15" is not literally in the source ("2215"), so it is flagged as unverified
    expect(s.unverified).toEqual(['event_time']);
  });
});
