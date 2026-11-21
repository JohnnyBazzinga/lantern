import { useMemo } from 'react';
import { Download, Printer } from 'lucide-react';
import { useSession } from '../app/session';
import type { Act } from '../core/types';
import { buildWorklist, worklistCsv, type WorklistItem } from '../core/worklist';
import { Button, LanternMark, Notice } from '../ui/kit';

/** Applies the reviewer's identity decisions ("use the census") to the acts before building the worklist. */
export function actsWithIdentity(acts: Act[], issues: { id: string; actIds: string[]; suggestion?: { patientName: string; patientId: string } }[], choices: Record<string, string>): Act[] {
  const override = new Map<string, { patientName: string; patientId: string }>();
  for (const i of issues) if (choices[i.id] === 'census' && i.suggestion) i.actIds.forEach((id) => override.set(id, i.suggestion!));
  return acts.map((a) => (override.has(a.id) ? { ...a, ...override.get(a.id)! } : a));
}

export default function Worklist({ onBack, onResult }: { onBack: () => void; onResult: () => void }) {
  const s = useSession();
  const session = s.session!;
  const wl = useMemo(() => {
    const acts = actsWithIdentity(session.acts, session.identity, session.identityDecisions);
    return buildWorklist(acts, new Map(Object.entries(session.decisions)));
  }, [session]);

  const byPatient = useMemo(() => {
    const m = new Map<string, WorklistItem[]>();
    for (const r of wl.ready) m.set(r.patientKey ?? r.patientName, [...(m.get(r.patientKey ?? r.patientName) ?? []), r]);
    return [...m.entries()];
  }, [wl]);
  const entered = wl.ready.filter((r) => session.entered[r.actId]).length;

  const download = () => {
    const blob = new Blob([worklistCsv(wl)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `re-entry-worklist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <main className="mx-auto max-w-5xl px-5 pb-20 pt-8 sm:px-8">
      <header className="no-print mb-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <LanternMark />
          <span className="text-lg font-semibold">Lantern</span>
          <span className="ml-2 text-ink-soft">{session.title}</span>
        </div>
        <Button tone="quiet" onClick={onBack}>
          Back to the review
        </Button>
      </header>

      <h1 className="text-3xl font-semibold tracking-[-0.01em]">Re-entry worklist</h1>
      <p className="mt-3 max-w-[64ch] text-lg text-ink-soft">
        {wl.ready.length} acts are ready to be entered into the record, each once, in time order per patient.
        {wl.unresolved.length > 0 && ` ${wl.unresolved.length} ${wl.unresolved.length === 1 ? 'question goes' : 'questions go'} back to the nurse who wrote ${wl.unresolved.length === 1 ? 'it' : 'them'}.`}{' '}
        Ready is not entered: tick each act as you type it into the record.
      </p>

      {wl.undecided.length > 0 && (
        <div className="no-print mt-6">
          <Notice tone="pen">
            {wl.undecided.length} rows still have no decision, so this list is not complete.{' '}
            <Button tone="secondary" className="ml-2" onClick={onBack}>
              Finish the review
            </Button>
          </Notice>
        </div>
      )}

      <div className="no-print mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={download}>
          <Download size={16} /> Download as CSV
        </Button>
        <Button tone="secondary" onClick={() => window.print()}>
          <Printer size={16} /> Print
        </Button>
        {session.kind === 'drill' && wl.undecided.length === 0 && (
          <Button tone="secondary" onClick={() => { s.finish(); onResult(); }}>
            See how the drill went
          </Button>
        )}
        <span className="text-sm tabular-nums text-ink-soft">
          {entered} of {wl.ready.length} entered
        </span>
      </div>

      {wl.unresolved.length > 0 && (
        <section className="mt-10" aria-labelledby="open">
          <h2 id="open" className="mb-3 text-xl font-semibold text-pen">
            Questions for the ward
          </h2>
          <ul className="divide-y divide-rule rounded-[3px] border border-pen/40 bg-sheet">
            {wl.unresolved.map((u) => (
              <li key={u.actId} className="px-4 py-3">
                <p className="font-mono text-[15px]">{u.act || '(blank)'}</p>
                <p className="mt-1 text-[15px]">
                  <span className="font-semibold">{u.owner}:</span> {u.question}
                </p>
                <p className="text-sm text-ink-faint">{u.source}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 space-y-8" aria-label="Acts ready for re-entry">
        {byPatient.map(([key, rows]) => (
          <div key={key} className="break-inside-avoid">
            <h2 className="mb-2 flex flex-wrap items-baseline gap-x-3 border-b border-rule-strong pb-1">
              <span className="text-lg font-semibold">{rows[0]!.patientName || 'No name'}</span>
              <span className="text-ink-soft">{rows[0]!.patientKey}</span>
              {rows[0]!.bed && <span className="text-ink-soft">bed {rows[0]!.bed}</span>}
            </h2>
            <table className="w-full border-collapse text-left">
              <tbody>
                {rows.map((r) => (
                  <tr key={r.actId} className="border-b border-rule align-top last:border-b-0">
                    <td className="w-10 py-2">
                      <input
                        type="checkbox"
                        aria-label={`Entered: ${r.act}`}
                        checked={!!session.entered[r.actId]}
                        onChange={() => s.toggleEntered(r.actId)}
                        className="h-4 w-4 accent-[var(--color-scrub)]"
                      />
                    </td>
                    <td className="w-16 py-2 font-mono tabular-nums">{r.time || '—'}</td>
                    <td className="py-2">
                      <span className={`font-mono text-[15px] ${session.entered[r.actId] ? 'text-ink-faint line-through' : ''}`}>{r.act}</span>
                      {r.corrected.length > 0 && (
                        <span className="mt-0.5 block text-sm text-ink-soft">
                          Corrected:{' '}
                          {r.corrected.map((c) => (
                            <span key={c.field}>
                              <s className="text-ink-faint">{c.from}</s> {c.to} <span className="text-ink-faint">({c.basis})</span>{' '}
                            </span>
                          ))}
                        </span>
                      )}
                      {r.notes && <span className="block text-sm text-ink-soft">{r.notes}</span>}
                    </td>
                    <td className="w-24 py-2 text-sm text-ink-soft">{r.documentedBy}</td>
                    <td className="w-44 py-2 text-right text-sm text-ink-faint">{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>
    </main>
  );
}
