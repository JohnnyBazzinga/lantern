import type { LedgerEntry } from './ledger';

/** Error texts that mean the cloud could not be reached at all: the network, a blocked reCAPTCHA, App Check. */
export const UNREACHABLE = /failed to fetch|networkerror|network error|fetch-error|load failed|appCheck\/|recaptcha/i;

/**
 * Ledger notes written when a cloud call never got an answer because the cloud was out of reach
 * (see models.ts): the preflight, the pause after a failure, the hard deadline, or App Check refusing
 * the browser's token. A 429 or an overloaded model is not one of these: the cloud was there.
 */
const UNREACHABLE_NOTE =
  /^Cloud unreachable:|^Skipped: the cloud could not be reached|blocking Google's servers|App Check token is invalid/i;

export const unreachableNote = (note: string | undefined) => !!note && (UNREACHABLE_NOTE.test(note) || UNREACHABLE.test(note));

/**
 * The drill ran without any AI because the cloud was out of reach and this browser has no on-device
 * model: not one call answered, and at least one failed for want of the cloud. Own files never use the
 * cloud, so they never qualify.
 */
export function cloudOutOfReach(kind: 'drill' | 'import', calls: LedgerEntry[]): boolean {
  if (kind !== 'drill') return false;
  const own = calls.filter((e) => e.dataOrigin !== 'diagnostic');
  if (own.some((e) => e.inferenceSource === 'on_device' || e.inferenceSource === 'in_cloud')) return false;
  return own.some((e) => e.inferenceSource === 'error' && unreachableNote(e.note));
}
