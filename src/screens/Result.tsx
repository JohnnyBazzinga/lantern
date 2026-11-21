import { useEffect, useMemo, useState } from 'react';
import { useSession } from '../app/session';
import { propose, type Proposal } from '../core/reconcile';
import { scoreDrill, type AnswerKey, type DrillScore } from '../core/score';
import { Button, LanternMark, RanOn } from '../ui/kit';
import { useLedgerEntries } from './Review';

/** Drill debrief: Rita's worklist against the answer key, and what the usual shortcuts would have done. */
export default function Result({ onBack }: { onBack: () => void }) {
  const s = useSession();
  const session = s.session!;
  const [key, setKey] = useState<AnswerKey | null>(null);
  const ledger = useLedgerEntries();
  useEffect(() => {
    void fetch('/fixtures/drill/answer-key.json')
      .then((r) => r.json())
      .then((k) => setKey(k as AnswerKey));
  }, []);

  const scores = useMemo(() => {
    if (!key) return null;
    const earlier = session.acts.filter((a) => session.earlierIds.includes(a.id));
    const later = session.acts.filter((a) => session.laterIds.includes(a.id));
    const asProposals = (d: Record<string, Proposal['disposition']>): Proposal[] =>
      session.acts.filter((a) => d[a.id]).map((a) => ({ actId: a.id, disposition: d[a.id]!, because: '', needsReview: false, group: 'copies' }));
    const latest: Proposal[] = [
      ...earlier.map((a) => ({ actId: a.id, disposition: { kind: 'excluded' as const, reason: 'replaced by the latest file' }, because: '', needsReview: false, group: 'copies' as const })),
      ...later.map((b) => ({ actId: b.id, disposition: { kind: 'approved' as const }, because: '', needsReview: false, group: 'copies' as const })),
    ];
    const exact = propose({ earlier, later, candidates: session.candidates.filter((c) => c.exact), identity: session.identity });
    return {
      you: scoreDrill(key, session.acts, asProposals(session.decisions), session.identity),
      latest: scoreDrill(key, session.acts, latest, []),
      exact: scoreDrill(key, session.acts, exact, session.identity),
    };
  }, [key, session]);

  const minutes = session.finishedAt ? Math.max(1, Math.round((session.finishedAt - session.startedAt) / 60000)) : null;
  const onDevice = ledger.filter((e) => e.inferenceSource === 'on_device').length;
  const inCloud = ledger.filter((e) => e.inferenceSource === 'in_cloud').length;

  return (
    <main className="mx-auto max-w-5xl px-5 pb-20 pt-8 sm:px-8">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <LanternMark />
          <span className="text-lg font-semibold">Lantern</span>
          <span className="ml-2 text-ink-soft">{session.title}</span>
        </div>
        <div className="flex gap-2">
          <Button tone="quiet" onClick={onBack}>
            Back to the worklist
          </Button>
          <Button tone="secondary" onClick={() => void s.reset()}>
            Run the drill again
          </Button>
        </div>
      </header>

      <h1 className="text-3xl font-semibold tracking-[-0.01em]">How the drill went</h1>
      {scores && (
        <>
          <p className="mt-3 max-w-[64ch] text-lg text-ink-soft">
            {minutes ? `You reconciled two versions of the night in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}. ` : ''}
            Here is your worklist against the answer key, next to the two shortcuts most people take.
          </p>
          <div className="mt-8 overflow-x-auto rounded-[3px] border border-rule-strong bg-sheet">
            <table className="w-full min-w-[680px] border-collapse text-left text-[15px]">
              <thead>
                <tr className="border-b border-rule-strong bg-paper text-sm text-ink-soft">
                  <th className="px-3 py-2 font-normal" />
                  <th className="px-3 py-2 font-normal">Your review with Lantern</th>
                  <th className="px-3 py-2 font-normal">Use the latest file</th>
                  <th className="px-3 py-2 font-normal">Merge identical rows</th>
                </tr>
              </thead>
              <tbody>
                <Row label="Acts entered (27 expected)" v={(x) => String(x.worklist.ready)} s={scores} good={(x) => x.worklist.ready === 27} />
                <Row label="Acts lost" v={(x) => String(x.actsLost.length)} s={scores} good={(x) => x.actsLost.length === 0} />
                <Row label="Acts entered twice" v={(x) => String(x.enteredTwice.length)} s={scores} good={(x) => x.enteredTwice.length === 0} />
                <Row label="Unclear entries entered as certain" v={(x) => String(x.ambiguousEntered.length)} s={scores} good={(x) => x.ambiguousEntered.length === 0} />
                <Row label="Documented corrections applied" v={(x) => x.amendmentsFound} s={scores} good={(x) => x.raw.amend === 3} />
                <Row label="Repeated doses wrongly merged" v={(x) => String(x.falseMerges.length)} s={scores} good={(x) => x.falseMerges.length === 0} />
                <Row label="Questions sent back to the ward" v={(x) => x.openQuestionsKept} s={scores} good={(x) => x.raw.open === 2} />
                <Row label="Patient identity problems caught" v={(x) => x.identityFound} s={scores} good={(x) => x.raw.idFound === 4} />
              </tbody>
            </table>
          </div>
          <ul className="mt-6 max-w-[70ch] list-disc space-y-1.5 pl-5 text-ink-soft">
            <li>Using the latest file loses the fall at 23:40 and the neuro observations that followed: they were deleted when the sheet was sorted.</li>
            <li>Merging identical rows still enters re-typed acts twice and misses that enoxaparin at 02:40 was not given.</li>
          </ul>
        </>
      )}

      <section className="mt-12 max-w-[70ch]" aria-labelledby="where">
        <h2 id="where" className="text-xl font-semibold">
          Where the AI ran
        </h2>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-ink-soft">
          <RanOn source="on_device" /> {onDevice} calls
          {inCloud > 0 && (
            <>
              <span className="mx-1" />
              <RanOn source="in_cloud" /> {inCloud} calls on synthetic drill rows, clinical text only
            </>
          )}
        </p>
        <p className="mt-2 text-ink-soft">
          Every decision above is yours; the models only proposed. The full audit trail has {session.audit.length} entries and stays in this browser.
        </p>
      </section>
    </main>
  );
}

function Row({ label, v, s, good }: { label: string; v: (x: DrillScore) => string; s: { you: DrillScore; latest: DrillScore; exact: DrillScore }; good: (x: DrillScore) => boolean }) {
  const cell = (x: DrillScore) => <td className={`px-3 py-2 tabular-nums ${good(x) ? '' : 'font-semibold text-pen'}`}>{v(x)}</td>;
  return (
    <tr className="border-b border-rule last:border-b-0">
      <th scope="row" className="px-3 py-2 font-normal">
        {label}
      </th>
      {cell(s.you)}
      {cell(s.latest)}
      {cell(s.exact)}
    </tr>
  );
}
