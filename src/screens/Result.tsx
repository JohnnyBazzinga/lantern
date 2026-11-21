import { useEffect, useMemo, useState } from 'react';
import { sessionTitle, useSession } from '../app/session';
import { propose, type Proposal } from '../core/reconcile';
import { keyIds, scoreDrill, type AnswerKey, type DrillScore } from '../core/score';
import { msgs } from '../i18n/lang';
import { LangToggle, useT } from '../i18n/react';
import { Button, LanternMark, RanOn } from '../ui/kit';
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
      withNurse: "Waiting for a nurse's answer (not a loss)",
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
    gNurse: 'Waiting for a nurse',
    gAmbiguous: 'Unclear entries put on the list as certain',
    allGood: 'Every act in the answer key is on your list once, or waiting for a nurse.',
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
      withNurse: 'À espera de resposta da enfermagem (não é uma perda)',
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
    gNurse: 'À espera da enfermagem',
    gAmbiguous: 'Atos ambíguos incluídos na lista como certos',
    allGood: 'Todos os atos das respostas certas estão na sua lista uma só vez, ou à espera da enfermagem.',
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

  return (
    <main className="mx-auto max-w-5xl px-5 pb-20 pt-8 sm:px-8">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <LanternMark />
          <span className="text-lg font-semibold">Lantern</span>
          <span className="ml-2 text-ink-soft">{sessionTitle(session.kind)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button tone="quiet" onClick={onBack}>
            {t.back}
          </Button>
          <Button tone="secondary" onClick={() => void s.reset()}>
            {t.again}
          </Button>
          <LangToggle className="ml-1" />
        </div>
      </header>

      <h1 className="text-3xl font-semibold tracking-[-0.01em]">{t.title}</h1>
      {scores && (
        <>
          <p className="mt-3 max-w-[64ch] text-lg text-ink-soft">
            {minutes ? t.minutes(minutes) : ''}
            {t.lede}
          </p>
          <div className="mt-8 overflow-x-auto rounded-[3px] border border-rule-strong bg-sheet">
            <table className="w-full min-w-[680px] border-collapse text-left text-[15px]">
              <thead>
                <tr className="border-b border-rule-strong bg-paper text-sm text-ink-soft">
                  <th className="px-3 py-2 font-normal" />
                  <th className="px-3 py-2 font-normal">{t.you}</th>
                  <th className="px-3 py-2 font-normal">{t.latest}</th>
                  <th className="px-3 py-2 font-normal">{t.exact}</th>
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
          <p className="mt-3 text-sm text-ink-soft">
            {t.ticks(Object.keys(session.entered).length)}
          </p>
          <Differences you={scores.you} />
          <ul className="mt-6 max-w-[70ch] list-disc space-y-1.5 pl-5 text-ink-soft">
            <li>{t.latestLoses}</li>
            <li>{t.exactMisses}</li>
          </ul>
        </>
      )}

      <section className="mt-12 max-w-[70ch]" aria-labelledby="where">
        <h2 id="where" className="text-xl font-semibold">
          {t.where}
        </h2>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-ink-soft">
          <RanOn source="on_device" /> {t.calls(onDevice)}
          {inCloud > 0 && (
            <>
              <span className="mx-1" />
              <RanOn source="in_cloud" /> {t.cloudCalls(inCloud)}
            </>
          )}
        </p>
        <p className="mt-2 text-ink-soft">
          {t.yours(session.audit.length)}
        </p>
      </section>
    </main>
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
  if (!groups.length) return <p className="mt-4 text-[15px] text-scrub">{t.allGood}</p>;
  return (
    <div className="mt-5 space-y-3">
      {groups.map((g) => (
        <div key={g.title}>
          <h3 className={`font-semibold ${g.tone}`}>{g.title}</h3>
          <ul className="mt-1 space-y-0.5 font-mono text-[14px]">
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
