import { useRef, useState } from 'react';
import { prepareLocalModel } from '../ai/models';
import { mapColumnsTask } from '../ai/prompts/v1/mapColumns';
import { sessionTitle, useSession } from '../app/session';
import { locale, msgs } from '../i18n/lang';
import { LangToggle, useT } from '../i18n/react';
import { nightMinutes } from '../core/text';
import { Button, LanternMark, Notice, Route } from '../ui/kit';
import { NightLine } from '../ui/NightLine';

const M = msgs(
  {
    night: [
      { t: '21:40', title: 'The record goes down', text: 'Night nurses log care in a spreadsheet on the ward PC, and on paper.' },
      { t: '03:10', title: 'Version 1 is emailed', text: 'The nurse in charge sends the spreadsheet to the clinical secretary.' },
      { t: '07:40', title: 'Version 2, reply-all', text: 'A nurse replies with a copy re-typed from notes: three corrections, and three rows lost when the sheet was sorted.' },
      { t: '08:30', title: 'The systems are back', text: 'Rita, the clinical secretary, has two versions and the 21:00 census. Everything has to go back into the record.' },
    ],
    nightTitle: 'The night in the drill',
    down: (h: number, m: number) => `The electronic record is down for ${h} h ${m} min`,
    headline: ['The systems are back.', 'Now last night has to go back into the record.'],
    lede:
      'Lantern compares the spreadsheets and notes a ward kept during an IT outage, links every act to the cell it came from, and helps you decide, row by row, what goes back into the record. Patient data stays on this device.',
    startDrill: 'Start the Ward 7B drill',
    saved: 'A review is saved in this browser:',
    savedWhat: (title: string, when: string, by: string) => `${title}, started ${when}${by ? ` by ${by}` : ''}.`,
    savedShared: 'Anyone using this browser profile can open it. It is deleted automatically 12 hours after the last change.',
    resume: 'Resume it',
    remove: 'Delete it from this PC',
    drillNote: 'The drill uses a fictional ward and fictional patients. It takes about ten minutes.',
    ownTitle: 'Use your own files',
    ownText:
      "Pick two versions of the same downtime log, and the census if you have one. They are read in this browser and never uploaded; comparisons run on this device only. Even without an on-device model, Lantern flags identical rows, corrections, possible repeat doses and identity problems. The reviewer decides whatever is left open.",
    census: 'Census (optional)',
    earlier: 'Earlier version',
    later: 'Later version',
    fileTypes: '.xlsx or .csv',
    open: 'Open these files',
    footer:
      "Lantern is a documentation aid for re-entering records after downtime. It does not diagnose, dose or triage, and it never writes into any record system. It is an open-source project built for Google's #BuildHybridAI hackathon, not a hospital product, and it has not been approved for use with real patients.",
    privacy: 'Data protection',
    source: 'Source code',
    lab: 'Diagnostics for IT',
    checking: 'Checking this device…',
    ready: (
      <>
        <strong className="font-semibold">The on-device AI (Gemini Nano) is ready on this PC.</strong> Lantern can read and compare the sheets here,
        with no network at all.
      </>
    ),
    notYet: (
      <>
        <strong className="font-semibold">The on-device AI is not on this PC yet.</strong> Chrome can download Google&apos;s Gemini Nano model (about 4 GB)
        so that Lantern reads and compares the sheets here, with no network. Do it before an outage. On a managed hospital PC, ask IT: their Chrome
        policies decide whether it is allowed.
      </>
    ),
    download: 'Download the on-device AI',
    downloading: (pct: number) => `Downloading ${pct}%`,
    none: (
      <>
        <strong className="font-semibold">This browser has no on-device AI.</strong> The drill still works: its fictional rows are compared in the cloud
        instead, and every call says where it ran. Your own files would stay on this PC: Lantern&apos;s rules still find copies, corrections, repeated
        doses and identity problems, and you decide the rest.
      </>
    ),
    needsChrome: 'Gemini Nano needs desktop Chrome',
    routes: 'Where the work runs',
    routeCloud:
      'The cloud only ever sees the fictional drill: a second opinion on disputed rows, or the whole comparison when this browser has no on-device AI. Your own files are never sent.',
    routeRule: "Lantern's own rules find exact copies, corrections, repeated doses and identity problems. They have the last word over any AI answer.",
  },
  {
    night: [
      { t: '21:40', title: 'O processo clínico eletrónico falha', text: 'A equipa de enfermagem da noite regista os cuidados numa folha de cálculo, no computador da enfermaria, e em papel.' },
      { t: '03:10', title: 'A versão 1 segue por email', text: 'Quem coordena o turno envia a folha ao secretariado clínico.' },
      { t: '07:40', title: 'A versão 2, em resposta a todos', text: 'Alguém da enfermagem responde com uma cópia refeita a partir das notas: três correções, e três linhas perdidas quando a folha foi ordenada.' },
      { t: '08:30', title: 'Os sistemas voltam', text: 'Rita, do secretariado clínico, tem duas versões e a lista de doentes das 21:00. Tudo tem de voltar ao processo clínico.' },
    ],
    nightTitle: 'A noite do simulacro',
    down: (h, m) => `Processo clínico eletrónico indisponível durante ${h} h ${m} min`,
    headline: ['Os sistemas voltaram.', 'Falta registar tudo o que aconteceu durante a noite.'],
    lede:
      'O Lantern compara as folhas de cálculo e as notas que uma enfermaria guardou durante uma falha informática, liga cada ato à célula de onde veio e ajuda a decidir, linha a linha, o que volta ao processo clínico. Os dados dos doentes ficam neste computador.',
    startDrill: 'Começar o simulacro da enfermaria 7B',
    saved: 'Há uma revisão guardada neste navegador:',
    savedWhat: (title, when, by) => `${title}, começada ${when}${by ? ` por ${by}` : ''}.`,
    savedShared: 'Qualquer pessoa que use este perfil do navegador a pode abrir. É apagada automaticamente 12 horas depois da última alteração.',
    resume: 'Retomar',
    remove: 'Apagar deste computador',
    drillNote: 'O simulacro usa uma enfermaria e doentes fictícios, com registos escritos em inglês. Demora cerca de dez minutos.',
    ownTitle: 'Usar os seus ficheiros',
    ownText:
      'Escolha duas versões da mesma folha de contingência e, se a tiver, a lista de doentes. São lidas neste navegador e nunca são enviadas; as comparações correm só neste computador. Mesmo sem IA local, o Lantern assinala linhas iguais, correções, possíveis repetições de dose e dúvidas de identificação. Cabe a quem faz a revisão decidir o que fica por esclarecer.',
    census: 'Lista de doentes (opcional)',
    earlier: 'Versão anterior',
    later: 'Versão posterior',
    fileTypes: '.xlsx ou .csv',
    open: 'Abrir estes ficheiros',
    footer:
      'O Lantern é um apoio à documentação para voltar a registar depois de uma falha dos sistemas. Não faz diagnósticos, não calcula doses nem faz triagem, e nunca escreve em nenhum sistema de registo. É um projeto de código aberto, feito para o hackathon #BuildHybridAI da Google; não é um produto hospitalar e não foi aprovado para uso com doentes reais.',
    privacy: 'Proteção de dados (em inglês)',
    source: 'Código-fonte',
    lab: 'Diagnóstico para a informática (em inglês)',
    checking: 'A verificar este computador…',
    ready: (
      <>
        <strong className="font-semibold">A IA local (Gemini Nano) está pronta neste computador.</strong> O Lantern pode ler e comparar as folhas aqui, sem
        rede nenhuma. O Gemini Nano ainda não suporta oficialmente português: as sugestões da IA podem ser menos fiáveis em folhas escritas em português,
        e as regras do Lantern continuam a aplicar-se.
      </>
    ),
    notYet: (
      <>
        <strong className="font-semibold">A IA local ainda não está neste computador.</strong> O Chrome pode transferir o modelo Gemini Nano, da Google
        (cerca de 4 GB), para o Lantern ler e comparar as folhas aqui, sem rede. Faça-o antes de uma falha. Num computador gerido pelo hospital, fale com
        a informática: são as políticas do Chrome que decidem se é permitido.
      </>
    ),
    download: 'Transferir a IA local',
    downloading: (pct) => `A transferir ${pct}%`,
    none: (
      <>
        <strong className="font-semibold">Este navegador não tem IA local.</strong> O simulacro funciona na mesma: as linhas fictícias são comparadas na
        nuvem, e cada pedido indica onde correu. Os seus ficheiros ficariam neste computador: o Lantern assinala na mesma cópias, correções, possíveis
        repetições de dose e dúvidas de identificação, e cabe a quem faz a revisão decidir o resto.
      </>
    ),
    needsChrome: 'O Gemini Nano precisa do Chrome para computador',
    routes: 'Onde corre o trabalho',
    routeCloud:
      'A nuvem só vê o simulacro fictício: uma segunda opinião sobre as linhas em dúvida, ou toda a comparação quando este navegador não tem IA local. Os seus ficheiros nunca são enviados.',
    routeRule: 'As regras do Lantern encontram cópias exatas, correções, doses repetidas e dúvidas de identificação. Prevalecem sobre qualquer resposta da IA.',
  },
);

export default function Start() {
  const s = useSession();
  const t = useT(M);
  const [preparing, setPreparing] = useState<number | null>(null);
  const [prepError, setPrepError] = useState<string | null>(null);
  const census = useRef<HTMLInputElement>(null);
  const earlier = useRef<HTMLInputElement>(null);
  const later = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState({ census: '', earlier: '', later: '' });

  async function prepare() {
    setPrepError(null);
    setPreparing(0);
    try {
      await prepareLocalModel(mapColumnsTask, (p) => setPreparing(p));
    } catch (e) {
      setPrepError(e instanceof Error ? e.message : String(e));
    }
    setPreparing(null);
    void s.refreshLocal();
  }

  const importFiles = () => {
    const e = earlier.current?.files?.[0];
    const l = later.current?.files?.[0];
    if (!e || !l) return;
    void s.startImport({ census: census.current?.files?.[0], earlier: e, later: l });
  };

  // the drill's night, to scale: 21:00 to 09:00, with the record down from the first event to the last
  const at = t.night.map((n) => nightMinutes(n.t)!);
  const down = at[at.length - 1]! - at[0]!;

  return (
    <main className="mx-auto max-w-[1360px] px-4 pb-16 pt-5 sm:px-8 sm:pt-7">
      <header className="flex items-center justify-between gap-4 text-night">
        <span className="flex items-center gap-2">
          <LanternMark size={30} />
          <span className="text-[22px] font-extrabold tracking-[-0.01em]">Lantern</span>
        </span>
        <LangToggle />
      </header>

      <h1 className="mt-10 font-display text-[42px] font-bold leading-[1.04] tracking-[-0.015em] text-night sm:mt-14 sm:text-[54px] lg:text-[64px]">
        <span className="block">{t.headline[0]}</span>
        <span className="block max-w-[24ch]">{t.headline[1]}</span>
      </h1>

      <div className="mt-7 grid gap-x-16 gap-y-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <p className="max-w-[58ch] text-[19px] leading-[1.5] text-ink-soft sm:text-[21px]">{t.lede}</p>
        <div className="lg:w-[28rem]">
          <Button size="lg" onClick={() => void s.startDrill()} disabled={!!s.busy} className="w-full sm:w-auto lg:w-full lg:whitespace-nowrap">
            {t.startDrill}
          </Button>
          <p className="mt-2.5 text-[15px] text-ink-soft">{t.drillNote}</p>
        </div>
      </div>

      {s.resumable && (
        <div className="mt-6 max-w-[70ch] border-l-4 border-night bg-sheet px-4 py-3 text-[16px]">
          <p>
            <strong className="font-semibold">{t.saved}</strong>{' '}
            {t.savedWhat(
              sessionTitle(s.resumable.kind).toLowerCase(),
              new Date(s.resumable.createdAt).toLocaleString(locale(), { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
              s.resumable.reviewer ?? '',
            )}{' '}
            {s.resumable.kind === 'import' && t.savedShared}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button tone="secondary" onClick={s.resume}>
              {t.resume}
            </Button>
            <Button tone="quiet" onClick={() => void s.reset()}>
              {t.remove}
            </Button>
          </div>
        </div>
      )}
      {s.error && (
        <div className="mt-5 max-w-[70ch]">
          <Notice tone="pen">{s.error}</Notice>
        </div>
      )}

      <section aria-labelledby="night" className="mt-10 sm:mt-12">
        <h2 id="night" className="text-[15px] text-ink-soft">
          {t.nightTitle}
        </h2>
        <div className="mt-1 hidden md:block" aria-hidden>
          <NightLine
            from={nightMinutes('21:00')!}
            to={nightMinutes('09:00')!}
            down={[at[0]!, at[at.length - 1]!]}
            marks={t.night.map((n, i) => ({ at: at[i]!, label: n.t }))}
            inside={t.down(Math.floor(down / 60), down % 60)}
            label={t.nightTitle}
            animate
          />
        </div>
        {/* on a phone the night runs down the page instead: a dark band at the left, a lamp at each event */}
        <ol className="relative mt-4 border-l-[10px] border-night pl-5 md:mt-3 md:grid md:grid-cols-4 md:gap-x-8 md:border-l-0 md:pl-0">
          {t.night.map((n) => (
            <li key={n.t} className="relative mb-6 last:mb-0 md:mb-0">
              <span className="absolute -left-[32px] top-[7px] h-[14px] w-[14px] rounded-full bg-lamp md:hidden" aria-hidden />
              <time className="block text-[19px] font-extrabold tabular-nums text-night md:hidden">{n.t}</time>
              <p className="text-[17px] font-semibold leading-snug text-night">
                <span className="hidden tabular-nums md:inline">{n.t} </span>
                {n.title}
              </p>
              <p className="mt-1 max-w-[42ch] text-[16px] leading-[1.45] text-ink-soft">{n.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-12 grid gap-x-16 gap-y-12 border-t border-rule-strong pt-9 lg:grid-cols-2">
        <section aria-labelledby="routes">
          <h2 id="routes" className="text-[21px] font-extrabold tracking-[-0.01em] text-night">
            {t.routes}
          </h2>
          <ul className="mt-4 space-y-4 text-[16px] leading-[1.45]">
            <li className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[10.25rem_minmax(0,1fr)]">
              <span>
                <Route source="on_device" />
              </span>
              <div>
                <Readiness local={s.local} preparing={preparing} onPrepare={prepare} />
                {prepError && <p className="mt-2 text-pen">{prepError}</p>}
              </div>
            </li>
            <li className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[10.25rem_minmax(0,1fr)]">
              <span>
                <Route source="in_cloud" />
              </span>
              <p>{t.routeCloud}</p>
            </li>
            <li className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[10.25rem_minmax(0,1fr)]">
              <span>
                <Route source="rule" />
              </span>
              <p>{t.routeRule}</p>
            </li>
          </ul>
        </section>

        <section aria-labelledby="own">
          <h2 id="own" className="text-[21px] font-extrabold tracking-[-0.01em] text-night">
            {t.ownTitle}
          </h2>
          <p className="mt-4 max-w-[62ch] text-[16px] leading-[1.45] text-ink-soft">{t.ownText}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <FilePick label={t.census} hint={t.fileTypes} inputRef={census} picked={picked.census} onPick={(n) => setPicked((p) => ({ ...p, census: n }))} />
            <FilePick label={t.earlier} hint={t.fileTypes} inputRef={earlier} picked={picked.earlier} onPick={(n) => setPicked((p) => ({ ...p, earlier: n }))} />
            <FilePick label={t.later} hint={t.fileTypes} inputRef={later} picked={picked.later} onPick={(n) => setPicked((p) => ({ ...p, later: n }))} />
          </div>
          <Button tone="secondary" className="mt-4" disabled={!picked.earlier || !picked.later || !!s.busy} onClick={importFiles}>
            {t.open}
          </Button>
        </section>
      </div>

      <footer className="mt-14 max-w-[84ch] text-[15px] text-ink-faint">
        {t.footer}{' '}
        <span className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          <a className="underline underline-offset-2 hover:text-ink" href="https://github.com/JohnnyBazzinga/lantern/blob/main/docs/PRIVACY.md" target="_blank" rel="noreferrer">
            {t.privacy}
          </a>
          <a className="underline underline-offset-2 hover:text-ink" href="https://github.com/JohnnyBazzinga/lantern" target="_blank" rel="noreferrer">
            {t.source}
          </a>
          <a className="underline underline-offset-2 hover:text-ink" href="#/lab">
            {t.lab}
          </a>
        </span>
      </footer>
    </main>
  );
}

/** Whether this PC has the on-device model: the first line of "where the work runs". */
function Readiness({ local, preparing, onPrepare }: { local: ReturnType<typeof useSession>['local']; preparing: number | null; onPrepare: () => void }) {
  const t = useT(M);
  if (local === 'checking') return <p className="text-ink-soft">{t.checking}</p>;
  if (local === 'available') return <p>{t.ready}</p>;
  if (local === 'downloadable' || local === 'downloading')
    return (
      <>
        <p>{t.notYet}</p>
        <Button tone="secondary" className="mt-3" onClick={onPrepare} disabled={preparing !== null}>
          {preparing === null ? t.download : t.downloading(Math.round(preparing * 100))}
        </Button>
      </>
    );
  return (
    <p>
      {t.none}{' '}
      <a className="underline underline-offset-2" href="https://developer.chrome.com/docs/ai/get-started" target="_blank" rel="noreferrer">
        {t.needsChrome}
      </a>
      .
    </p>
  );
}

function FilePick({
  label,
  hint,
  inputRef,
  picked,
  onPick,
}: {
  label: string;
  hint: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  picked: string;
  onPick: (n: string) => void;
}) {
  return (
    <label className="flex cursor-pointer flex-col gap-0.5 rounded-md border border-dashed border-rule-strong bg-sheet px-4 py-3 hover:border-night focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-ballpoint">
      <span className="text-[16px] font-semibold">{label}</span>
      <span className={`truncate text-[15px] ${picked ? 'font-mono text-ink' : 'text-ink-faint'}`}>{picked || hint}</span>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="sr-only"
        onChange={(e) => onPick(e.target.files?.[0]?.name ?? '')}
      />
    </label>
  );
}
