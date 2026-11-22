import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { subscribeLedger, type LedgerEntry } from '../ai/ledger';
import { groupCopy, isDecided, suggested, type ReviewItem } from '../app/review';
import { sessionTitle, useSession } from '../app/session';
import { isHighAlert, ownerOf, relayedFrom } from '../core/clinical';
import { doseStatus, drugName, sameDrugRows, type DoseStatus } from '../core/drugs';
import { identityDetail } from '../core/identity';
import { pairQuestion, singleQuestion } from '../core/questions';
import { GROUP_ORDER, guard, rowRef, ruleVerdict, type EscalationReason, type ReviewGroup } from '../core/reconcile';
import { errorProneAbbreviations } from '../core/text';
import { AnswerBox } from '../ui/AnswerBox';
import type { Act, Disposition, IdentityIssue, Judgment, MatchCandidate, Relation } from '../core/types';
import { Button, LanternMark, Meter, Notice, RanOn } from '../ui/kit';
import { PatientLine, Slip } from '../ui/Slip';
import { msgs } from '../i18n/lang';
import { LangToggle, useT } from '../i18n/react';
import { versionName } from './Sources';

const M = msgs(
  {
    relation: {
      same: 'the same act, written twice',
      amendment: 'the same act, corrected',
      separate: 'two different acts',
      insufficient: 'not sure: not enough detail to link them',
    } as Record<Relation, string>,
    reason: {
      'rule-override': "the model and Lantern's rules disagree",
      'competing-match': 'another row could be the same act',
      'numbers-differ': 'the numbers in the two rows differ',
      abstained: 'the model was not sure',
      'local-unavailable': 'no AI model judged this pair',
    } as Record<EscalationReason, string>,
    nothing: 'Nothing to review.',
    allDecided: 'Every row has a decision.',
    openWorklist: 'Open the re-entry worklist',
    countedFrom: 'Counted from the requests this page made',
    sentNone: (
      <>
        Patient data sent anywhere: <strong className="text-scrub">none</strong>
      </>
    ),
    cloudOnly: (n: number) => `No on-device model on this PC: the drill's AI ran in the cloud on ${n} fictional rows`,
    deviceCalls: (n: number, sent: number | null) => `${n} AI calls on this device${sent !== null ? `, ${sent} fictional rows sent to the cloud` : ', nothing sent'}`,
    worklist: 'Worklist',
    queue: 'Review queue',
    queueHint: 'Most urgent first. Use ↑ ↓ to move.',
    keepCopies: (n: number) => `Keep one of each identical pair (${n})`,
    bed: (b: string) => `Bed ${b || '?'}`,
    noTime: 'no time',
    highAlert: 'High-alert medicine: check dose and status',
    identityFirst: 'Settle the patient identity above first.',
    waitingRows: (owner: string) =>
      `These rows wait for ${owner} to confirm the patient. The question is on the worklist; once you have the answer, settle the identity above.`,
    identityTitle: {
      'name-variant': 'The name is spelled differently',
      'id-mismatch': 'The hospital number does not match the census',
      'id-name-conflict': 'This hospital number belongs to someone else',
      'not-in-census': 'This patient is not on the census',
      'no-identity': 'There is no name or hospital number',
    } as Record<IdentityIssue['kind'], string>,
    useCensus: (name: string, id: string) => `Use the census: ${name}, ${id}`,
    newAdmission: 'New admission: confirm and keep as written',
    asWritten: 'Keep as written',
    ask: (owner: string) => `Ask ${owner}`,
    waitingIdentity: (owner: string) => `Waiting for ${owner} to confirm the patient. Nothing for this patient row goes on the list until then.`,
    settled: (census: boolean) => `Settled: ${census ? 'use the census identity' : 'keep as written'}.`,
    onlyEarlier: (n: string) => `${n} only in the earlier copy`,
    onlyLater: (n: string) => `${n} only in the later copy`,
    whoDevice: 'Gemini Nano, on this device,',
    whoSecond: 'Gemini in the cloud (second opinion)',
    whoCloud: 'Gemini in the cloud (no on-device model on this PC)',
    reads: 'reads these as',
    because: (e: string) => `, because of “${e}”`,
    overrides: (rule: string) => `Lantern overrides this: ${rule}.`,
    why: 'Why Lantern suggests this',
    identical: 'Identical text, time and patient in both files.',
    rulesOnly: (rule: string) => `No AI judged this pair. Lantern's rules: ${rule}.`,
    relayed: (by: string, x: string) => `${by || 'Someone'} wrote this correction on ${x}'s word. ${x} must confirm it: it changes ${x}'s record.`,
    noTimeCopy: (earlier: boolean) => `${earlier ? 'The earlier' : 'The later'} copy has no time.`,
    undecidable: "No AI judged this pair and Lantern's rules cannot decide it: compare the two rows, or ask the nurse.",
    disputed: (list: string) => `Disputed: ${list}.`,
    numbersDiffer: (d: string) => `the numbers differ (${d})`,
    kept: 'kept',
    keptNote: (note: string) => `kept (${note})`,
    keptCorrected: 'kept with the correction',
    copy: 'marked as a copy',
    waiting: (owner: string) => `waiting for ${owner}'s answer`,
    leftOut: (reason: string) => `left out (${reason})`,
    decidedPair: (a: string, b: string) => `earlier row ${a}, later row ${b}`,
    decidedOne: (a: string) => a,
    decided: (what: string) => `Decided: ${what}. You can change it below.`,
    confirmBoth: 'Both rows stay on the list. If they are one dose written twice, it would be entered twice in the record.',
    useCorrected: (row: string) => `Use the corrected version (${row})`,
    keepOriginal: (row: string) => `Keep the original (${row})`,
    notAccepted: 'correction not accepted by the reviewer',
    sameKeep: (row: string) => `Same act: keep ${row}`,
    drops: (row: string, words: string) => `Keeping ${row} drops “${words}”, which only the later copy has.`,
    keepBoth: 'Two different acts: keep both',
    enterWith: (owner: string) => `Enter it with ${owner}'s answer`,
    clarified: (owner: string, answer: string) => `clarified by ${owner}: ${answer}`,
    keepIt: 'Keep it',
    removed: 'It was removed on purpose',
    doNotEnter: 'Do not enter it',
    removedReason: 'removed on purpose in the later version',
    notEnteredAnswer: (owner: string, answer: string) => `not entered: ${owner} answered “${answer}”`,
    notEntered: 'not entered (reviewer)',
    yesBoth: 'Yes, keep both',
    cancel: 'Cancel',
    confirmed: (label: string) => `${label}, confirmed`,
    suggested: '(suggested)',
    next: 'moves to the next row',
    disputedTitle: (n: number) => `${n} ${n === 1 ? 'comparison is' : 'comparisons are'} disputed`,
    disputedText:
      ": the first AI opinion and Lantern's rules disagreed, or two rows compete for the same act. Because this is the fictional drill, you can ask a larger model in the cloud for a second opinion. It receives the clinical text of those rows as written, without the name, hospital number and bed columns.",
    showSent: (show: boolean) => `${show ? 'Hide' : 'Show'} what will be sent`,
    askCloud: 'Ask the cloud',
    strip: (drug: string) => `${drug} for this patient: every row in both files`,
    stripHint: 'Earliest first. Rows with no time come last.',
    inThis: 'in this comparison',
    maybe: (drug: string) => `may be ${drug}: an error-prone abbreviation, never interpreted`,
    dose: {
      listed: 'on the list',
      copy: 'marked as a copy',
      waiting: 'waiting for an answer',
      'left-out': 'left out',
      open: 'not decided yet',
    } as Record<DoseStatus, string>,
    controlled: (drug: string) =>
      `Controlled drug (${drug}): whoever enters these doses should check them against the ward's controlled-drug register first.`,
  },
  {
    relation: {
      same: 'o mesmo ato, escrito duas vezes',
      amendment: 'o mesmo ato, corrigido',
      separate: 'dois atos diferentes',
      insufficient: 'sem certeza: não há detalhe suficiente para as ligar',
    },
    reason: {
      'rule-override': 'o modelo e as regras do Lantern não concordam',
      'competing-match': 'outra linha pode ser o mesmo ato',
      'numbers-differ': 'os números das duas linhas são diferentes',
      abstained: 'o modelo não tinha a certeza',
      'local-unavailable': 'nenhum modelo de IA avaliou este par',
    },
    nothing: 'Nada para rever.',
    allDecided: 'Todas as linhas têm uma decisão.',
    openWorklist: 'Abrir a lista para registo',
    countedFrom: 'Contado a partir dos pedidos que esta página fez',
    sentNone: (
      <>
        Dados de doentes enviados para fora: <strong className="text-scrub">nenhum</strong>
      </>
    ),
    cloudOnly: (n) => `Sem modelo local neste computador: a IA do simulacro correu na nuvem, sobre ${n} linhas fictícias`,
    deviceCalls: (n, sent) => `${n} pedidos à IA neste computador${sent !== null ? `, ${sent} linhas fictícias enviadas para a nuvem` : ', nada enviado'}`,
    worklist: 'Lista para registo',
    queue: 'Linhas por rever',
    queueHint: 'O mais urgente primeiro. Use ↑ ↓ para mudar.',
    keepCopies: (n) => `Manter uma de cada par igual (${n})`,
    bed: (b) => `Cama ${b || '?'}`,
    noTime: 'sem hora',
    highAlert: 'Medicamento de alerta máximo: confirme a dose e se foi administrado',
    identityFirst: 'Resolva primeiro a identidade, acima.',
    waitingRows: (owner) =>
      `Estas linhas aguardam que ${owner} confirme a identidade. A pergunta está na lista para registo; quando tiver a resposta, resolva a identidade acima.`,
    identityTitle: {
      'name-variant': 'O nome está escrito de outra forma',
      'id-mismatch': 'O n.º de processo não coincide com a lista de doentes',
      'id-name-conflict': 'Este n.º de processo pertence a outra pessoa',
      'not-in-census': 'Este doente não consta da lista de doentes',
      'no-identity': 'Não há nome nem n.º de processo',
    },
    useCensus: (name, id) => `Usar a lista de doentes: ${name}, ${id}`,
    newAdmission: 'Admissão nova: confirmar e manter os dados da folha',
    asWritten: 'Manter como está escrito',
    ask: (owner) => `Perguntar a ${owner}`,
    waitingIdentity: (owner) => `A aguardar que ${owner} confirme a identidade. A pergunta está na lista para registo; o ato fica pendente até lá.`,
    settled: (census) => `Resolvido: ${census ? 'usar a identidade da lista de doentes' : 'manter como está escrito'}.`,
    onlyEarlier: (n) => `${n} só na cópia anterior`,
    onlyLater: (n) => `${n} só na cópia posterior`,
    whoDevice: 'O Gemini Nano, neste computador,',
    whoSecond: 'O Gemini na nuvem (segunda opinião)',
    whoCloud: 'O Gemini na nuvem (sem modelo local neste computador)',
    reads: 'lê estas linhas como',
    because: (e) => `, por causa de “${e}”`,
    overrides: (rule) => `As regras do Lantern prevalecem: ${rule}.`,
    why: 'Porque é que o Lantern sugere isto',
    identical: 'Texto, hora e doente iguais nos dois ficheiros.',
    rulesOnly: (rule) => `Nenhuma IA avaliou este par. Regras do Lantern: ${rule}.`,
    relayed: (by, x) => `${by || 'Alguém'} escreveu esta correção por indicação de ${x}. ${x} tem de a confirmar: altera um registo de ${x}.`,
    noTimeCopy: (earlier) => `A cópia ${earlier ? 'anterior' : 'posterior'} não tem hora.`,
    undecidable: 'Nenhuma IA avaliou este par e as regras do Lantern não o conseguem decidir: compare as duas linhas, ou pergunte à enfermagem.',
    disputed: (list) => `Em dúvida: ${list}.`,
    numbersDiffer: (d) => `os números são diferentes (${d})`,
    kept: 'mantida',
    keptNote: (note) => `mantida (${note})`,
    keptCorrected: 'mantida com a correção',
    copy: 'marcada como cópia',
    waiting: (owner) => `à espera da resposta de ${owner}`,
    leftOut: (reason) => `deixada de fora (${reason})`,
    decidedPair: (a, b) => `linha anterior ${a}, linha posterior ${b}`,
    decidedOne: (a) => `linha ${a}`,
    decided: (what) => `Decidido: ${what}. Pode alterar abaixo.`,
    confirmBoth: 'Vai manter as duas linhas. Se corresponderem à mesma administração, há risco de registar a dose duas vezes no processo clínico.',
    useCorrected: (row) => `Usar a versão corrigida (${row})`,
    keepOriginal: (row) => `Manter o original (${row})`,
    notAccepted: 'correção não aceite na revisão',
    sameKeep: (row) => `Mesmo ato: manter a ${row}`,
    drops: (row, words) => `Ao manter a ${row}, perde-se “${words}”, que só está na cópia posterior.`,
    keepBoth: 'Dois atos diferentes: manter os dois',
    enterWith: (owner) => `Registar com a resposta de ${owner}`,
    clarified: (owner, answer) => `esclarecido por ${owner}: ${answer}`,
    keepIt: 'Manter',
    removed: 'Foi retirado de propósito',
    doNotEnter: 'Não registar',
    removedReason: 'retirado de propósito na versão posterior',
    notEnteredAnswer: (owner, answer) => `não registado: ${owner} respondeu “${answer}”`,
    notEntered: 'não registado (revisão)',
    yesBoth: 'Sim, manter os dois',
    cancel: 'Cancelar',
    confirmed: (label) => `${label}, confirmado`,
    suggested: '(sugerido)',
    next: 'passa à linha seguinte',
    disputedTitle: (n) => `Há dúvidas em ${n} ${n === 1 ? 'comparação' : 'comparações'}`,
    disputedText:
      ': a primeira opinião da IA e as regras do Lantern não concordaram, ou duas linhas podem ser o mesmo ato. Como este é o simulacro fictício, pode pedir uma segunda opinião a um modelo maior, na nuvem. Esse modelo recebe o texto clínico dessas linhas tal como está escrito (em inglês), sem as colunas de nome, n.º de processo e cama.',
    showSent: (show) => `${show ? 'Esconder' : 'Mostrar'} o que vai ser enviado`,
    askCloud: 'Pedir uma segunda opinião (envia linhas fictícias)',
    strip: (drug) => `${drug} neste processo: todas as linhas dos dois ficheiros`,
    stripHint: 'Da mais antiga para a mais recente. As linhas sem hora ficam no fim.',
    inThis: 'nesta comparação',
    maybe: (drug) => `pode ser ${drug}: abreviatura propensa a erro, nunca interpretada`,
    dose: {
      listed: 'na lista',
      copy: 'marcada como cópia',
      waiting: 'à espera de resposta',
      'left-out': 'deixada de fora',
      open: 'por decidir',
    },
    controlled: (drug) =>
      `Estupefaciente (${drug}): quem registar estas doses deve confirmá-las primeiro no registo de estupefacientes do serviço.`,
  },
);

export function useLedgerEntries(): LedgerEntry[] {
  const [es, setEs] = useState<LedgerEntry[]>([]);
  useEffect(() => subscribeLedger(setEs), []);
  return es;
}

export default function Review({ onWorklist }: { onWorklist: () => void }) {
  const s = useSession();
  const t = useT(M);
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
          {active ? <ItemView key={active.id} item={active} onDone={() => next(active)} /> : <p>{t.nothing}</p>}
          {undecided.length === 0 && (
            <div className="mt-10">
              <Notice tone="scrub">
                {t.allDecided}{' '}
                <Button className="ml-2" onClick={onWorklist}>
                  {t.openWorklist}
                </Button>
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
  const t = useT(M);
  const session = s.session!;
  const ledger = useLedgerEntries();
  const cloudCalls = ledger.filter((e) => e.inferenceSource === 'in_cloud');
  const sentRows = new Set(cloudCalls.flatMap((e) => e.outgoingRefs.filter((r) => r.includes(':')))).size;
  const deviceCalls = ledger.filter((e) => e.inferenceSource === 'on_device').length;
  return (
    <header className="sticky top-0 z-20 border-b border-rule bg-paper">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3 sm:px-8">
        <div className="flex items-center gap-2">
          <LanternMark />
          <span className="font-semibold">Lantern</span>
          <span className="ml-2 text-ink-soft">{sessionTitle(session.kind)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Meter done={s.decidedCount} total={session.acts.length} />
          <span className="text-sm text-ink-soft" title={t.countedFrom}>
            {session.kind === 'import'
              ? t.sentNone
              : deviceCalls === 0 && cloudCalls.length > 0
                ? t.cloudOnly(sentRows)
                : t.deviceCalls(deviceCalls, cloudCalls.length ? sentRows : null)}
          </span>
          <Button tone="secondary" onClick={onWorklist}>
            {t.worklist}
          </Button>
          <LangToggle />
        </div>
      </div>
    </header>
  );
}

function Queue({ items, active, onPick }: { items: ReviewItem[]; active?: ReviewItem; onPick: (id: string) => void }) {
  const s = useSession();
  const session = s.session!;
  const t = useT(M);
  const groups = GROUP_ORDER.map((g) => ({ g, list: items.filter((i) => i.group === g) })).filter((x) => x.list.length);
  return (
    <nav aria-label={t.queue} className="border-b border-rule px-5 py-6 sm:px-8 lg:sticky lg:top-[57px] lg:h-[calc(100vh-57px)] lg:overflow-y-auto lg:border-b-0 lg:px-5">
      <p className="mb-4 text-sm text-ink-soft">{t.queueHint}</p>
      {groups.map(({ g, list }) => {
        const done = list.filter((i) => isDecided(i, session.decisions)).length;
        return (
          <section key={g} className="mb-6">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">{groupCopy(g).title}</h2>
              <span className="text-sm tabular-nums text-ink-faint">
                {done}/{list.length}
              </span>
            </div>
            {g === 'copies' && done < list.length && (
              <button className="mb-1 text-sm text-ballpoint underline underline-offset-2" onClick={() => s.acceptGroup('copies')}>
                {t.keepCopies(list.length - done)}
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
                        <span className="block truncate font-semibold">{act.patientName || t.bed(act.bed)}</span>
                        <span className="block truncate text-sm text-ink-soft">
                          {act.eventTime || t.noTime} {act.actText}
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
  const t = useT(M);
  const session = s.session!;
  const a = s.actsById.get(item.a ?? item.act ?? '')!;
  const b = item.b ? s.actsById.get(item.b) : undefined;
  const fileOf = (act: Act) => session.files.find((f) => f.id === act.fileId);
  const candidate = item.kind === 'pair' ? session.candidates.find((c) => c.a === item.a && c.b === item.b) : undefined;
  const decided = isDecided(item, session.decisions);
  const identityOpen = item.identity.filter((i) => !session.identityDecisions[i.id]);
  const identityAsked = item.identity.filter((i) => session.identityDecisions[i.id] === 'ask');
  const override = item.identity.find((i) => session.identityDecisions[i.id] === 'census')?.suggestion;
  const copy = groupCopy(item.group);
  const highAlert = isHighAlert(a) || (b ? isHighAlert(b) : false);

  const decide = (d: Record<string, Disposition>, label: string) => {
    s.decide(item, d, label);
    onDone();
  };

  return (
    <article aria-labelledby="item-title">
      <p className="text-sm text-ink-soft">
        {copy.title}. {copy.hint}.
      </p>
      <div id="item-title" className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <PatientLine act={a} override={override} />
        {highAlert && (
          <span className="rounded-sm border border-pen/50 px-1.5 py-0.5 text-[13px] font-semibold text-pen">{t.highAlert}</span>
        )}
      </div>

      {item.identity.map((issue) => (
        <IdentityBox key={issue.id} issue={issue} act={a} />
      ))}

      <div className={`mt-6 flex flex-col gap-5 ${b ? 'xl:flex-row' : ''}`}>
        <Slip act={a} other={b} file={fileOf(a)} label={versionName(fileOf(a)!, session.kind)} identity={item.identity.length > 0} />
        {b && <Slip act={b} other={a} file={fileOf(b)} label={versionName(fileOf(b)!, session.kind)} identity={item.identity.length > 0} />}
      </div>

      <MarginNotes item={item} candidate={candidate} a={a} b={b} />
      <SameDrugStrip focus={b ? [a, b] : [a]} />

      <div className="mt-7 border-t border-rule pt-5">
        {decided && <CurrentDecision item={item} />}
        {identityOpen.length > 0 ? (
          <p className="text-[15px] text-pen">{t.identityFirst}</p>
        ) : identityAsked.length > 0 ? (
          <p className="text-[15px] text-pen">{t.waitingRows(ownerOf(b ?? a))}</p>
        ) : (
          <Actions item={item} a={a} b={b} decided={decided} onDecide={decide} />
        )}
      </div>
    </article>
  );
}

const capital = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/**
 * Every row for the same patient that names the same medicine, across both files, with where each
 * one stands now. A re-typed copy with no time, a dose missing from the later file and an "MS 10mg"
 * line all become visible next to each other before the reviewer decides.
 */
function SameDrugStrip({ focus }: { focus: Act[] }) {
  const s = useSession();
  const t = useT(M);
  const session = s.session!;
  const strips = sameDrugRows(session.acts, focus);
  if (!strips.length) return null;
  const inFocus = new Set(focus.map((a) => a.id));
  return (
    <>
      {strips.map(({ key, controlled, rows }) => {
        const name = drugName(key);
        if (rows.length < 2)
          return controlled ? (
            <p key={key} className="mt-5 max-w-[72ch] text-[15px] font-semibold text-pen">
              {t.controlled(name)}
            </p>
          ) : null;
        return (
          <section key={key} aria-label={t.strip(capital(name))} className="mt-6">
            <h3 className="font-semibold">{t.strip(capital(name))}</h3>
            <p className="text-sm text-ink-faint">{t.stripHint}</p>
            <div className="mt-2 overflow-x-auto rounded-[3px] border border-rule-strong bg-sheet">
              <table className="w-full min-w-[560px] border-collapse text-left text-[15px]">
                <tbody>
                  {rows.map(({ act, sure }) => {
                    const d = session.decisions[act.id];
                    const status = doseStatus(d);
                    const mine = inFocus.has(act.id);
                    return (
                      <tr key={act.id} className={`border-b border-rule last:border-b-0 ${mine ? 'bg-marker/25 shadow-[inset_3px_0_0_var(--color-ink)]' : ''}`}>
                        <td className="w-[5.5rem] px-3 py-2 align-top font-mono tabular-nums">{act.eventTime || <span className="text-ink-faint">{t.noTime}</span>}</td>
                        <td className="px-3 py-2 align-top">
                          <span className="font-mono">{act.actText}</span>
                          {act.notes && <span className="block text-sm text-ink-soft">{act.notes}</span>}
                          {!sure && <span className="block text-sm text-pen">{t.maybe(name)}</span>}
                        </td>
                        <td className="w-[11rem] px-3 py-2 align-top text-sm text-ink-soft">
                          {rowRef(act)}
                          {mine && <span className="block font-semibold text-ink">{t.inThis}</span>}
                        </td>
                        <td className={`w-[10rem] px-3 py-2 align-top text-sm ${status === 'open' ? 'text-ink-faint' : status === 'listed' ? 'text-scrub' : 'text-ink-soft'}`}>
                          {d?.kind === 'unresolved' ? t.waiting(d.owner) : t.dose[status]}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {controlled && <p className="mt-2 max-w-[72ch] text-[15px] font-semibold text-pen">{t.controlled(name)}</p>}
          </section>
        );
      })}
    </>
  );
}

function IdentityBox({ issue, act }: { issue: IdentityIssue; act: Act }) {
  const s = useSession();
  const t = useT(M);
  const choice = s.session!.identityDecisions[issue.id];
  const title = t.identityTitle[issue.kind];
  const settle = (
    <div className="mt-3 flex flex-wrap gap-2">
      {issue.suggestion && (
        <Button onClick={() => s.decideIdentity(issue.id, 'census')}>
          {t.useCensus(issue.suggestion.patientName, issue.suggestion.patientId)}
        </Button>
      )}
      {issue.kind === 'not-in-census' && <Button onClick={() => s.decideIdentity(issue.id, 'as-written')}>{t.newAdmission}</Button>}
      {issue.kind !== 'not-in-census' && issue.kind !== 'no-identity' && (
        <Button tone="secondary" onClick={() => s.decideIdentity(issue.id, 'as-written')}>
          {t.asWritten}
        </Button>
      )}
      {choice !== 'ask' && (
        <Button tone="pen" onClick={() => s.decideIdentity(issue.id, 'ask')}>
          {t.ask(ownerOf(act))}
        </Button>
      )}
    </div>
  );
  return (
    <div className="mt-5 rounded-md border border-pen/40 bg-pen-wash px-4 py-3">
      <p className="font-semibold text-pen">{title}</p>
      <p className="mt-0.5 text-[15px]">{identityDetail(issue)}</p>
      {choice === 'ask' ? (
        <>
          <p className="mt-2 text-sm text-pen">{t.waitingIdentity(ownerOf(act))}</p>
          <AnswerBox refId={`identity:${issue.id}`} owner={ownerOf(act)} />
          {s.session!.answers?.[`identity:${issue.id}`] && issue.kind !== 'no-identity' && settle}
        </>
      ) : choice ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-scrub">
          <Check size={15} /> {t.settled(choice === 'census')}
        </p>
      ) : (
        settle
      )}
    </div>
  );
}

/** Numbers that occur in one row but not the other (doses, times, values), to say exactly what differs. */
function numberDiff(a: Act, b: Act, t: (typeof M)['en']): string {
  const nums = (x: Act): string[] => x.actText.match(/\d+(?:\.\d+)?/g) ?? [];
  const na = nums(a);
  const nb = nums(b);
  const onlyA = na.filter((n) => !nb.includes(n));
  const onlyB = nb.filter((n) => !na.includes(n));
  return [onlyA.length && t.onlyEarlier(onlyA.join(', ')), onlyB.length && t.onlyLater(onlyB.join(', '))].filter(Boolean).join('; ');
}

function MarginNotes({ item, candidate, a, b }: { item: ReviewItem; candidate?: MatchCandidate; a: Act; b?: Act }) {
  const s = useSession();
  const t = useT(M);
  const reasons = candidate ? s.escalated.get(candidate.id) : undefined;
  // label every opinion by where it actually ran, never by the route that was asked for
  const note = (j: Judgment | undefined, role: 'first' | 'second') => {
    if (!j || !b) return null;
    const g = guard(j.relation, a, b);
    const who = j.source === 'on_device' ? t.whoDevice : role === 'second' ? t.whoSecond : t.whoCloud;
    return (
      <li className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
        <RanOn source={j.source} />
        <span>
          {who} {t.reads} <strong className="font-semibold">{t.relation[j.relation]}</strong>
          {j.evidence && <span className="text-ink-soft">{t.because(j.evidence)}</span>}.
          {g.relation !== j.relation && (
            <span className="mt-1 block text-ink-soft">
              <RanOn source="rule" /> {t.overrides(g.rule ?? '')}
            </span>
          )}
        </span>
      </li>
    );
  };
  const rule = b && !candidate?.exact && !candidate?.local && !candidate?.cloud ? ruleVerdict(a, b) : null;
  const relayed = b ? relayedFrom(b) : null;
  const missingTime = b && (!a.eventTime || !b.eventTime) ? t.noTimeCopy(!a.eventTime) : null;
  const because = item.proposals.map((p) => p.because).filter((x, i, arr) => x && arr.indexOf(x) === i);
  const differs = b && reasons?.includes('numbers-differ') ? numberDiff(a, b, t) : '';
  return (
    <aside className="mt-6" aria-label={t.why}>
      <ul className="space-y-2.5 text-[15px]">
        {candidate?.exact && (
          <li className="flex items-start gap-3">
            <RanOn source="rule" /> <span>{t.identical}</span>
          </li>
        )}
        {note(candidate?.local, 'first')}
        {note(candidate?.cloud, 'second')}
        {rule && (
          <li className="flex items-start gap-3">
            <RanOn source="rule" /> <span>{t.rulesOnly(rule.rule)}</span>
          </li>
        )}
        {relayed && (
          <li className="flex items-start gap-3 text-pen">
            <RanOn source="rule" />
            <span>{t.relayed(b!.documentedBy, relayed)}</span>
          </li>
        )}
        {missingTime && <li className="text-pen">{missingTime}</li>}
        {item.undecidedByModel && !rule ? (
          <li className="text-ink-soft">{t.undecidable}</li>
        ) : (
          because.map((t) => (
            <li key={t} className="text-ink-soft">
              {t}
            </li>
          ))
        )}
        {reasons && !candidate?.cloud && !item.undecidedByModel && !(rule && reasons.every((r) => r === 'local-unavailable')) && (
          <li className="text-ink-soft">
            {t.disputed(reasons.map((r) => (r === 'numbers-differ' && differs ? t.numbersDiffer(differs) : (t.reason[r] ?? r))).join('; '))}
          </li>
        )}
      </ul>
    </aside>
  );
}

function CurrentDecision({ item }: { item: ReviewItem }) {
  const s = useSession();
  const t = useT(M);
  const d = item.actIds.map((id) => s.session!.decisions[id]);
  const text = d
    .map((x) =>
      !x
        ? ''
        : x.kind === 'approved'
          ? x.note
            ? t.keptNote(x.note)
            : t.kept
          : x.kind === 'corrected'
            ? t.keptCorrected
            : x.kind === 'duplicate'
              ? t.copy
              : x.kind === 'unresolved'
                ? t.waiting(x.owner)
                : t.leftOut(x.reason),
    )
    .filter(Boolean);
  return (
    <p className="mb-3 flex items-center gap-2 text-[15px] text-scrub">
      <Check size={16} /> {t.decided(item.kind === 'pair' ? t.decidedPair(text[0] ?? '', text[1] ?? '') : t.decidedOne(text[0] ?? ''))}
    </p>
  );
}

/** Words that only one row has (e.g. "RR 24"): what a "keep one" would drop. */
function onlyIn(x: Act, y: Act): string[] {
  const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]+/g, '');
  const other = squash(`${y.actText} ${y.notes}`);
  // "2 mg" vs "2mg", "s/c" vs "SC": only report words the other row really lacks
  return x.actText.split(/[\s,;:()]+/).filter((w) => squash(w).length > 1 && !other.includes(squash(w)));
}

type Option = { label: string; d: Record<string, Disposition>; suggested?: boolean; tone?: 'primary' | 'secondary' | 'pen'; confirm?: string };

function Actions({ item, a, b, decided, onDecide }: { item: ReviewItem; a: Act; b?: Act; decided: boolean; onDecide: (d: Record<string, Disposition>, label: string) => void }) {
  const session = useSession().session!;
  const t = useT(M);
  const decisions = session.decisions;
  const [confirming, setConfirming] = useState<string | null>(null);
  const ask = (ids: string[], owner: string, question: string): Record<string, Disposition> =>
    Object.fromEntries(ids.map((id) => [id, { kind: 'unresolved', owner, question, ref: item.id }]));
  const sug = suggested(item);
  const options: Option[] = [];
  const isSug = (d: Record<string, Disposition>) => JSON.stringify(d) === JSON.stringify(sug);
  const rowName = (x: Act) => rowRef(x);
  let drops = '';
  const answer = session.answers?.[item.id];

  if (item.kind === 'pair' && b) {
    const pa = item.proposals.find((p) => p.actId === a.id)?.disposition;
    const medicine = isHighAlert(a) || isHighAlert(b) || /\d/.test(`${a.actText}${b.actText}`);
    const confirmBoth = medicine ? t.confirmBoth : undefined;
    const q = pairQuestion(item.group, a, b);
    if (item.group === 'changed' || pa?.kind === 'corrected') {
      options.push({ label: t.useCorrected(rowName(b)), d: sug });
      options.push({ label: t.keepOriginal(rowName(a)), d: { [a.id]: { kind: 'approved' }, [b.id]: { kind: 'excluded', reason: t.notAccepted } } });
    } else {
      options.push({ label: t.sameKeep(rowName(a)), d: { [a.id]: { kind: 'approved' }, [b.id]: { kind: 'duplicate', of: a.id } } });
      options.push({ label: t.sameKeep(rowName(b)), d: { [b.id]: { kind: 'approved' }, [a.id]: { kind: 'duplicate', of: b.id } }, tone: 'secondary' });
      const lost = onlyIn(b, a);
      if (lost.length) drops = t.drops(rowName(a), lost.join(' '));
    }
    options.push({ label: t.keepBoth, d: { [a.id]: pa?.kind === 'corrected' ? { kind: 'approved' } : (sug[a.id] ?? { kind: 'approved' }), [b.id]: { kind: 'approved' } }, confirm: confirmBoth });
    options.push({ label: t.ask(q.owner), d: ask([a.id, b.id], q.owner, q.question), tone: 'pen' });
  } else {
    const p = item.proposals[0];
    const owner = ownerOf(a);
    const flags = errorProneAbbreviations(`${a.actText} ${a.notes}`);
    if (item.group === 'open' || p?.disposition.kind === 'unresolved') {
      const q = p?.disposition.kind === 'unresolved' ? p.disposition.question : singleQuestion('open', a, flags);
      options.push({ label: t.ask(owner), d: ask([a.id], owner, q), tone: 'pen' });
      // never "keep as written" an error-prone abbreviation or a row with no patient: only the author's answer can settle it
      if (answer) options.push({ label: t.enterWith(owner), d: { [a.id]: { kind: 'approved', note: t.clarified(owner, answer.text) } } });
    } else {
      options.push({ label: t.keepIt, d: { [a.id]: { kind: 'approved' } } });
      options.push({ label: t.ask(owner), d: ask([a.id], owner, singleQuestion(item.group, a, flags)), tone: 'pen' });
    }
    options.push({
      label: item.group === 'only-earlier' ? t.removed : t.doNotEnter,
      d: { [a.id]: { kind: 'excluded', reason: item.group === 'only-earlier' ? t.removedReason : answer ? t.notEnteredAnswer(owner, answer.text) : t.notEntered } },
      tone: 'secondary',
    });
  }
  options.forEach((o) => (o.suggested = !item.undecidedByModel && isSug(o.d)));
  const current = JSON.stringify(Object.fromEntries(item.actIds.map((id) => [id, decisions[id]])));
  const askedHere = item.actIds.some((id) => decisions[id]?.kind === 'unresolved');

  return (
    <div>
      {askedHere && (
        <div className="mb-4">
          <AnswerBox refId={item.id} owner={(decisions[item.actIds[0]!] as { owner?: string })?.owner ?? ownerOf(a)} />
        </div>
      )}
      {drops && <p className="mb-3 text-[15px] text-pen">{drops}</p>}
      <div className="flex flex-wrap items-center gap-2.5">
        {options.map((o) => {
          const pressed = decided && current === JSON.stringify(o.d);
          if (confirming === o.label)
            return (
              <span key={o.label} className="flex flex-wrap items-center gap-2 rounded-md border border-pen px-3 py-1.5 text-[15px] text-pen">
                {o.confirm}
                <Button tone="pen" onClick={() => onDecide(o.d, `${t.confirmed(o.label)} (${item.id})`)}>
                  {t.yesBoth}
                </Button>
                <Button tone="quiet" onClick={() => setConfirming(null)}>
                  {t.cancel}
                </Button>
              </span>
            );
          return (
            <Button
              key={o.label}
              tone={o.tone === 'pen' ? 'pen' : o.suggested && !decided ? 'primary' : 'secondary'}
              onClick={() => (o.confirm && !pressed ? setConfirming(o.label) : onDecide(o.d, `${o.label} (${item.id})`))}
              aria-pressed={pressed}
            >
              {pressed && <Check size={16} />}
              {o.label}
              {o.suggested && <span className="font-normal opacity-75">{t.suggested}</span>}
            </Button>
          );
        })}
        <span className="ml-1 hidden items-center text-sm text-ink-faint sm:flex">
          <ChevronRight size={14} /> {t.next}
        </span>
      </div>
    </div>
  );
}

function CloudOffer() {
  const s = useSession();
  const t = useT(M);
  const [show, setShow] = useState(false);
  const preview = useMemo(() => (show ? s.previewCloud() : []), [show, s]);
  if (!s.cloudEligible) return null;
  // nothing left to ask about once every disputed row has a decision
  const open = [...s.escalated.keys()].filter((id) => {
    const c = s.session!.candidates.find((x) => x.id === id);
    return c && !(s.session!.decisions[c.a] && s.session!.decisions[c.b]);
  });
  if (!open.length) return null;
  const n = open.length;
  return (
    <div className="border-b border-rule bg-ballpoint-wash/60">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-5 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[80ch] text-[15px]">
            <strong className="font-semibold">{t.disputedTitle(n)}</strong>
            {t.disputedText}
          </p>
          <div className="flex gap-2">
            <Button tone="secondary" onClick={() => setShow((v) => !v)}>
              {t.showSent(show)}
            </Button>
            <Button onClick={() => void s.askCloud()} disabled={!!s.busy}>
              {t.askCloud}
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
