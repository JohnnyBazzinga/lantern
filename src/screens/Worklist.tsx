import { useMemo, useState } from 'react';
import { Copy, Download, Printer } from 'lucide-react';
import { sessionTitle, useSession } from '../app/session';
import type { Entered } from '../app/store';
import { categoryLabel } from '../core/clinical';
import { ct, ptAt } from '../core/i18n';
import type { Act } from '../core/types';
import { buildWorklist, defaultNightOf, formatDate, worklistCsv, type WorklistItem, type WorklistQuestion } from '../core/worklist';
import { locale, msgs } from '../i18n/lang';
import { LangToggle, useLang, useT } from '../i18n/react';
import { AnswerBox } from '../ui/AnswerBox';
import { Button, LanternMark, Notice } from '../ui/kit';

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
    questionsFirst: (n: number) => ` ${n} ${n === 1 ? 'question needs' : 'questions need'} an answer first.`,
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
    forOwner: (owner: string, n: number) => `For ${owner} (${n})`,
    clerk: 'For you: admissions and transfers',
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
    questionsFirst: (n) => ` ${n} ${n === 1 ? 'pergunta precisa' : 'perguntas precisam'} de resposta primeiro.`,
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
    forOwner: (owner, n) => `Para ${owner} (${n})`,
    clerk: 'Para si: admissões e transferências',
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
  const nightOf = session.nightOf ?? defaultNightOf(session.createdAt);
  const wl = useMemo(() => {
    const acts = actsWithIdentity(session.acts, session.identity, session.identityDecisions);
    return buildWorklist(acts, new Map(Object.entries(session.decisions)), { nightOf });
    // `lang` on purpose: who enters what, the source rows and the late-entry notes are worded in it
  }, [session, nightOf, lang]);
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
    a.download = t.fileName(session.kind === 'drill', wl.undecided.length > 0, nightOf);
    a.click();
  };

  return (
    <main className="mx-auto max-w-5xl px-5 pb-20 pt-8 sm:px-8">
      <header className="no-print mb-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <LanternMark />
          <span className="text-lg font-semibold">Lantern</span>
          <span className="ml-2 text-ink-soft">{sessionTitle(session.kind)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button tone="quiet" onClick={onBack}>
            {t.back}
          </Button>
          <Button tone="secondary" onClick={() => setClearing(true)}>
            {t.finish}
          </Button>
          <LangToggle className="ml-1" />
        </div>
      </header>

      {clearing && (
        <div className="no-print mb-8">
          <Notice tone="pen">
            {t.clearText}
            <span className="mt-3 flex flex-wrap gap-2">
              <Button tone="pen" onClick={() => void s.reset()}>
                {t.remove}
              </Button>
              <Button tone="quiet" onClick={() => setClearing(false)}>
                {t.cancel}
              </Button>
            </span>
          </Notice>
        </div>
      )}

      <h1 className="text-3xl font-semibold tracking-[-0.01em]">{t.title}</h1>
      <p className="mt-3 max-w-[68ch] text-lg text-ink-soft">
        {t.ready(wl.ready.length)}
        {clerk.length > 0 && t.forYou(clerk.length)}
        {t.rest}
        {wl.questions.length > 0 && t.questionsFirst(wl.questions.length)}
        {t.readyNotEntered}
      </p>

      <div className="no-print mt-5 flex flex-wrap items-end gap-x-6 gap-y-3 text-[15px]">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-soft">{t.nightStarted}</span>
          <input
            type="date"
            value={nightOf}
            onChange={(e) => e.target.value && s.setNightOf(e.target.value)}
            className="rounded-md border border-rule-strong bg-sheet px-2 py-1"
          />
        </label>
        <span className="pb-1.5 text-sm text-ink-soft">{t.days(formatDate(nightOf), nextDay)}</span>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-soft">{t.initials}</span>
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
            {t.incomplete(wl.undecided.length)}{' '}
            <Button tone="secondary" className="ml-2" onClick={onBack}>
              {t.finishReview}
            </Button>
          </Notice>
        </div>
      )}

      <div className="no-print mt-6 flex flex-wrap items-center gap-3">
        {allowExport && (
          <>
            <Button onClick={download}>
              <Download size={16} /> {t.csv}
            </Button>
            <Button tone="secondary" onClick={() => window.print()}>
              <Printer size={16} /> {t.print}
            </Button>
          </>
        )}
        {session.kind === 'drill' && wl.undecided.length === 0 && (
          <Button tone="secondary" onClick={() => { s.finish(); onResult(); }}>
            {t.result}
          </Button>
        )}
        <span className="text-sm tabular-nums text-ink-soft">{t.ticked(entered, wl.ready.length)}</span>
      </div>
      {allowExport && (
        <p className="no-print mt-2 max-w-[70ch] text-sm text-ink-faint">
          {session.kind === 'drill' ? t.drillFile : t.realFile}
        </p>
      )}

      {wl.questions.length > 0 && (
        <section className="mt-10" aria-labelledby="questions">
          <h2 id="questions" className="mb-1 text-xl font-semibold text-pen">
            {t.questions}
          </h2>
          <p className="mb-4 max-w-[68ch] text-ink-soft">{t.questionsText}</p>
          {groupBy(wl.questions, (q) => q.owner).map(([owner, qs]) => (
            <div key={owner} className="mb-6 break-inside-avoid">
              <h3 className="mb-2 border-b border-pen/40 pb-1 text-lg font-semibold">
                {t.forOwner(owner, qs.length)}
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
            {t.clerk}
          </h2>
          <p className="mb-3 max-w-[68ch] text-ink-soft">{t.clerkText}</p>
          <ActsTable rows={clerk} />
        </section>
      )}

      {nurses.map(([who, rows]) => (
        <section key={who} className="mt-10 break-before-page" aria-label={t.toEnter(who)}>
          <h2 className="text-xl font-semibold">{t.toEnterLate(who, rows.length)}</h2>
          <p className="mb-3 max-w-[70ch] text-ink-soft">
            {t.nurseText}{' '}
            <span className="font-mono text-[14px]">{rows[0]!.lateEntry}</span>
          </p>
          <ActsTable rows={rows} />
        </section>
      ))}

      <section className="mt-12 max-w-[72ch]" aria-labelledby="keep">
        <h2 id="keep" className="text-xl font-semibold">
          {t.keep}
        </h2>
        <p className="mt-1 text-ink-soft">{t.keepText}</p>
        <ul className="mt-2 space-y-1 text-[15px]">
          {session.files.map((f) => (
            <li key={f.id}>
              <span className="font-mono">{f.name}</span> <span className="text-ink-soft">{t.fileLine(ct().version(f.versionLabel), f.rows.length, f.hash.slice(0, 12))}</span>
            </li>
          ))}
        </ul>
      </section>

      <AuditTrail />
    </main>
  );
}

function QuestionCard({ q }: { q: WorklistQuestion }) {
  const t = useT(M);
  return (
    <li className="rounded-[3px] border border-pen/40 bg-sheet px-4 py-3">
      <p className="text-[15px]">
        <span className="font-semibold">{q.patientName || t.noName}</span>
        {q.patientId && <span className="ml-2 text-ink-soft">{q.patientId}</span>}
        {q.bed && <span className="ml-2 text-ink-soft">{t.bed(q.bed)}</span>}
        <span className="ml-2 text-ink-soft">{q.time ? `${formatDate(q.date)} ${q.time}` : t.noTimeWritten}</span>
      </p>
      <ul className="mt-1.5 space-y-0.5">
        {q.rows.map((r) => (
          <li key={r.source} className="text-[15px]">
            <span className="font-mono">{r.text || t.blank}</span>
            {r.notes && <span className="font-mono text-ink-soft"> | {r.notes}</span>}
            <span className="ml-2 text-sm text-ink-faint">
              {r.source}
              {r.by && t.by(r.by)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[15px] font-semibold">{q.question}</p>
      <AnswerBox refId={q.ref} owner={q.owner} />
      <p className="print-only mt-3 text-[14px]">{t.printLine}</p>
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
          <h3 className="mb-1 flex flex-wrap items-baseline gap-x-3 border-b border-rule-strong pb-1">
            <span className="text-lg font-semibold">{list[0]!.patientName || t.noNameShort}</span>
            <span className="text-ink-soft">{list[0]!.patientId}</span>
            {list[0]!.bed && <span className="text-ink-soft">{t.bed(list[0]!.bed)}</span>}
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
                        aria-label={t.entered(r.act)}
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
                        <span className="text-pen">{t.noTime}</span>
                      )}
                    </td>
                    <td className="py-2">
                      <span className={`font-mono text-[15px] ${tick ? 'text-ink-faint line-through' : ''}`}>{r.act}</span>
                      {r.highAlert && <span className="ml-2 rounded-sm border border-pen/50 px-1 text-[12px] font-semibold text-pen">{t.highAlert}</span>}
                      {r.corrected.length > 0 && (
                        <span className="mt-0.5 block text-sm text-ink-soft">
                          {t.corrected}{' '}
                          {r.corrected.map((c) => (
                            <span key={c.field}>
                              <s className="text-ink-faint">{c.from}</s> {c.to} <span className="text-ink-faint">({c.basis})</span>{' '}
                            </span>
                          ))}
                        </span>
                      )}
                      {r.confirmBy && <span className="block text-sm font-semibold text-pen">{t.mustConfirm(r.confirmBy)}</span>}
                      {r.note && <span className="block text-sm text-scrub">{r.note}</span>}
                      {r.clinicalPartBy && <span className="block text-sm text-ink-soft">{t.obsBy(r.clinicalPartBy)}</span>}
                      {r.followUp && <span className="block text-sm font-semibold text-pen">{r.followUp}</span>}
                      {r.notes && <span className="block text-sm text-ink-soft">{r.notes}</span>}
                      {tick && typeof tick === 'object' && (
                        <span className="block text-sm text-scrub">
                          {t.tickedAt(new Date(tick.at).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }), tick.by ?? '')}
                        </span>
                      )}
                    </td>
                    <td className="w-28 py-2 text-sm text-ink-soft">{categoryLabel(r.category)}</td>
                    <td className="w-44 py-2 text-right text-sm text-ink-faint">
                      {r.source}
                      <button
                        className="no-print mt-1 flex w-full items-center justify-end gap-1 text-ballpoint hover:underline"
                        onClick={() => {
                          void navigator.clipboard?.writeText(r.lateEntry).then(() => setCopied(r.actId));
                        }}
                      >
                        <Copy size={13} /> {copied === r.actId ? t.copied : t.copyNote}
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
    <details className="no-print mt-12 max-w-[80ch]">
      <summary className="cursor-pointer text-xl font-semibold">{t.audit(session.audit.length)}</summary>
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
