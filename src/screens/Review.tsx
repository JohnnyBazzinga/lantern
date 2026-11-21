import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { subscribeLedger, type LedgerEntry } from '../ai/ledger';
import { GROUP_COPY, isDecided, suggested, type ReviewItem } from '../app/review';
import { useSession } from '../app/session';
import { GROUP_ORDER, guard, type ReviewGroup } from '../core/reconcile';
import type { Act, Disposition, IdentityIssue, Judgment, MatchCandidate, Relation } from '../core/types';
import { Button, LanternMark, Meter, Notice, RanOn } from '../ui/kit';
import { PatientLine, Slip } from '../ui/Slip';
import { versionName } from './Sources';

const RELATION_TEXT: Record<Relation, string> = {
  same: 'the same act, written twice',
  amendment: 'the same act, corrected',
  separate: 'two different acts',
  insufficient: 'not sure: not enough detail to link them',
};

export function useLedgerEntries(): LedgerEntry[] {
  const [es, setEs] = useState<LedgerEntry[]>([]);
  useEffect(() => subscribeLedger(setEs), []);
  return es;
}

export default function Review({ onWorklist }: { onWorklist: () => void }) {
  const s = useSession();
  const session = s.session!;
  const [activeId, setActiveId] = useState<string | null>(null);
  const items = s.items;
  const active = items.find((i) => i.id === activeId) ?? items.find((i) => !isDecided(i, session.decisions)) ?? items[0];
  const undecided = items.filter((i) => !isDecided(i, session.decisions));

  const next = (from: ReviewItem) => {
    const idx = items.findIndex((i) => i.id === from.id);
    const after = [...items.slice(idx + 1), ...items.slice(0, idx)].find((i) => !isDecided(i, { ...session.decisions }) && i.id !== from.id);
    setActiveId(after?.id ?? from.id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!active || (e.target as HTMLElement).closest('input,select,textarea')) return;
      const idx = items.findIndex((i) => i.id === active.id);
      if (e.key === 'ArrowDown' || e.key === 'j') setActiveId(items[Math.min(idx + 1, items.length - 1)]?.id ?? null);
      if (e.key === 'ArrowUp' || e.key === 'k') setActiveId(items[Math.max(idx - 1, 0)]?.id ?? null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, items]);

  return (
    <div className="flex min-h-full flex-col">
      <ReviewHeader onWorklist={onWorklist} />
      {session.kind === 'drill' && s.escalated.size > 0 && !session.cloudAsked && <CloudOffer />}
      <div className="mx-auto grid w-full max-w-[1400px] flex-1 gap-0 lg:grid-cols-[340px_1fr]">
        <Queue items={items} active={active} onPick={setActiveId} />
        <main className="min-w-0 border-rule px-5 py-6 sm:px-8 lg:border-l">
          {active ? <ItemView key={active.id} item={active} onDone={() => next(active)} /> : <p>Nothing to review.</p>}
          {undecided.length === 0 && (
            <div className="mt-10">
              <Notice tone="scrub">
                Every row has a decision. <Button className="ml-2" onClick={onWorklist}>Open the re-entry worklist</Button>
              </Notice>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ReviewHeader({ onWorklist }: { onWorklist: () => void }) {
  const s = useSession();
  const session = s.session!;
  const ledger = useLedgerEntries();
  const cloudCalls = ledger.filter((e) => e.inferenceSource === 'in_cloud');
  const sentRows = new Set(cloudCalls.flatMap((e) => e.outgoingRefs.filter((r) => r.includes(':')))).size;
  const deviceCalls = ledger.filter((e) => e.inferenceSource === 'on_device').length;
  return (
    <header className="sticky top-0 z-20 border-b border-rule bg-paper/95 backdrop-blur-[2px]">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3 sm:px-8">
        <div className="flex items-center gap-2">
          <LanternMark />
          <span className="font-semibold">Lantern</span>
          <span className="ml-2 text-ink-soft">{session.title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Meter done={s.decidedCount} total={session.acts.length} />
          <span className="text-sm text-ink-soft" title="Measured from the requests this page made">
            {session.kind === 'import' ? (
              <>Patient data sent anywhere: <strong className="text-scrub">none</strong></>
            ) : (
              <>
                {deviceCalls} comparisons on this device{cloudCalls.length ? `, ${sentRows} synthetic rows sent to the cloud` : ', nothing sent'}
              </>
            )}
          </span>
          <Button tone="secondary" onClick={onWorklist}>
            Worklist
          </Button>
        </div>
      </div>
    </header>
  );
}

function Queue({ items, active, onPick }: { items: ReviewItem[]; active?: ReviewItem; onPick: (id: string) => void }) {
  const s = useSession();
  const session = s.session!;
  const groups = GROUP_ORDER.map((g) => ({ g, list: items.filter((i) => i.group === g) })).filter((x) => x.list.length);
  return (
    <nav aria-label="Review queue" className="border-b border-rule px-5 py-6 sm:px-8 lg:sticky lg:top-[57px] lg:h-[calc(100vh-57px)] lg:overflow-y-auto lg:border-b-0 lg:px-5">
      <p className="mb-4 text-sm text-ink-soft">Most urgent first. Use ↑ ↓ to move.</p>
      {groups.map(({ g, list }) => {
        const done = list.filter((i) => isDecided(i, session.decisions)).length;
        return (
          <section key={g} className="mb-6">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">{GROUP_COPY[g].title}</h2>
              <span className="text-sm tabular-nums text-ink-faint">
                {done}/{list.length}
              </span>
            </div>
            {g === 'copies' && done < list.length && (
              <button className="mb-1 text-sm text-ballpoint underline underline-offset-2" onClick={() => s.acceptGroup('copies')}>
                Keep one of each identical pair ({list.length - done})
              </button>
            )}
            <ul>
              {list.map((i) => {
                const act = s.actsById.get(i.a ?? i.act ?? '')!;
                const decided = isDecided(i, session.decisions);
                const isActive = active?.id === i.id;
                return (
                  <li key={i.id}>
                    <button
                      onClick={() => onPick(i.id)}
                      aria-current={isActive}
                      className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-[15px] ${isActive ? 'bg-sheet shadow-[inset_3px_0_0_var(--color-ink)]' : 'hover:bg-sheet/70'}`}
                    >
                      <span className={`mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-full border ${decided ? 'border-scrub bg-scrub text-white' : 'border-rule-strong'}`}>
                        {decided && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{act.patientName || `Bed ${act.bed || '?'}`}</span>
                        <span className="block truncate text-sm text-ink-soft">
                          {act.eventTime || 'no time'} {act.actText}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </nav>
  );
}

function ItemView({ item, onDone }: { item: ReviewItem; onDone: () => void }) {
  const s = useSession();
  const session = s.session!;
  const a = s.actsById.get(item.a ?? item.act ?? '')!;
  const b = item.b ? s.actsById.get(item.b) : undefined;
  const fileOf = (act: Act) => session.files.find((f) => f.id === act.fileId);
  const candidate = item.kind === 'pair' ? session.candidates.find((c) => c.a === item.a && c.b === item.b) : undefined;
  const decided = isDecided(item, session.decisions);
  const identityOpen = item.identity.filter((i) => !session.identityDecisions[i.id]);
  const override = item.identity.find((i) => session.identityDecisions[i.id] === 'census')?.suggestion;
  const copy = GROUP_COPY[item.group];

  const decide = (d: Record<string, Disposition>, label: string) => {
    s.decide(item, d, label);
    onDone();
  };

  return (
    <article aria-labelledby="item-title">
      <p className="text-sm text-ink-soft">
        {copy.title}. {copy.hint}.
      </p>
      <div id="item-title" className="mt-1">
        <PatientLine act={a} override={override} />
      </div>

      {item.identity.map((issue) => (
        <IdentityBox key={issue.id} issue={issue} />
      ))}

      <div className={`mt-6 flex flex-col gap-5 ${b ? 'xl:flex-row' : ''}`}>
        <Slip act={a} other={b} file={fileOf(a)} label={b ? versionName(fileOf(a)!, session.kind) : versionName(fileOf(a)!, session.kind)} />
        {b && <Slip act={b} other={a} file={fileOf(b)} label={versionName(fileOf(b)!, session.kind)} />}
      </div>

      <MarginNotes item={item} candidate={candidate} a={a} b={b} />

      <div className="mt-7 border-t border-rule pt-5">
        {decided && <CurrentDecision item={item} />}
        {identityOpen.length > 0 ? (
          <p className="text-[15px] text-pen">Settle the patient identity above first.</p>
        ) : (
          <Actions item={item} a={a} b={b} decided={decided} onDecide={decide} />
        )}
      </div>
    </article>
  );
}

function IdentityBox({ issue }: { issue: IdentityIssue }) {
  const s = useSession();
  const choice = s.session!.identityDecisions[issue.id];
  const title = {
    'name-variant': 'The name is spelled differently',
    'id-mismatch': 'The hospital number does not match the census',
    'id-name-conflict': 'This hospital number belongs to someone else',
    'not-in-census': 'This patient is not on the 21:00 census',
    'no-identity': 'There is no name or hospital number',
  }[issue.kind];
  return (
    <div className="mt-5 rounded-md border border-pen/40 bg-pen-wash px-4 py-3">
      <p className="font-semibold text-pen">{title}</p>
      <p className="mt-0.5 text-[15px]">{issue.detail}</p>
      {choice ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-scrub">
          <Check size={15} /> Settled: {choice === 'census' ? 'use the census identity' : choice === 'as-written' ? 'keep as written' : 'sent to the nurse'}.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {issue.suggestion && (
            <Button onClick={() => s.decideIdentity(issue.id, 'census')}>
              Use the census: {issue.suggestion.patientName}, {issue.suggestion.patientId}
            </Button>
          )}
          {issue.kind === 'not-in-census' && (
            <Button onClick={() => s.decideIdentity(issue.id, 'as-written')}>New admission: keep as written</Button>
          )}
          {issue.kind !== 'not-in-census' && issue.kind !== 'no-identity' && (
            <Button tone="secondary" onClick={() => s.decideIdentity(issue.id, 'as-written')}>
              Keep as written
            </Button>
          )}
          <Button tone="pen" onClick={() => s.decideIdentity(issue.id, 'ask')}>
            Ask the nurse
          </Button>
        </div>
      )}
    </div>
  );
}

function MarginNotes({ item, candidate, a, b }: { item: ReviewItem; candidate?: MatchCandidate; a: Act; b?: Act }) {
  const s = useSession();
  const reasons = candidate ? s.escalated.get(candidate.id) : undefined;
  const note = (j: Judgment | undefined, who: 'on_device' | 'in_cloud') => {
    if (!j || !b) return null;
    const g = guard(j.relation, a, b);
    return (
      <li className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
        <RanOn source={j.source === 'rule' ? 'rule' : who} />
        <span>
          {who === 'on_device' ? 'Gemini Nano' : 'Gemini (second opinion)'} reads these as <strong className="font-semibold">{RELATION_TEXT[j.relation]}</strong>
          {j.evidence && <span className="text-ink-soft">, because of “{j.evidence}”</span>}.
          {g.relation !== j.relation && (
            <span className="mt-1 block text-ink-soft">
              <RanOn source="rule" /> Lantern overrides this: {g.rule}.
            </span>
          )}
        </span>
      </li>
    );
  };
  const because = item.proposals.map((p) => p.because).filter((x, i, arr) => x && arr.indexOf(x) === i);
  return (
    <aside className="mt-6" aria-label="Why Lantern suggests this">
      <ul className="space-y-2.5 text-[15px]">
        {candidate?.exact && (
          <li className="flex items-start gap-3">
            <RanOn source="rule" /> <span>Identical text, time and patient in both files.</span>
          </li>
        )}
        {note(candidate?.local, 'on_device')}
        {note(candidate?.cloud, 'in_cloud')}
        {because.map((t) => (
          <li key={t} className="text-ink-soft">
            {t}
          </li>
        ))}
        {reasons && !candidate?.cloud && (
          <li className="text-ink-soft">Disputed: {reasons.map((r) => REASON_TEXT[r] ?? r).join('; ')}.</li>
        )}
      </ul>
    </aside>
  );
}

const REASON_TEXT: Record<string, string> = {
  'rule-override': "the model and Lantern's rules disagree",
  'competing-match': 'another row could be the same act',
  'numbers-differ': 'the numbers in the two rows differ',
  abstained: 'the model was not sure',
  'local-unavailable': 'no on-device model was available',
};

function CurrentDecision({ item }: { item: ReviewItem }) {
  const s = useSession();
  const d = item.actIds.map((id) => s.session!.decisions[id]);
  const text = d
    .map((x) =>
      !x
        ? ''
        : x.kind === 'approved'
          ? 'kept'
          : x.kind === 'corrected'
            ? 'kept with the correction'
            : x.kind === 'duplicate'
              ? 'marked as a copy'
              : x.kind === 'unresolved'
                ? `sent to ${x.owner}`
                : `left out (${x.reason})`,
    )
    .filter(Boolean);
  return (
    <p className="mb-3 flex items-center gap-2 text-[15px] text-scrub">
      <Check size={16} /> Decided: {item.kind === 'pair' ? `earlier row ${text[0]}, later row ${text[1]}` : text[0]}. You can change it below.
    </p>
  );
}

function Actions({ item, a, b, decided, onDecide }: { item: ReviewItem; a: Act; b?: Act; decided: boolean; onDecide: (d: Record<string, Disposition>, label: string) => void }) {
  const decisions = useSession().session!.decisions;
  const ask = (ids: string[], question: string): Record<string, Disposition> =>
    Object.fromEntries(ids.map((id) => [id, { kind: 'unresolved', owner: (b ?? a).documentedBy ? `documenting clinician (${(b ?? a).documentedBy})` : 'nurse in charge', question }]));
  const sug = suggested(item);
  const options: { label: string; d: Record<string, Disposition>; suggested?: boolean; tone?: 'primary' | 'secondary' | 'pen' }[] = [];
  const isSug = (d: Record<string, Disposition>) => JSON.stringify(d) === JSON.stringify(sug);

  if (item.kind === 'pair' && b) {
    const pa = item.proposals.find((p) => p.actId === a.id)?.disposition;
    if (item.group === 'changed' || pa?.kind === 'corrected') {
      options.push({ label: 'Apply the correction', d: sug });
      options.push({ label: 'Keep the original', d: { [a.id]: { kind: 'approved' }, [b.id]: { kind: 'excluded', reason: 'correction not accepted by the reviewer' } } });
    } else {
      options.push({ label: 'Same act: keep one', d: { [a.id]: { kind: 'approved' }, [b.id]: { kind: 'duplicate', of: a.id } } });
    }
    options.push({ label: 'Two different acts: keep both', d: { [a.id]: pa?.kind === 'corrected' ? { kind: 'approved' } : (sug[a.id] ?? { kind: 'approved' }), [b.id]: { kind: 'approved' } } });
    options.push({ label: 'Ask the nurse', d: ask([a.id, b.id], 'Are these the same act?'), tone: 'pen' });
  } else {
    const p = item.proposals[0];
    if (item.group === 'open' || p?.disposition.kind === 'unresolved') {
      const q = p?.disposition.kind === 'unresolved' ? p.disposition.question : 'Please confirm this entry';
      options.push({ label: 'Ask the nurse', d: ask([a.id], q), tone: 'pen' });
      options.push({ label: 'Keep it as written', d: { [a.id]: { kind: 'approved' } } });
    } else {
      options.push({ label: 'Keep it', d: { [a.id]: { kind: 'approved' } } });
      options.push({ label: 'Ask the nurse', d: ask([a.id], item.group === 'only-earlier' ? 'This act is missing from the later version. Was it removed on purpose?' : 'Please confirm this entry'), tone: 'pen' });
    }
    options.push({
      label: item.group === 'only-earlier' ? 'It was removed on purpose' : 'Not a real act: leave out',
      d: { [a.id]: { kind: 'excluded', reason: item.group === 'only-earlier' ? 'removed on purpose in the later version' : 'not a real act (reviewer)' } },
      tone: 'secondary',
    });
  }
  options.forEach((o) => (o.suggested = isSug(o.d)));
  const current = JSON.stringify(Object.fromEntries(item.actIds.map((id) => [id, decisions[id]])));

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {options.map((o) => (
        <Button
          key={o.label}
          tone={o.tone === 'pen' ? 'pen' : o.suggested && !decided ? 'primary' : 'secondary'}
          onClick={() => onDecide(o.d, `${o.label} (${item.id})`)}
          aria-pressed={decided && current === JSON.stringify(o.d)}
        >
          {decided && current === JSON.stringify(o.d) && <Check size={16} />}
          {o.label}
          {o.suggested && <span className="font-normal opacity-75">(suggested)</span>}
        </Button>
      ))}
      <span className="ml-1 hidden items-center text-sm text-ink-faint sm:flex">
        <ChevronRight size={14} /> moves to the next row
      </span>
    </div>
  );
}

function CloudOffer() {
  const s = useSession();
  const [show, setShow] = useState(false);
  const preview = useMemo(() => (show ? s.previewCloud() : []), [show, s]);
  if (!s.cloudEligible) return null;
  const n = s.escalated.size;
  return (
    <div className="border-b border-rule bg-ballpoint-wash/60">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-5 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[80ch] text-[15px]">
            <strong className="font-semibold">{n} comparisons are disputed</strong>: the on-device model and Lantern&apos;s rules disagreed, or two rows
            compete for the same act. Because this is the synthetic drill, you can ask a larger model in the cloud for a second opinion. It
            receives clinical text only: no names, hospital numbers or beds.
          </p>
          <div className="flex gap-2">
            <Button tone="secondary" onClick={() => setShow((v) => !v)}>
              {show ? 'Hide' : 'Show'} what will be sent
            </Button>
            <Button onClick={() => void s.askCloud()} disabled={!!s.busy}>
              Ask the cloud
            </Button>
          </div>
        </div>
        {show && (
          <ol className="max-h-72 space-y-3 overflow-y-auto">
            {preview.map((p) => (
              <li key={p.candidateId} className="rounded-[3px] border border-rule bg-sheet p-3">
                <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-ink-soft">{p.prompt}</pre>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

export type { ReviewGroup };
