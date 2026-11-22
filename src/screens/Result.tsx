import { useEffect, useMemo, useState } from 'react';
import { sessionTitle, useSession } from '../app/session';
import { propose, type Proposal } from '../core/reconcile';
import { keyIds, scoreDrill, type AnswerKey, type DrillScore } from '../core/score';
import { msgs } from '../i18n/lang';
import { useT } from '../i18n/react';
import { AppBar, Button, Route, StateGlyph, Steps, usePageTitle } from '../ui/kit';
import { Tally } from '../ui/Tally';
import { useLedgerEntries } from './Review';

const M = msgs(
  {
    back: 'Back to the worklist',
    again: 'Run the drill again',
    title: 'How the drill went',
    minutes: (m: number) => `You reconciled two versions of the night in ${m} ${m === 1 ? 'minute' : 'minutes'}. `,
    lede: 'Here is your worklist against the answer key, next to the two shortcuts most people take.',
    you: 'Your review with Lantern',
    latest: 'Use the latest file',
    exact: 'Merge identical rows',
    rows: {
      ready: 'Acts ready for re-entry (27 in the answer key)',
      withNurse: "Acts waiting for a nurse's answer (not lost)",
      lost: 'Acts lost',
      twice: 'Acts on the list twice',
      ambiguous: 'Unclear entries put on the list as certain',
      amend: 'Documented corrections applied or sent to the nurse',
      merges: 'Repeated doses wrongly merged',
      open: 'Questions sent back to the ward',
      identity: 'Patient identity problems caught',
    },
    ticks: (n: number) => `This compares decisions with the answer key. It does not count what is in the record: on the worklist you ticked ${n} acts as entered.`,
    latestLoses: 'Using the latest file loses the fall at 23:40 and the neuro observations that followed: they were deleted when the sheet was sorted.',
    exactMisses: 'Merging identical rows still enters re-typed acts twice and misses that enoxaparin at 02:40 was not given.',
    where: 'Where the AI ran',
    calls: (n: number) => `${n} calls`,
    cloudCalls: (n: number) => `${n} calls on synthetic drill rows, clinical text only`,
    yours: (n: number) => `Every decision above is yours; the models only proposed. The full audit trail has ${n} entries and stays in this browser.`,
    bed: (b: string) => `bed ${b}`,
    noTime: 'no time',
    gLost: 'Lost (not on the list, not asked)',
    gTwice: 'On the list twice',
    gNurse: "Waiting for a nurse's answer",
    gAmbiguous: 'Unclear entries put on the list as certain',
    allGood: "Every act in the answer key is on your list once, or waiting for a nurse's answer.",
    pageTitle: 'Result',
    hidden: 'What the two versions were hiding',
    traps: {
      amend: 'Three corrections, written into the later copy',
      lost: 'Three rows lost when the sheet was sorted',
      identity: 'Four patient-identity problems',
      open: 'Two entries only their author can explain',
      alike: 'Three pairs that look alike but are separate acts',
    },
    got: {
      amend: (x: string) => `${x} applied or sent to the nurse`,
      lost: (x: string) => `${x} kept on the list`,
      identity: (x: string) => `${x} flagged`,
      open: (x: string) => `${x} sent back to their author`,
      alike: (n: number) => (n ? `${n} merged into one` : 'none merged'),
    },
    three: (n: number) => `The ${n} acts of the night, three ways`,
    threeText: (n: number) => `Each bar is to the same scale. Left of the line: what became of the ${n} acts that really happened. Right of it: rows that would go into the record and should not.`,
    happened: (n: number) => `${n} acts happened`,
    seg: { once: 'on the list once', waiting: "waiting for a nurse's answer", lost: 'lost', unclear: 'unclear, listed as certain', twice: 'on the list twice' },
    numbers: 'In numbers',
    next: 'What next',
    nextText: 'The drill can be run again from the start, or open two versions of your own log from the start page: they stay on this PC.',
  },
  {
    back: 'Voltar à lista',
    again: 'Repetir o simulacro',
    title: 'Como correu o simulacro',
    minutes: (m) => `Conciliou duas versões da noite em ${m} ${m === 1 ? 'minuto' : 'minutos'}. `,
    lede: 'Aqui está a sua lista comparada com as respostas certas, ao lado dos dois atalhos que a maioria das pessoas segue.',
    you: 'A sua revisão com o Lantern',
    latest: 'Usar o ficheiro mais recente',
    exact: 'Juntar as linhas iguais',
    rows: {
      ready: 'Atos prontos a registar (27 nas respostas certas)',
      withNurse: 'Atos à espera de resposta da enfermagem (não é uma perda)',
      lost: 'Atos perdidos',
      twice: 'Atos que aparecem duas vezes na lista',
      ambiguous: 'Atos ambíguos incluídos na lista como certos',
      amend: 'Correções documentadas aplicadas ou enviadas à enfermagem',
      merges: 'Administrações distintas tratadas como uma só',
      open: 'Perguntas devolvidas à enfermaria',
      identity: 'Dúvidas de identificação detetadas',
    },
    ticks: (n) => `Isto compara as decisões com as respostas certas. Não conta o que está no sistema: na lista, marcou ${n} atos como registados.`,
    latestLoses: 'Usar o ficheiro mais recente perde a queda das 23:40 e a vigilância neurológica que se seguiu: foram apagadas quando a folha foi ordenada.',
    exactMisses: 'Juntar as linhas iguais continua a registar duas vezes os atos reescritos, e não vê que a enoxaparina das 02:40 não foi administrada.',
    where: 'Onde correu a IA',
    calls: (n) => `${n} pedidos`,
    cloudCalls: (n) => `${n} pedidos sobre linhas fictícias do simulacro, só com texto clínico`,
    yours: (n) => `Todas as decisões acima são suas; os modelos só propuseram. O registo de auditoria completo tem ${n} entradas e fica neste navegador.`,
    bed: (b) => `cama ${b}`,
    noTime: 'sem hora',
    gLost: 'Perdidos (nem na lista, nem perguntados)',
    gTwice: 'Duas vezes na lista',
    gNurse: 'À espera de resposta da enfermagem',
    gAmbiguous: 'Atos ambíguos incluídos na lista como certos',
    allGood: 'Todos os atos das respostas certas estão na sua lista uma só vez, ou à espera de resposta da enfermagem.',
    pageTitle: 'Resultado',
    hidden: 'O que as duas versões escondiam',
    traps: {
      amend: 'Três correções, escritas na cópia posterior',
      lost: 'Três linhas perdidas quando a folha foi ordenada',
      identity: 'Quatro dúvidas de identificação',
      open: 'Dois registos que só quem os escreveu pode explicar',
      alike: 'Três pares parecidos que são atos diferentes',
    },
    got: {
      amend: (x) => `${x} aplicadas ou enviadas à enfermagem`,
      lost: (x) => `${x} mantidas na lista`,
      identity: (x) => `${x} assinaladas`,
      open: (x) => `${x} devolvidos a quem os escreveu`,
      alike: (n) => (n ? `${n} ${n === 1 ? 'tratado' : 'tratados'} como um só` : 'nenhum tratado como um só'),
    },
    three: (n) => `Os ${n} atos da noite, de três maneiras`,
    threeText: (n) => `As barras estão à mesma escala. À esquerda da linha: o que aconteceu aos ${n} atos que existiram mesmo. À direita: linhas que iriam para o processo e não deviam.`,
    happened: (n) => `${n} atos aconteceram`,
    seg: { once: 'na lista uma vez', waiting: 'à espera de resposta da enfermagem', lost: 'perdidos', unclear: 'ambíguos, na lista como certos', twice: 'na lista duas vezes' },
    numbers: 'Em números',
    next: 'E agora',
    nextText: 'Pode repetir o simulacro desde o início, ou abrir duas versões da sua própria folha na página inicial: ficam neste computador.',
  },
);

/** Drill debrief: Rita's worklist against the answer key, and what the usual shortcuts would have done. */
export default function Result({ onBack }: { onBack: () => void }) {
  const s = useSession();
  const t = useT(M);
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
  usePageTitle(t.pageTitle);
  const total = key?.expected.worklist.approvedActs ?? 27;
  const h2 = 'text-[21px] font-extrabold tracking-[-0.01em] text-night';

  return (
    <div className="flex min-h-full flex-col">
      <AppBar title={sessionTitle(session.kind)} steps={<Steps current="after" onGo={{ worklist: onBack }} />}>
        <Tally kind={session.kind} />
      </AppBar>
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-16 pt-7 sm:px-8 sm:pt-10">
        <h1 className="font-display text-[34px] font-bold leading-[1.08] tracking-[-0.01em] text-night sm:text-[44px]">{t.title}</h1>
        {scores && (
          <>
            <p className="mt-3 max-w-[70ch] text-[19px] leading-[1.5] text-ink-soft">
              {minutes ? t.minutes(minutes) : ''}
              {t.lede}
            </p>

            {/* the reveal: what was hidden in the two files, and what became of each */}
            <section className="mt-9" aria-labelledby="hidden">
              <h2 id="hidden" className={h2}>
                {t.hidden}
              </h2>
              <ul className="mt-3 max-w-[60rem] border-y border-rule-strong">
                {(
                  [
                    ['amend', t.got.amend(scores.you.amendmentsFound), scores.you.raw.amend === 3],
                    ['lost', t.got.lost(scores.you.earlierOnlyKept), scores.you.actsLost.length === 0],
                    ['identity', t.got.identity(scores.you.identityFound), scores.you.raw.idFound === 4],
                    ['open', t.got.open(scores.you.openQuestionsKept), scores.you.raw.open === 2],
                    ['alike', t.got.alike(scores.you.falseMerges.length), scores.you.falseMerges.length === 0],
                  ] as const
                ).map(([k, got, ok]) => (
                  <li key={k} className="grid gap-x-6 border-b border-rule py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
                    <span className="text-[17px]">{t.traps[k]}</span>
                    <span className={`flex items-center gap-2 text-[17px] tabular-nums ${ok ? 'font-semibold' : 'font-semibold text-pen'}`}>
                      {ok && <StateGlyph state="done" />}
                      {got}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-10" aria-labelledby="three">
              <h2 id="three" className={h2}>
                {t.three(total)}
              </h2>
              <p className="mt-1 max-w-[80ch] text-[16px] text-ink-soft">{t.threeText(total)}</p>
              <Bars total={total} rows={[[t.you, scores.you], [t.latest, scores.latest], [t.exact, scores.exact]]} />
              <ul className="mt-4 max-w-[76ch] list-disc space-y-1.5 pl-5 text-[16px] text-ink-soft">
                <li>{t.latestLoses}</li>
                <li>{t.exactMisses}</li>
              </ul>
            </section>

            <section className="mt-10" aria-labelledby="numbers">
              <h2 id="numbers" className={h2}>
                {t.numbers}
              </h2>
              <div className="mt-3 overflow-x-auto border border-rule-strong bg-sheet">
                <table className="w-full min-w-[680px] border-collapse text-left text-[16px]">
                  <thead>
                    <tr className="border-b border-rule-strong bg-gutter text-[14px] text-ink-soft">
                      <th className="px-3 py-2 font-normal" />
                      <th className="border-l border-rule px-3 py-2 font-semibold text-ink">{t.you}</th>
                      <th className="border-l border-rule px-3 py-2 font-normal">{t.latest}</th>
                      <th className="border-l border-rule px-3 py-2 font-normal">{t.exact}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Row label={t.rows.ready} v={(x) => String(x.worklist.ready)} s={scores} good={(x) => x.worklist.ready + x.withNurse.length === 27} />
                    <Row label={t.rows.withNurse} v={(x) => String(x.withNurse.length)} s={scores} good={() => true} />
                    <Row label={t.rows.lost} v={(x) => String(x.actsLost.length)} s={scores} good={(x) => x.actsLost.length === 0} />
                    <Row label={t.rows.twice} v={(x) => String(x.enteredTwice.length)} s={scores} good={(x) => x.enteredTwice.length === 0} />
                    <Row label={t.rows.ambiguous} v={(x) => String(x.ambiguousEntered.length)} s={scores} good={(x) => x.ambiguousEntered.length === 0} />
                    <Row label={t.rows.amend} v={(x) => x.amendmentsFound} s={scores} good={(x) => x.raw.amend === 3} />
                    <Row label={t.rows.merges} v={(x) => String(x.falseMerges.length)} s={scores} good={(x) => x.falseMerges.length === 0} />
                    <Row label={t.rows.open} v={(x) => x.openQuestionsKept} s={scores} good={(x) => x.raw.open === 2} />
                    <Row label={t.rows.identity} v={(x) => x.identityFound} s={scores} good={(x) => x.raw.idFound === 4} />
                  </tbody>
                </table>
              </div>
              <p className="mt-2 max-w-[80ch] text-[15px] text-ink-soft">{t.ticks(Object.keys(session.entered).length)}</p>
              <Differences you={scores.you} />
            </section>
          </>
        )}

        <section className="mt-10 max-w-[76ch]" aria-labelledby="where">
          <h2 id="where" className={h2}>
            {t.where}
          </h2>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[16px] text-ink-soft">
            <Route source="on_device" muted={onDevice === 0} /> {t.calls(onDevice)}
            {inCloud > 0 && (
              <>
                <Route source="in_cloud" /> {t.cloudCalls(inCloud)}
              </>
            )}
          </p>
          <p className="mt-2 text-[16px] text-ink-soft">{t.yours(session.audit.length)}</p>
        </section>

        <section className="mt-10 max-w-[76ch] border-t border-rule-strong pt-7" aria-labelledby="next">
          <h2 id="next" className={h2}>
            {t.next}
          </h2>
          <p className="mt-1 text-[16px] text-ink-soft">{t.nextText}</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button onClick={() => void s.reset()}>{t.again}</Button>
            <Button tone="secondary" onClick={onBack}>
              {t.back}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

/**
 * Three ways of handling the same night, to one scale. Left of the line are the acts that really
 * happened and what became of each (on the list once, waiting for a nurse, or lost); right of it are
 * rows that would be entered and should not be. Every segment carries its number and its name, so
 * nothing depends on colour: ink is "on the list once", hatching is "waiting", an empty dashed box is
 * "lost", and red pen is what would be wrong in the record.
 */
function Bars({ total, rows }: { total: number; rows: [string, DrillScore][] }) {
  const t = useT(M);
  const parts = rows.map(([label, x]) => {
    const once = total - x.actsLost.length - x.withNurse.length;
    const unclear = x.ambiguousEntered.length;
    return { label, once, waiting: x.withNurse.length, lost: x.actsLost.length, unclear, twice: Math.max(0, x.worklist.ready - once - unclear) };
  });
  const span = total + Math.max(...parts.map((p) => p.unclear + p.twice), 1);
  const w = (n: number) => `${(100 * n) / span}%`;
  // the number is always on the segment; its name too where there is room, and always in the legend above
  const seg = (n: number, name: string, look: string, named = false, style?: React.CSSProperties) =>
    n > 0 && (
      <span title={`${n} ${name}`} className={`flex h-full min-w-[1.6rem] items-center justify-center overflow-hidden rounded-[4px] px-1 text-[15px] font-semibold tabular-nums sm:min-w-[2rem] ${named ? 'justify-start px-2' : ''} ${look}`} style={{ width: w(n), ...style }}>
        <span className="truncate">
          {n}
          {named && <span className="hidden font-normal sm:inline"> {name}</span>}
        </span>
      </span>
    );
  const key = (name: string, look: string, style?: React.CSSProperties) => (
    <li className="flex items-center gap-2">
      <span className={`h-4 w-6 shrink-0 rounded-[3px] ${look}`} style={style} aria-hidden /> {name}
    </li>
  );
  const hatch = { backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 5px, rgb(185 45 34 / 0.28) 5px 6.5px)' };
  return (
    <div className="mt-4 max-w-[72rem]">
      <ul className="mb-4 flex flex-wrap gap-x-6 gap-y-1.5 text-[15px] text-ink-soft">
        {key(t.seg.once, 'bg-night')}
        {key(t.seg.waiting, 'border border-pen bg-sheet', hatch)}
        {key(t.seg.lost, 'border border-dashed border-pen bg-sheet')}
        {key(`${t.seg.unclear}; ${t.seg.twice}`, 'bg-pen')}
      </ul>
      <div className="relative">
        <p className="mb-1 text-[14px] tabular-nums text-ink-soft" style={{ paddingLeft: `calc(${w(total)} - 4.5rem)` }}>
          {t.happened(total)}
        </p>
        <div className="space-y-4">
          {parts.map((p, i) => (
            <div key={p.label}>
              <p className={`mb-1 text-[16px] ${i === 0 ? 'font-semibold text-night' : 'text-ink-soft'}`}>{p.label}</p>
              <div className="flex h-10 gap-[2px]">
                {seg(p.once, t.seg.once, 'bg-night text-white', true)}
                {seg(p.waiting, t.seg.waiting, 'border border-pen bg-sheet text-ink', false, hatch)}
                {seg(p.lost, t.seg.lost, 'border border-dashed border-pen bg-sheet text-pen')}
                {seg(p.unclear, t.seg.unclear, 'bg-pen text-white')}
                {seg(p.twice, t.seg.twice, 'bg-pen text-white', true)}
              </div>
            </div>
          ))}
        </div>
        {/* the line every bar is read against: the acts that really happened */}
        <span className="pointer-events-none absolute bottom-0 top-6 w-0 border-l-2 border-night" style={{ left: w(total) }} aria-hidden />
      </div>
    </div>
  );
}

/** Item by item: what differed from the answer key, so the reviewer can learn from it or disagree with the key. */
function Differences({ you }: { you: DrillScore }) {
  const s = useSession();
  const t = useT(M);
  const session = s.session!;
  const [key, setKey] = useState<AnswerKey | null>(null);
  useEffect(() => {
    void fetch('/fixtures/drill/answer-key.json').then((r) => r.json()).then((k) => setKey(k as AnswerKey));
  }, []);
  if (!key) return null;
  const ids = keyIds(key, session.acts);
  const actFor = (keyRow: string) => session.acts.find((a) => ids.get(a.id) === keyRow);
  const line = (keyRow: string) => {
    const a = actFor(keyRow);
    return a ? `${a.patientName || t.bed(a.bed)}, ${a.eventTime || t.noTime}: ${a.actText}` : keyRow;
  };
  const groups = [
    { title: t.gLost, rows: you.actsLost, tone: 'text-pen' },
    { title: t.gTwice, rows: you.enteredTwice, tone: 'text-pen' },
    { title: t.gNurse, rows: you.withNurse, tone: 'text-ink-soft' },
    { title: t.gAmbiguous, rows: you.ambiguousEntered, tone: 'text-pen' },
  ].filter((g) => g.rows.length);
  if (!groups.length) return <p className="mt-4 text-[16px] font-semibold">{t.allGood}</p>;
  return (
    <div className="mt-5 space-y-3">
      {groups.map((g) => (
        <div key={g.title}>
          <h3 className={`font-semibold ${g.tone}`}>{g.title}</h3>
          <ul className="mt-1 space-y-0.5 font-mono text-[15px] tracking-[-0.015em]">
            {g.rows.map((r) => (
              <li key={r}>{line(r)}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Row({ label, v, s, good }: { label: string; v: (x: DrillScore) => string; s: { you: DrillScore; latest: DrillScore; exact: DrillScore }; good: (x: DrillScore) => boolean }) {
  const cell = (x: DrillScore) => <td className={`border-l border-rule px-3 py-2 tabular-nums ${good(x) ? '' : 'font-semibold text-pen'}`}>{v(x)}</td>;
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
