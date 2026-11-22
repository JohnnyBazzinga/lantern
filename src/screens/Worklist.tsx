import { useMemo, useState } from 'react';
import { Check, Copy, Download, Printer, TriangleAlert } from 'lucide-react';
import { sessionTitle, useSession } from '../app/session';
import type { Entered } from '../app/store';
import { categoryLabel } from '../core/clinical';
import { ct, ptAt } from '../core/i18n';
import type { Act } from '../core/types';
import { buildWorklist, defaultNightOf, formatDate, worklistCsv, type WorklistItem, type WorklistQuestion } from '../core/worklist';
import { locale, msgs } from '../i18n/lang';
import { useLang, useT } from '../i18n/react';
import { AnswerBox } from '../ui/AnswerBox';
import { AppBar, Button, Notice, Steps, usePageTitle } from '../ui/kit';
import { Tally } from '../ui/Tally';

const M = msgs(
  {
    back: 'Back to the review',
    finish: 'Finish and clear this PC',
    clearText:
      'This deletes the review, its decisions and answers from this browser, so the next person on this PC cannot open it. Downloaded files and printouts are not affected: delete or file them yourself.',
    remove: 'Delete it from this PC',
    cancel: 'Cancel',
    title: 'Re-entry worklist',
    ready: (n: number) => `${n} ${n === 1 ? 'act is' : 'acts are'} ready for re-entry. `,
    forYou: (n: number) => `The clinical secretary enters the ${n === 1 ? 'admission or transfer' : `${n} admissions and transfers`}. `,
    rest: 'Each nurse enters their own clinical acts as late entries.',
    questionsFirst: (n: number) => ` ${n} ${n === 1 ? 'question is' : 'questions are'} waiting for a nurse's answer.`,
    sumReady: (n: number): string => (n === 1 ? 'act ready to enter' : 'acts ready to enter'),
    sumWaiting: (n: number, rows: number) => `${n === 1 ? 'question' : 'questions'} waiting for a nurse's answer (${rows} ${rows === 1 ? 'row' : 'rows'})`,
    sumEntered: (n: number) => `of ${n} ticked as entered in the record`,
    people: 'Who enters what',
    clerkTab: 'Clinical secretary',
    counts: (acts: number, questions: number) => [acts ? `${acts} ${acts === 1 ? 'act' : 'acts'}` : '', questions ? `${questions} ${questions === 1 ? 'question' : 'questions'}` : ''].filter(Boolean).join(', '),
    nothingYet: (who: string) => `Nothing for ${who} to enter yet: the rows are waiting for the answers above.`,
    printHead: (who: string, night: string) => `Re-entry worklist for ${who}. Night of ${night}.`,
    printSign: 'Entered by: ____________________  Signed: ____________  Date: __________',
    done: 'When re-entry is done',
    pageTitle: 'Worklist',
    readyNotEntered: ' Ready is not entered: tick each act once it is in the record.',
    nightStarted: 'The outage night started on',
    days: (d1: string, d2: string) => `Times from 12:00 are ${d1}, times before 12:00 are ${d2}.`,
    initials: 'Your initials (recorded with each tick)',
    incomplete: (n: number) => `${n} ${n === 1 ? 'row still has' : 'rows still have'} no decision, so this list is not complete.`,
    finishReview: 'Finish the review',
    csv: 'Download as CSV',
    print: 'Print',
    result: 'See how the drill went',
    ticked: (e: number, n: number) => `${e} of ${n} ticked as entered`,
    drillFile: 'The drill file is marked DRILL: fictional patients.',
    realFile: 'The file and the printout carry patient names. The file goes to this PC’s Downloads folder: delete it, or file the printout, once re-entry is done.',
    fileName: (drill: boolean, incomplete: boolean, night: string) =>
      `${drill ? 'DRILL-' : ''}${incomplete ? 'INCOMPLETE-' : ''}re-entry-worklist-night-of-${night}.csv`,
    questions: 'Questions for the nurses',
    questionsText:
      'One question per problem, with the rows it is about. Ask in person or by phone, or print this page to be answered and signed. Write the answer here, then decide the row in the review.',
    forOwner: (owner: string, n: number) => `Questions for ${owner} (${n})`,
    clerk: 'Clinical secretary: admissions and transfers',
    clerkText: 'Administrative entries a clinical secretary makes, with the original time.',
    toEnter: (who: string) => `To be entered by ${who}`,
    toEnterLate: (who: string, n: number) => `To be entered by ${who}, as late entries (${n})`,
    nurseText: 'Clinical entries are made by the nurse who gave or saw the care, with the original date and time and a late-entry note, for example:',
    keep: 'Keep with the record',
    keepText: 'The late entries point back to these copies. File or scan them, with the paper notes, as the original record of the downtime.',
    fileLine: (label: string, rows: number, hash: string) => `(${label}, ${rows} rows, fingerprint ${hash})`,
    noName: 'No name written',
    noNameShort: 'No name',
    bed: (b: string) => `bed ${b}`,
    noTimeWritten: 'no time written',
    noTime: 'no time',
    blank: '(blank)',
    by: (b: string) => `, by ${b}`,
    printLine: 'Answer: ______________________________ Signed: ________ Time: ______',
    entered: (act: string) => `Entered: ${act}`,
    highAlert: 'high-alert',
    corrected: 'Corrected:',
    mustConfirm: (x: string) => `${x} must confirm this correction: someone else wrote it on ${x}’s word.`,
    obsBy: (who: string) => `The observations in this row are entered by ${who}.`,
    tickedAt: (time: string, by: string) => `Ticked ${time}${by ? ` by ${by}` : ''}`,
    copied: 'Copied',
    copyNote: 'Copy late-entry note',
    audit: (n: number) => `Audit trail (${n} entries)`,
    auditText: 'Every decision, answer and tick, with time and initials, kept in this browser.',
    auditDownload: 'Download it',
    auditHead: ['Seq', 'When', 'Who', 'Action', 'Rows'],
    auditFile: (drill: boolean, date: string) => `${drill ? 'DRILL-' : ''}audit-trail-${date}.csv`,
    actor: (a: string) => a,
  },
  {
    back: 'Voltar à revisão',
    finish: 'Terminar e apagar a revisão deste computador',
    clearText:
      'Isto apaga deste navegador a revisão, as decisões e as respostas, para que a próxima pessoa neste computador não a possa abrir. Os ficheiros já transferidos e as impressões ficam à sua guarda: apague os ficheiros e arquive as impressões, ou destrua-as de forma confidencial.',
    remove: 'Apagar deste computador',
    cancel: 'Cancelar',
    title: 'Lista para registo',
    ready: (n) => `A lista tem ${n} ${n === 1 ? 'ato' : 'atos'} para registo. `,
    forYou: (n) => `O secretariado clínico regista ${n === 1 ? 'a admissão ou transferência' : `as ${n} admissões e transferências`}. `,
    rest: 'Cada elemento da equipa de enfermagem faz o registo diferido dos seus próprios atos clínicos.',
    questionsFirst: (n) => ` ${n} ${n === 1 ? 'pergunta está' : 'perguntas estão'} à espera de resposta da enfermagem.`,
    sumReady: (n) => (n === 1 ? 'ato pronto a registar' : 'atos prontos a registar'),
    sumWaiting: (n, rows) => `${n === 1 ? 'pergunta' : 'perguntas'} à espera de resposta da enfermagem (${rows} ${rows === 1 ? 'linha' : 'linhas'})`,
    sumEntered: (n) => `de ${n} marcados como registados no sistema`,
    people: 'Quem regista o quê',
    clerkTab: 'Secretariado clínico',
    counts: (acts, questions) => [acts ? `${acts} ${acts === 1 ? 'ato' : 'atos'}` : '', questions ? `${questions} ${questions === 1 ? 'pergunta' : 'perguntas'}` : ''].filter(Boolean).join(', '),
    nothingYet: (who) => `Ainda nada a registar por ${who}: as linhas aguardam as respostas acima.`,
    printHead: (who, night) => `Lista para registo de ${who}. Noite de ${night}.`,
    printSign: 'Registado por: ____________________  Assinatura: ____________  Data: __________',
    done: 'Quando o registo estiver feito',
    pageTitle: 'Lista para registo',
    readyNotEntered: ' Pronto não quer dizer registado: marque cada ato quando já estiver no sistema.',
    nightStarted: 'A noite da falha começou em',
    days: (d1, d2) => `As horas a partir das 12:00 são de ${d1}; as anteriores às 12:00 são de ${d2}.`,
    initials: 'As suas iniciais (ficam com cada marcação)',
    incomplete: (n) => `${n} ${n === 1 ? 'linha ainda não tem' : 'linhas ainda não têm'} decisão, por isso esta lista não está completa.`,
    finishReview: 'Terminar a revisão',
    csv: 'Transferir em CSV',
    print: 'Imprimir',
    result: 'Ver como correu o simulacro',
    ticked: (e, n) => `${e} de ${n} marcados como registados`,
    drillFile: 'O ficheiro do simulacro vai marcado SIMULACRO: doentes fictícios.',
    realFile:
      'O ficheiro e a impressão têm nomes de doentes. O ficheiro vai para a pasta Transferências deste computador: apague-o, ou arquive a impressão, quando o registo estiver feito.',
    fileName: (drill, incomplete, night) => `${drill ? 'SIMULACRO-' : ''}${incomplete ? 'INCOMPLETO-' : ''}lista-para-registo-noite-de-${night}.csv`,
    questions: 'Perguntas para a enfermagem',
    questionsText:
      'Uma pergunta por problema, com as linhas a que diz respeito. Pergunte pessoalmente ou por telefone, ou imprima esta página para ser respondida e assinada. Registe aqui a resposta. Depois, volte à revisão e decida se o ato entra na lista.',
    forOwner: (owner, n) => `Perguntas para ${owner} (${n})`,
    clerk: 'Secretariado clínico: admissões e transferências',
    clerkText: 'Registos administrativos, feitos pelo secretariado clínico, com a hora original.',
    toEnter: (who) => `A registar por ${who}`,
    toEnterLate: (who, n) => `A registar por ${who}, como registos diferidos (${n})`,
    nurseText:
      'Os registos clínicos são feitos por quem prestou ou observou os cuidados, com a data e a hora originais e uma nota de registo diferido, por exemplo:',
    keep: 'Guardar com o processo',
    keepText: 'Os registos diferidos remetem para estas cópias. Arquive-as ou digitalize-as, com as notas em papel, como registo original do período da falha.',
    fileLine: (label, rows, hash) => `(${label}, ${rows} linhas, código de verificação ${hash})`,
    noName: 'Sem nome escrito',
    noNameShort: 'Sem nome',
    bed: (b) => `cama ${b}`,
    noTimeWritten: 'sem hora escrita',
    noTime: 'sem hora',
    blank: '(em branco)',
    by: (b) => `, por ${b}`,
    printLine: 'Resposta: ______________________________ Assinatura: ________ Hora: ______',
    entered: (act) => `Registado: ${act}`,
    highAlert: 'alerta máximo',
    corrected: 'Corrigido:',
    mustConfirm: (x) => `${x} tem de confirmar esta correção: foi escrita por outra pessoa, por indicação de ${x}.`,
    obsBy: (who) => `As observações desta linha são registadas por ${who}.`,
    tickedAt: (time, by) => `Marcado ${ptAt(time)}${by ? ` por ${by}` : ''}`,
    copied: 'Copiado',
    copyNote: 'Copiar a nota de registo diferido',
    audit: (n) => `Registo de auditoria (${n} entradas)`,
    auditText: 'Cada decisão, resposta e marcação, com hora e iniciais, guardada neste navegador.',
    auditDownload: 'Transferir',
    auditHead: ['N.º', 'Quando', 'Quem', 'Ação', 'Linhas'],
    auditFile: (drill, date) => `${drill ? 'SIMULACRO-' : ''}registo-de-auditoria-${date}.csv`,
    actor: (a) => (a === 'lantern' ? 'Lantern' : a.replace(/^reviewer ?/, '') || 'revisão'),
  },
);

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
  const t = useT(M);
  const lang = useLang();
  const session = s.session!;
  usePageTitle(t.pageTitle);
  const nightOf = session.nightOf ?? defaultNightOf(session.createdAt);
  const wl = useMemo(() => {
    const acts = actsWithIdentity(session.acts, session.identity, session.identityDecisions);
    return buildWorklist(acts, new Map(Object.entries(session.decisions)), { nightOf });
    // `lang` on purpose: who enters what, the source rows and the late-entry notes are worded in it
  }, [session, nightOf, lang]);
  const [clearing, setClearing] = useState(false);
  const allowExport = s.config?.allowExport ?? true;

  // One list per person who enters: the clinical secretary (admissions and transfers), then each nurse by
  // initials, with the questions that nurse still has to answer. It is named by role, never "you": the
  // person reviewing may not be the person entering.
  const people = useMemo(() => {
    const CLERK = '\u0000clerk';
    const m = new Map<string, { key: string; tab: string; who: string; clerk: boolean; acts: WorklistItem[]; questions: WorklistQuestion[] }>();
    const at = (key: string, tab: string, who: string, clerk = false) => m.get(key) ?? m.set(key, { key, tab, who, clerk, acts: [], questions: [] }).get(key)!;
    for (const r of wl.ready)
      if (r.enteredBy.role === 'clerk') at(CLERK, t.clerkTab, r.enteredBy.who, true).acts.push(r);
      else at(r.documentedBy || r.enteredBy.who, r.documentedBy || capital(r.enteredBy.who), r.enteredBy.who).acts.push(r);
    for (const q of wl.questions) at(q.owner, capital(q.owner), q.owner).questions.push(q);
    return [...m.values()].sort((x, y) => Number(y.clerk) - Number(x.clerk));
  }, [wl, t]);
  const [tab, setTab] = useState<string | null>(null);
  const current = people.find((p) => p.key === tab) ?? people[0];

  const entered = wl.ready.filter((r) => session.entered[r.actId]).length;
  const waitingRows = new Set(wl.questions.flatMap((q) => q.actIds)).size;
  const nextDay = formatDate(new Date(new Date(`${nightOf}T12:00`).getTime() + 86400_000).toISOString().slice(0, 10));

  const download = () => {
    const blob = new Blob([worklistCsv(wl, { drill: session.kind === 'drill' })], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = t.fileName(session.kind === 'drill', wl.undecided.length > 0, nightOf);
    a.click();
  };
  const toResult = session.kind === 'drill' && wl.undecided.length === 0;
  const field = 'min-h-[42px] rounded-md border border-rule-strong bg-sheet px-2.5 py-1.5 text-[16px]';

  return (
    <div className="flex min-h-full flex-col">
      <AppBar title={sessionTitle(session.kind)} steps={<Steps current="worklist" onGo={{ review: onBack }} />}>
        <Tally kind={session.kind} />
      </AppBar>
      <main className="@container mx-auto w-full max-w-[1280px] flex-1 px-4 pb-16 pt-7 sm:px-8 sm:pt-10 print:max-w-none print:p-0">
        <h1 className="font-display text-[34px] font-bold leading-[1.08] tracking-[-0.01em] text-night sm:text-[44px] print:text-[22px]">{t.title}</h1>

        {/* the three numbers that say where re-entry stands; "ready" and "entered" are kept apart on purpose */}
        <dl className="mt-5 grid border-y border-rule-strong sm:grid-cols-3 print:hidden">
          {[
            { n: wl.ready.length, label: t.sumReady(wl.ready.length), tone: '' },
            { n: wl.questions.length, label: t.sumWaiting(wl.questions.length, waitingRows), tone: wl.questions.length ? 'text-pen' : '' },
            { n: entered, label: t.sumEntered(wl.ready.length), tone: '' },
          ].map((x, i) => (
            <div key={i} className={`flex items-baseline gap-3 py-3 sm:px-5 sm:first:pl-0 ${i ? 'border-t border-rule sm:border-l sm:border-t-0' : ''}`}>
              <dd className={`text-[34px] font-extrabold leading-none tabular-nums ${x.tone || 'text-night'}`}>{x.n}</dd>
              <dt className={`text-[16px] leading-snug ${x.tone || 'text-ink-soft'}`}>{x.label}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-4 max-w-[76ch] text-[17px] text-ink-soft print:hidden">
          {t.rest}
          {t.readyNotEntered}
        </p>

        {wl.undecided.length > 0 && (
          <div className="no-print mt-5 max-w-[76ch]">
            <Notice tone="pen">
              {t.incomplete(wl.undecided.length)}{' '}
              <Button tone="secondary" className="ml-2" onClick={onBack}>
                {t.finishReview}
              </Button>
            </Notice>
          </div>
        )}

        <div className="no-print mt-6 flex flex-wrap items-end gap-x-6 gap-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {toResult && (
              <Button
                onClick={() => {
                  s.finish();
                  onResult();
                }}
              >
                {t.result}
              </Button>
            )}
            {allowExport && (
              <>
                <Button tone={toResult ? 'secondary' : 'primary'} onClick={download}>
                  <Download size={17} aria-hidden /> {t.csv}
                </Button>
                <Button tone="secondary" onClick={() => window.print()}>
                  <Printer size={17} aria-hidden /> {t.print}
                </Button>
              </>
            )}
          </div>
          <label className="flex flex-col gap-1 text-[15px] text-ink-soft">
            {t.nightStarted}
            <input type="date" value={nightOf} onChange={(e) => e.target.value && s.setNightOf(e.target.value)} className={`${field} text-ink`} />
          </label>
          <label className="flex flex-col gap-1 text-[15px] text-ink-soft">
            {t.initials}
            <input value={session.reviewer ?? ''} onChange={(e) => s.setReviewer(e.target.value)} className={`${field} w-28 uppercase text-ink`} maxLength={6} />
          </label>
        </div>
        <p className="no-print mt-2 max-w-[80ch] text-[15px] text-ink-faint">
          {t.days(formatDate(nightOf), nextDay)} {allowExport && (session.kind === 'drill' ? t.drillFile : t.realFile)}
        </p>

        {people.length > 0 && (
          <>
            <div role="tablist" aria-label={t.people} className="no-print -mx-4 mt-9 flex gap-x-1 overflow-x-auto border-b border-rule-strong px-4 sm:mx-0 sm:px-0">
              {people.map((p) => {
                const on = p.key === current?.key;
                return (
                  <button
                    key={p.key}
                    role="tab"
                    type="button"
                    aria-selected={on}
                    onClick={(e) => {
                      setTab(p.key);
                      e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                    }}
                    className={`flex shrink-0 items-baseline gap-2 whitespace-nowrap border-b-[3px] px-3 py-2 text-left ${on ? 'border-night text-night' : 'border-transparent text-ink-soft hover:text-night'}`}
                  >
                    <span className="text-[19px] font-extrabold tracking-[-0.01em]">{p.tab}</span>
                    <span className="text-[15px] tabular-nums">
                      {t.counts(p.acts.length, 0)}
                      {p.questions.length > 0 && (
                        <span className="text-pen">
                          {p.acts.length ? ', ' : ''}
                          {t.counts(0, p.questions.length)}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* on screen, one person at a time; on paper, everyone, each on a page of their own */}
            {people.map((p) => (
              <section key={p.key} role="tabpanel" aria-label={p.tab} className={`${p.key === current?.key ? '' : 'hidden'} break-before-page pt-7 print:block print:pt-0`}>
                <p className="print-only mb-4 border-b border-black pb-2 text-[13px] font-semibold">{t.printHead(p.who, formatDate(nightOf))}</p>
                {p.questions.length > 0 && (
                  <div className="mb-9">
                    <h2 className="text-[21px] font-extrabold tracking-[-0.01em] text-pen">{t.forOwner(p.tab, p.questions.length)}</h2>
                    <p className="mb-4 mt-1 max-w-[76ch] text-[16px] text-ink-soft print:hidden">{t.questionsText}</p>
                    <ul className="space-y-3">
                      {p.questions.map((q) => (
                        <QuestionCard key={q.ref} q={q} />
                      ))}
                    </ul>
                  </div>
                )}
                {p.acts.length > 0 ? (
                  <>
                    <h2 className="text-[21px] font-extrabold tracking-[-0.01em] text-night">{p.clerk ? t.clerk : t.toEnterLate(p.who, p.acts.length)}</h2>
                    <p className="mb-4 mt-1 max-w-[80ch] text-[16px] text-ink-soft">
                      {p.clerk ? (
                        t.clerkText
                      ) : (
                        <>
                          {t.nurseText} <span className="font-mono text-[15px] tracking-[-0.015em] text-ink">{p.acts[0]!.lateEntry}</span>
                        </>
                      )}
                    </p>
                    <ActsTable rows={p.acts} />
                  </>
                ) : (
                  <p className="max-w-[76ch] text-ink-soft">{t.nothingYet(p.who)}</p>
                )}
                <p className="print-only mt-8 text-[13px]">{t.printSign}</p>
              </section>
            ))}
          </>
        )}

        <section className="mt-14 max-w-[80ch] border-t border-rule-strong pt-7 print:hidden" aria-labelledby="keep">
          <h2 id="keep" className="text-[21px] font-extrabold tracking-[-0.01em] text-night">
            {t.keep}
          </h2>
          <p className="mt-1 text-[16px] text-ink-soft">{t.keepText}</p>
          <ul className="mt-2 space-y-1 text-[15px]">
            {session.files.map((f) => (
              <li key={f.id}>
                <span className="font-mono tracking-[-0.015em]">{f.name}</span>{' '}
                <span className="text-ink-soft">{t.fileLine(ct().version(f.versionLabel), f.rows.length, f.hash.slice(0, 12))}</span>
              </li>
            ))}
          </ul>
        </section>

        <AuditTrail />

        <section className="no-print mt-10 max-w-[80ch]" aria-labelledby="done">
          <h2 id="done" className="text-[21px] font-extrabold tracking-[-0.01em] text-night">
            {t.done}
          </h2>
          {clearing ? (
            <div className="mt-3 border-l-4 border-pen py-1 pl-4">
              <p>{t.clearText}</p>
              <span className="mt-3 flex flex-wrap gap-2">
                <Button tone="pen" onClick={() => void s.reset()}>
                  {t.remove}
                </Button>
                <Button tone="quiet" onClick={() => setClearing(false)}>
                  {t.cancel}
                </Button>
              </span>
            </div>
          ) : (
            <Button tone="secondary" className="mt-3" onClick={() => setClearing(true)}>
              {t.finish}
            </Button>
          )}
        </section>
      </main>
    </div>
  );
}

const capital = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/** A caution for whoever enters the act (a fall needs an incident report, a controlled drug the register): prominent, but ink, because it is not a decision. */
function Caution({ children }: { children: string }) {
  return (
    <span className="mt-1 flex items-start gap-1.5 text-[15px] font-semibold text-ink">
      <TriangleAlert size={16} className="mt-[3px] shrink-0" aria-hidden /> {children}
    </span>
  );
}

function QuestionCard({ q }: { q: WorklistQuestion }) {
  const t = useT(M);
  // the red rule at the left edge is the same mark as in the review: this needs an answer
  return (
    <li className="break-inside-avoid border border-rule-strong border-l-4 border-l-pen bg-sheet px-4 py-3">
      <p className="flex flex-wrap items-baseline gap-x-3 text-[16px] text-ink-soft">
        <span className="text-[19px] font-semibold text-ink">{q.patientName || t.noName}</span>
        {q.patientId && <span className="tabular-nums">{q.patientId}</span>}
        {q.bed && <span>{t.bed(q.bed)}</span>}
        <span className="tabular-nums">{q.time ? `${formatDate(q.date)} ${q.time}` : t.noTimeWritten}</span>
      </p>
      <ul className="mt-2 border border-rule">
        {q.rows.map((r) => (
          <li key={r.source} className="grid border-b border-rule last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)]">
            <span className="bg-gutter px-3 py-1.5 text-[14px] text-ink-soft">
              {r.source}
              {r.by && t.by(r.by)}
            </span>
            <span className="px-3 py-1.5 font-mono text-[16px] tracking-[-0.015em]">
              {r.text || <span className="font-sans text-ink-faint">{t.blank}</span>}
              {r.notes && <span className="text-ink-soft"> | {r.notes}</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 max-w-[86ch] text-[17px] font-semibold">{q.question}</p>
      <AnswerBox refId={q.ref} owner={q.owner} />
      <p className="print-only mt-3 text-[13px]">{t.printLine}</p>
    </li>
  );
}

function ActsTable({ rows }: { rows: WorklistItem[] }) {
  const s = useSession();
  const t = useT(M);
  const session = s.session!;
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <div className="space-y-6">
      {groupBy(rows, (r) => r.patientKey ?? r.patientName).map(([key, list]) => (
        <div key={key} className="break-inside-avoid">
          <h3 className="mb-1.5 flex flex-wrap items-baseline gap-x-3 text-[16px] text-ink-soft">
            <span className="text-[19px] font-semibold text-ink">{list[0]!.patientName || t.noNameShort}</span>
            <span className="tabular-nums">{list[0]!.patientId}</span>
            {list[0]!.bed && <span>{t.bed(list[0]!.bed)}</span>}
          </h3>
          <ul className="border border-rule-strong bg-sheet">
            {list.map((r) => {
              const tick = session.entered[r.actId] as Entered | boolean | undefined;
              return (
                <li key={r.actId} className="grid grid-cols-[2.75rem_minmax(0,1fr)] border-b border-rule last:border-b-0 @3xl:grid-cols-[2.75rem_7.5rem_minmax(0,1fr)_14rem]">
                  <label className="row-span-3 flex cursor-pointer justify-center bg-gutter pt-3 @3xl:row-span-1">
                    <input type="checkbox" aria-label={t.entered(r.act)} checked={!!tick} onChange={() => s.toggleEntered(r.actId)} className="h-5 w-5 accent-[var(--color-night)]" />
                  </label>
                  <div className="px-3 pt-2.5 text-[15px] tabular-nums @3xl:pb-2.5">
                    {r.time ? (
                      <>
                        <span className="text-ink-soft @3xl:block">{formatDate(r.date)} </span>
                        <span className="text-[17px] font-semibold">{r.time}</span>
                      </>
                    ) : (
                      <span className="text-pen">{t.noTime}</span>
                    )}
                  </div>
                  <div className="px-3 py-2 @3xl:border-l @3xl:border-rule @3xl:py-2.5">
                    <span className={`font-mono text-[16px] tracking-[-0.015em] ${tick ? 'text-ink-faint line-through' : ''}`}>{r.act}</span>
                    {r.highAlert && (
                      <span className="ml-2 inline-flex items-center gap-1 whitespace-nowrap rounded-[4px] border border-ink px-1.5 align-[1px] text-[13px] font-semibold">
                        <TriangleAlert size={12} aria-hidden /> {t.highAlert}
                      </span>
                    )}
                    {r.notes && <span className="block font-mono text-[15px] tracking-[-0.015em] text-ink-soft">{r.notes}</span>}
                    {r.corrected.length > 0 && (
                      <span className="mt-0.5 block text-[15px] text-ink-soft">
                        {t.corrected}{' '}
                        {r.corrected.map((c) => (
                          <span key={c.field}>
                            <s className="text-ink-faint">{c.from}</s> <span className="text-ink">{c.to}</span> <span className="text-ink-faint">({c.basis})</span>{' '}
                          </span>
                        ))}
                      </span>
                    )}
                    {r.confirmBy && <span className="mt-1 block text-[15px] font-semibold text-pen">{t.mustConfirm(r.confirmBy)}</span>}
                    {r.note && <span className="mt-0.5 block text-[15px]">{r.note}</span>}
                    {r.clinicalPartBy && <span className="mt-0.5 block text-[15px] text-ink-soft">{t.obsBy(r.clinicalPartBy)}</span>}
                    {r.followUp && <Caution>{r.followUp}</Caution>}
                    {tick && typeof tick === 'object' && (
                      <span className="mt-1 flex items-center gap-1.5 text-[15px] text-ink-soft">
                        <Check size={15} strokeWidth={2.5} aria-hidden />
                        {t.tickedAt(new Date(tick.at).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }), tick.by ?? '')}
                      </span>
                    )}
                  </div>
                  <div className="px-3 pb-2.5 text-[14px] text-ink-soft @3xl:border-l @3xl:border-rule @3xl:pt-2.5">
                    <span className="block">{categoryLabel(r.category)}</span>
                    <span className="block text-ink-faint">{r.source}</span>
                    <button
                      type="button"
                      className="no-print mt-1 inline-flex items-center gap-1 text-[15px] text-ballpoint underline-offset-2 hover:underline"
                      onClick={() => {
                        void navigator.clipboard?.writeText(r.lateEntry).then(() => setCopied(r.actId));
                      }}
                    >
                      {copied === r.actId ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied === r.actId ? t.copied : t.copyNote}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function AuditTrail() {
  const session = useSession().session!;
  const t = useT(M);
  const download = () => {
    const sep = ct().csv.separator;
    const esc = (v: string) => (v.includes(sep) || /["\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = [t.auditHead.join(sep), ...session.audit.map((e) => [String(e.seq), e.at, t.actor(e.actor), e.action, e.targetIds.join(' ')].map(esc).join(sep))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv + '\n'], { type: 'text/csv;charset=utf-8' }));
    a.download = t.auditFile(session.kind === 'drill', session.createdAt.slice(0, 10));
    a.click();
  };
  return (
    <details className="no-print mt-10 max-w-[80ch]">
      <summary className="cursor-pointer text-[21px] font-extrabold tracking-[-0.01em] text-night">{t.audit(session.audit.length)}</summary>
      <p className="mt-2 text-ink-soft">
        {t.auditText}{' '}
        <button className="text-ballpoint underline underline-offset-2" onClick={download}>
          {t.auditDownload}
        </button>
      </p>
      <ol className="mt-3 space-y-1 text-[14px]">
        {session.audit.map((e) => (
          <li key={e.seq} className="grid grid-cols-[5.5rem_7rem_1fr] gap-2">
            <span className="tabular-nums text-ink-faint">{new Date(e.at).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <span className="text-ink-soft">{t.actor(e.actor)}</span>
            <span>{e.action}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}
