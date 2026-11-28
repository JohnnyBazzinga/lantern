import { describe, expect, it } from 'vitest';
import type { LedgerEntry } from '../../src/ai/ledger';
import { cloudOutOfReach } from '../../src/ai/reach';

const call = (inferenceSource: LedgerEntry['inferenceSource'], note?: string, dataOrigin: LedgerEntry['dataOrigin'] = 'bundled-fixture'): LedgerEntry => ({
  id: crypto.randomUUID(),
  at: '2026-11-28T01:50:00.000Z',
  task: 'judge-pair',
  promptVersion: 'v3',
  mode: 'prefer_on_device',
  inferenceSource,
  model: 'gemini-3.5-flash-lite',
  latencyMs: 0,
  coldStart: false,
  dataOrigin,
  outgoingRefs: [],
  inferenceRequests: 0,
  googleRequests: [],
  schemaValid: null,
  ...(note && { note }),
});

describe('the drill ran on the rules alone because the cloud was out of reach (Firefox strict mode, 28/11)', () => {
  const blocked = [
    call('error', "Cloud unreachable: App Check gave no token within 10 s: this network may be blocking Google's servers."),
    call('error', 'Skipped: the cloud could not be reached from this network a moment ago.'),
  ];

  it('says so when no call answered and the cloud could not be reached', () => {
    expect(cloudOutOfReach('drill', blocked)).toBe(true);
    expect(cloudOutOfReach('drill', [call('error', 'Cloud unreachable: FirebaseError: AppCheck: ReCAPTCHA error. (appCheck/recaptcha-error).')])).toBe(true);
    expect(cloudOutOfReach('drill', [call('error', '[401 ] Firebase App Check token is invalid.')])).toBe(true);
    expect(cloudOutOfReach('drill', [call('error', 'TypeError: Failed to fetch')])).toBe(true);
  });

  it('stays quiet once any model answered, on this device or in the cloud', () => {
    expect(cloudOutOfReach('drill', [...blocked, call('on_device')])).toBe(false);
    expect(cloudOutOfReach('drill', [...blocked, call('in_cloud')])).toBe(false);
  });

  it('stays quiet when the cloud was there but refused or was busy', () => {
    expect(cloudOutOfReach('drill', [call('error', '[429 ] Your prepayment credits are depleted.')])).toBe(false);
    expect(cloudOutOfReach('drill', [call('error', 'The model is overloaded. Please try again later.')])).toBe(false);
    expect(cloudOutOfReach('drill', [])).toBe(false);
  });

  it("never applies to the user's own files, nor to the IT page's diagnostic test", () => {
    expect(cloudOutOfReach('import', blocked)).toBe(false);
    expect(cloudOutOfReach('drill', [call('error', 'Cloud unreachable: Failed to fetch', 'diagnostic')])).toBe(false);
  });
});
