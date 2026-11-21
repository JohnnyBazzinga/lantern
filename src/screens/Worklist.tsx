import { useMemo, useState } from 'react';
import { Copy, Download, Printer } from 'lucide-react';
import { useSession } from '../app/session';
import type { Entered } from '../app/store';
import { CATEGORY_LABEL } from '../core/clinical';
import type { Act } from '../core/types';
import { buildWorklist, defaultNightOf, formatDate, worklistCsv, type WorklistItem, type WorklistQuestion } from '../core/worklist';
import { AnswerBox } from '../ui/AnswerBox';
import { Button, LanternMark, Notice } from '../ui/kit';

/** Applies the reviewer's identity decisions ("use the census") to the acts before building the worklist. */
export function actsWithIdentity(acts: Act[], issues: { id: string; actIds: string[]; suggestion?: { patientName: string; patientId: string } }[], choices: Record<string, string>): Act[] {
  const override = new Map<string, { patientName: string; patientId: string }>();
  for (const i of issues) if (choices[i.id] === 'census' && i.suggestion) i.actIds.forEach((id) => override.set(id, i.suggestion!));
  return acts.map((a) => (override.has(a.id) ? { ...a, ...override.get(a.id)! } : a));
}

const groupBy = <T,>(xs: T[], key: (x: T) => string) => {
  const m = new Map<string, T[]>();
  for (const x of xs) m.set(key(x), [...(m.get(key(x)) ?? []), x]);
  return [...m.entries()];
};

export default function Worklist({ onBack, onResult }: { onBack: () => void; onResult: () => void }) {
  const s = useSession();
  const session = s.session!;
  const nightOf = session.nightOf ?? defaultNightOf(session.createdAt);
  const wl = useMemo(() => {
    const acts = actsWithIdentity(session.acts, session.identity, session.identityDecisions);
    return buildWorklist(acts, new Map(Object.entries(session.decisions)), { nightOf });
  }, [session, nightOf]);
  const [clearing, setClearing] = useState(false);
  const allowExport = s.config?.allowExport ?? true;

  const clerk = wl.ready.filter((r) => r.enteredBy.role === 'clerk');
  const nurses = groupBy(
    wl.ready.filter((r) => r.enteredBy.role === 'nurse'),
    (r) => r.enteredBy.who,
  );
  const entered = wl.ready.filter((r) => session.entered[r.actId]).length;
  const nextDay = formatDate(new Date(new Date(`${nightOf}T12:00`).getTime() + 86400_000).toISOString().slice(0, 10));

  const download = () => {
    const blob = new Blob([worklistCsv(wl, { drill: session.kind === 'drill' })], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${session.kind === 'drill' ? 'DRILL-' : ''}${wl.undecided.length ? 'INCOMPLETE-' : ''}re-entry-worklist-night-of-${nightOf}.csv`;
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
        <div className="flex flex-wrap items-center gap-2">
          <Button tone="quiet" onClick={onBack}>
            Back to the review
          </Button>
          <Button tone="secondary" onClick={() => setClearing(true)}>
            Finish and clear this PC
          </Button>
        </div>
      </header>

      {clearing && (
        <div className="no-print mb-8">
          <Notice tone="pen">
            This deletes the review, its decisions and answers from this browser, so the next person on this PC cannot open it. Downloaded
            files and printouts are not affected: delete or file them yourself.
            <span className="mt-3 flex flex-wrap gap-2">
              <Button tone="pen" onClick={() => void s.reset()}>
                Delete it from this PC
              </Button>
              <Button tone="quiet" onClick={() => setClearing(false)}>
                Cancel
              </Button>
            </span>
          </Notice>
        </div>
      )}

      <h1 className="text-3xl font-semibold tracking-[-0.01em]">Re-entry worklist</h1>
      <p className="mt-3 max-w-[68ch] text-lg text-ink-soft">
        {wl.ready.length} acts are ready, each once.{' '}
        {clerk.length > 0 && `${clerk.length} ${clerk.length === 1 ? 'is' : 'are'} for you (admissions and transfers). `}
        The rest go to the nurse who documented them, to enter as late entries.
        {wl.questions.length > 0 && ` ${wl.questions.length} ${wl.questions.length === 1 ? 'question needs' : 'questions need'} an answer first.`}{' '}
        Ready is not entered: tick each act once it is in the record.
      </p>

      <div className="no-print mt-5 flex flex-wrap items-end gap-x-6 gap-y-3 text-[15px]">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-soft">The outage night started on</span>
          <input
            type="date"
            value={nightOf}
            onChange={(e) => e.target.value && s.setNightOf(e.target.value)}
            className="rounded-md border border-rule-strong bg-sheet px-2 py-1"
          />
        </label>
        <span className="pb-1.5 text-sm text-ink-soft">
          Times from 12:00 are {formatDate(nightOf)}, times before 12:00 are {nextDay}.
        </span>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-soft">Your initials (recorded with each tick)</span>
          <input
            value={session.reviewer ?? ''}
            onChange={(e) => s.setReviewer(e.target.value)}
            className="w-28 rounded-md border border-rule-strong bg-sheet px-2 py-1 uppercase"
            maxLength={6}
          />
        </label>
      </div>

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
        {allowExport && (
          <>
            <Button onClick={download}>
              <Download size={16} /> Download as CSV
            </Button>
            <Button tone="secondary" onClick={() => window.print()}>
              <Printer size={16} /> Print
            </Button>
          </>
        )}
        {session.kind === 'drill' && wl.undecided.length === 0 && (
          <Button tone="secondary" onClick={() => { s.finish(); onResult(); }}>
            See how the drill went
          </Button>
        )}
        <span className="text-sm tabular-nums text-ink-soft">
          {entered} of {wl.ready.length} ticked as entered
        </span>
      </div>
      {allowExport && (
        <p className="no-print mt-2 max-w-[70ch] text-sm text-ink-faint">
          {session.kind === 'drill'
            ? 'The drill file is marked DRILL: fictional patients.'
            : 'The file and the printout carry patient names. The file goes to this PC’s Downloads folder: delete it, or file the printout, once re-entry is done.'}
        </p>
      )}

      {wl.questions.length > 0 && (
        <section className="mt-10" aria-labelledby="questions">
          <h2 id="questions" className="mb-1 text-xl font-semibold text-pen">
            Questions for the nurses
          </h2>
          <p className="mb-4 max-w-[68ch] text-ink-soft">
            One question per problem, with the rows it is about. Ask in person or by phone, or print this page to be answered and signed. Write the
            answer here, then decide the row in the review.
          </p>
          {groupBy(wl.questions, (q) => q.owner).map(([owner, qs]) => (
            <div key={owner} className="mb-6 break-inside-avoid">
              <h3 className="mb-2 border-b border-pen/40 pb-1 text-lg font-semibold">
                For {owner} ({qs.length})
              </h3>
              <ul className="space-y-3">
                {qs.map((q) => (
                  <QuestionCard key={q.ref} q={q} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {clerk.length > 0 && (
        <section className="mt-10" aria-labelledby="clerk">
          <h2 id="clerk" className="text-xl font-semibold">
            For you: admissions and transfers
          </h2>
          <p className="mb-3 max-w-[68ch] text-ink-soft">Administrative entries a clinical secretary makes, with the original time.</p>
          <ActsTable rows={clerk} />
        </section>
      )}

      {nurses.map(([who, rows]) => (
        <section key={who} className="mt-10 break-before-page" aria-label={`To be entered by ${who}`}>
          <h2 className="text-xl font-semibold">
            To be entered by {who}, as late entries ({rows.length})
          </h2>
          <p className="mb-3 max-w-[70ch] text-ink-soft">
            Clinical entries are made by the nurse who gave or saw the care, with the original date and time and a late-entry note, for example:{' '}
            <span className="font-mono text-[14px]">{rows[0]!.lateEntry}</span>
          </p>
          <ActsTable rows={rows} />
        </section>
      ))}

      <section className="mt-12 max-w-[72ch]" aria-labelledby="keep">
        <h2 id="keep" className="text-xl font-semibold">
          Keep with the record
        </h2>
        <p className="mt-1 text-ink-soft">
          The late entries point back to these copies. File or scan them, with the paper notes, as the original record of the downtime.
        </p>
        <ul className="mt-2 space-y-1 text-[15px]">
          {session.files.map((f) => (
            <li key={f.id}>
              <span className="font-mono">{f.name}</span> <span className="text-ink-soft">({f.versionLabel}, {f.rows.length} rows, fingerprint {f.hash.slice(0, 12)})</span>
            </li>
          ))}
        </ul>
      </section>

      <AuditTrail />
    </main>
  );
}

function QuestionCard({ q }: { q: WorklistQuestion }) {
  return (
    <li className="rounded-[3px] border border-pen/40 bg-sheet px-4 py-3">
      <p className="text-[15px]">
        <span className="font-semibold">{q.patientName || 'No name written'}</span>
        {q.patientId && <span className="ml-2 text-ink-soft">{q.patientId}</span>}
        {q.bed && <span className="ml-2 text-ink-soft">bed {q.bed}</span>}
        <span className="ml-2 text-ink-soft">{q.time ? `${formatDate(q.date)} ${q.time}` : 'no time written'}</span>
      </p>
      <ul className="mt-1.5 space-y-0.5">
        {q.rows.map((r) => (
          <li key={r.source} className="text-[15px]">
            <span className="font-mono">{r.text || '(blank)'}</span>
            {r.notes && <span className="font-mono text-ink-soft"> | {r.notes}</span>}
            <span className="ml-2 text-sm text-ink-faint">
              {r.source}
              {r.by && `, by ${r.by}`}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[15px] font-semibold">{q.question}</p>
      <AnswerBox refId={q.ref} owner={q.owner} />
      <p className="print-only mt-3 text-[14px]">Answer: ______________________________ Signed: ________ Time: ______</p>
    </li>
  );
}

function ActsTable({ rows }: { rows: WorklistItem[] }) {
  const s = useSession();
  const session = s.session!;
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <div className="space-y-6">
      {groupBy(rows, (r) => r.patientKey ?? r.patientName).map(([key, list]) => (
        <div key={key} className="break-inside-avoid">
          <h3 className="mb-1 flex flex-wrap items-baseline gap-x-3 border-b border-rule-strong pb-1">
            <span className="text-lg font-semibold">{list[0]!.patientName || 'No name'}</span>
            <span className="text-ink-soft">{list[0]!.patientId}</span>
            {list[0]!.bed && <span className="text-ink-soft">bed {list[0]!.bed}</span>}
          </h3>
          <table className="w-full border-collapse text-left">
            <tbody>
              {list.map((r) => {
                const tick = session.entered[r.actId] as Entered | boolean | undefined;
                return (
                  <tr key={r.actId} className="border-b border-rule align-top last:border-b-0">
                    <td className="w-10 py-2">
                      <input
                        type="checkbox"
                        aria-label={`Entered: ${r.act}`}
                        checked={!!tick}
                        onChange={() => s.toggleEntered(r.actId)}
                        className="h-4 w-4 accent-[var(--color-scrub)]"
                      />
                    </td>
                    <td className="w-32 py-2 font-mono text-[14px] tabular-nums">
                      {r.time ? (
                        <>
                          <span className="block text-ink-soft">{formatDate(r.date)}</span>
                          {r.time}
                        </>
                      ) : (
                        <span className="text-pen">no time</span>
                      )}
                    </td>
                    <td className="py-2">
                      <span className={`font-mono text-[15px] ${tick ? 'text-ink-faint line-through' : ''}`}>{r.act}</span>
                      {r.highAlert && <span className="ml-2 rounded-sm border border-pen/50 px-1 text-[12px] font-semibold text-pen">high-alert</span>}
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
                      {r.confirmBy && <span className="block text-sm font-semibold text-pen">{r.confirmBy} must confirm this correction: someone else wrote it on {r.confirmBy}’s word.</span>}
                      {r.note && <span className="block text-sm text-scrub">{r.note}</span>}
                      {r.clinicalPartBy && <span className="block text-sm text-ink-soft">The observations in this row are entered by {r.clinicalPartBy}.</span>}
                      {r.followUp && <span className="block text-sm font-semibold text-pen">{r.followUp}</span>}
                      {r.notes && <span className="block text-sm text-ink-soft">{r.notes}</span>}
                      {tick && typeof tick === 'object' && (
                        <span className="block text-sm text-scrub">
                          Ticked {new Date(tick.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {tick.by ? ` by ${tick.by}` : ''}
                        </span>
                      )}
                    </td>
                    <td className="w-28 py-2 text-sm text-ink-soft">{CATEGORY_LABEL[r.category]}</td>
                    <td className="w-44 py-2 text-right text-sm text-ink-faint">
                      {r.source}
                      <button
                        className="no-print mt-1 flex w-full items-center justify-end gap-1 text-ballpoint hover:underline"
                        onClick={() => {
                          void navigator.clipboard?.writeText(r.lateEntry).then(() => setCopied(r.actId));
                        }}
                      >
                        <Copy size={13} /> {copied === r.actId ? 'Copied' : 'Copy late-entry note'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function AuditTrail() {
  const session = useSession().session!;
  const download = () => {
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = ['Seq,When,Who,Action,Rows', ...session.audit.map((e) => [String(e.seq), e.at, e.actor, e.action, e.targetIds.join(' ')].map(esc).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv + '\n'], { type: 'text/csv;charset=utf-8' }));
    a.download = `${session.kind === 'drill' ? 'DRILL-' : ''}audit-trail-${session.createdAt.slice(0, 10)}.csv`;
    a.click();
  };
  return (
    <details className="no-print mt-12 max-w-[80ch]">
      <summary className="cursor-pointer text-xl font-semibold">Audit trail ({session.audit.length} entries)</summary>
      <p className="mt-2 text-ink-soft">
        Every decision, answer and tick, with time and initials, kept in this browser.{' '}
        <button className="text-ballpoint underline underline-offset-2" onClick={download}>
          Download it
        </button>
      </p>
      <ol className="mt-3 space-y-1 text-[14px]">
        {session.audit.map((e) => (
          <li key={e.seq} className="grid grid-cols-[5.5rem_7rem_1fr] gap-2">
            <span className="tabular-nums text-ink-faint">{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <span className="text-ink-soft">{e.actor}</span>
            <span>{e.action}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}
