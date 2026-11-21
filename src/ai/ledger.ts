import type { ObservedRequest } from './netwatch';

/**
 * Provenance ledger: one entry per inference call. It answers the questions a DPO or a judge
 * will ask: where did this run, with which model and prompt version, how long did it take,
 * and what (if anything) left the device.
 */
export type LedgerMode = 'only_on_device' | 'prefer_on_device' | 'only_in_cloud' | 'blocked';

export interface LedgerEntry {
  id: string;
  at: string; // ISO time
  task: string;
  promptVersion: string;
  mode: LedgerMode;
  /** what the SDK reported, or 'blocked' when Lantern refused to run the call */
  inferenceSource: 'on_device' | 'in_cloud' | 'blocked' | 'error';
  model: string;
  latencyMs: number;
  coldStart: boolean;
  dataOrigin: 'bundled-fixture' | 'user-import' | 'diagnostic';
  /** references (never contents) of what was sent to the cloud, e.g. fixture act IDs */
  outgoingRefs: string[];
  /** requests to Gemini endpoints observed during the call */
  inferenceRequests: number;
  /** all Google requests observed during the call (App Check, config, inference) */
  googleRequests: ObservedRequest[];
  schemaValid: boolean | null;
  note?: string;
}

type Listener = (entries: LedgerEntry[]) => void;
const entries: LedgerEntry[] = [];
const listeners = new Set<Listener>();

export function recordLedger(e: Omit<LedgerEntry, 'id' | 'at'>): LedgerEntry {
  const full: LedgerEntry = { ...e, id: crypto.randomUUID(), at: new Date().toISOString() };
  entries.unshift(full);
  listeners.forEach((l) => l([...entries]));
  return full;
}

export function getLedger(): LedgerEntry[] {
  return [...entries];
}

export function subscribeLedger(l: Listener): () => void {
  listeners.add(l);
  l([...entries]);
  return () => listeners.delete(l);
}

export function ledgerSummary(es: LedgerEntry[] = entries) {
  const ran = es.filter((e) => e.inferenceSource === 'on_device' || e.inferenceSource === 'in_cloud');
  const onDevice = ran.filter((e) => e.inferenceSource === 'on_device').length;
  return {
    calls: ran.length,
    onDevice,
    inCloud: ran.length - onDevice,
    blocked: es.filter((e) => e.inferenceSource === 'blocked').length,
    onDeviceShare: ran.length ? onDevice / ran.length : 0,
    userDataRequestsToCloud: es
      .filter((e) => e.dataOrigin === 'user-import')
      .reduce((n, e) => n + e.inferenceRequests, 0),
  };
}
