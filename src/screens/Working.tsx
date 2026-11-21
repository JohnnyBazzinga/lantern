import { useEffect, useState } from 'react';
import { subscribeLedger, type LedgerEntry } from '../ai/ledger';
import { useSession } from '../app/session';
import { LanternMark, RanOn } from '../ui/kit';

const TASK_LABEL: Record<string, string> = {
  'map-columns': 'Read the columns',
  'map-column': 'Double-checked one column',
  'same-event': 'Compared two rows',
  'judge-pair': 'Compared two rows',
  'second-opinion': 'Second opinion',
  'extract-act': 'Read one entry',
};

/** While Lantern works: what it is doing, and every model call as it happens, with where it ran. */
export default function Working() {
  const { busy } = useSession();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [since] = useState(() => new Date().toISOString());
  useEffect(() => subscribeLedger((es) => setEntries(es.filter((e) => e.at >= since))), [since]);
  if (!busy) return null;
  const pct = busy.total > 1 ? Math.round((100 * busy.done) / busy.total) : null;
  const sent = entries.filter((e) => e.inferenceSource === 'in_cloud').length;
  const local = entries.filter((e) => e.inferenceSource === 'on_device').length;
  const failed = entries.filter((e) => e.inferenceSource === 'error').length;
  const blocked = entries.filter((e) => e.inferenceSource === 'blocked').length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-paper/95 px-5 pt-[12vh] backdrop-blur-[2px]" role="status" aria-live="polite">
      <div className="w-full max-w-xl">
        <div className="mb-4 flex items-center gap-2 text-ink">
          <LanternMark />
          <span className="font-semibold">Lantern</span>
        </div>
        <p className="text-2xl font-semibold">{busy.stage}</p>
        {pct !== null && (
          <div className="mt-4 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-rule">
              <div className="h-full bg-ink transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm tabular-nums text-ink-soft">
              {busy.done} of {busy.total}
            </span>
          </div>
        )}
        {entries.length > 0 && (
          <div className="mt-8">
            <p className="mb-2 text-sm text-ink-soft">
              {local + sent} AI {local + sent === 1 ? 'answer' : 'answers'} so far: {local} on this device
              {sent ? `, ${sent} in the cloud (fictional drill rows only)` : ''}.
              {failed > 0 && ` ${failed} ${failed === 1 ? 'call' : 'calls'} failed (a busy model or a stalled answer): Lantern retries once, then leaves that row for you to decide.`}
              {blocked > 0 && ` ${blocked} blocked: no on-device AI here, so your data was not sent anywhere.`}
            </p>
            <ul className="divide-y divide-rule rounded-md border border-rule bg-sheet">
              {entries.slice(0, 7).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span>{TASK_LABEL[e.task] ?? e.task}</span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums text-ink-faint">{(e.latencyMs / 1000).toFixed(1)} s</span>
                    {e.inferenceSource === 'on_device' || e.inferenceSource === 'in_cloud' ? (
                      <RanOn source={e.inferenceSource} model={e.model} />
                    ) : (
                      <span className="text-pen" title={e.note}>
                        {e.inferenceSource === 'error' ? 'failed' : 'blocked, nothing sent'}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
