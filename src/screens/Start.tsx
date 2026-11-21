import { useRef, useState } from 'react';
import { prepareLocalModel } from '../ai/models';
import { mapColumnsTask } from '../ai/prompts/v1/mapColumns';
import { sessionTitle, useSession } from '../app/session';
import { locale, msgs } from '../i18n/lang';
import { LangToggle, useT } from '../i18n/react';
import { Button, LanternMark, Notice } from '../ui/kit';

const M = msgs(
  {
    night: [
      { t: '21:40', text: 'The electronic record goes down. Night nurses log care in a spreadsheet on the ward PC, and on paper.' },
      { t: '03:10', text: 'The nurse in charge emails the spreadsheet to the clinical secretary.' },
      { t: '07:40', text: 'A nurse replies to all with a copy re-typed from notes: three corrections, and three rows lost when the sheet was sorted.' },
      { t: '08:30', text: 'Systems are back. Rita, the clinical secretary, has two versions and the 21:00 census. Everything has to go back into the record.' },
    ],
    nightTitle: 'The night in the drill',
    headline: 'The systems are back. Now last night has to go back into the record.',
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
  },
  {
    night: [
      { t: '21:40', text: 'O processo clínico eletrónico deixa de funcionar. A equipa de enfermagem da noite regista os cuidados numa folha de cálculo, no computador da enfermaria, e em papel.' },
      { t: '03:10', text: 'Quem coordena o turno envia a folha por email ao secretariado clínico.' },
      { t: '07:40', text: 'Alguém da enfermagem responde a todos com uma cópia refeita a partir das notas: três correções, e três linhas perdidas quando a folha foi ordenada.' },
      { t: '08:30', text: 'Os sistemas voltam. Rita, do secretariado clínico, tem duas versões e a lista de doentes das 21:00. Tudo tem de voltar ao processo clínico.' },
    ],
    nightTitle: 'A noite do simulacro',
    headline: 'Os sistemas voltaram. Falta registar tudo o que aconteceu durante a noite.',
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

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8">
      <header className="mb-14 flex items-center justify-between gap-4 text-ink">
        <span className="flex items-center gap-2">
          <LanternMark />
          <span className="text-lg font-semibold">Lantern</span>
        </span>
        <LangToggle />
      </header>

      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <section>
          <h1 className="max-w-[18ch] text-[2.6rem] font-semibold leading-[1.08] tracking-[-0.015em] sm:text-[3.2rem]">{t.headline}</h1>
          <p className="mt-6 max-w-[60ch] text-lg text-ink-soft">{t.lede}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button onClick={() => void s.startDrill()} disabled={!!s.busy} className="px-5 py-3 text-base">
              {t.startDrill}
            </Button>
          </div>
          {s.resumable && (
            <div className="mt-5 max-w-[62ch] rounded-md border border-rule-strong bg-sheet px-4 py-3 text-[15px]">
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
          <p className="mt-3 text-sm text-ink-faint">{t.drillNote}</p>

          <div className="mt-8 max-w-[62ch]">
            <Readiness local={s.local} preparing={preparing} onPrepare={prepare} />
            {prepError && <p className="mt-2 text-sm text-pen">{prepError}</p>}
          </div>
          {s.error && (
            <div className="mt-4 max-w-[62ch]">
              <Notice tone="pen">{s.error}</Notice>
            </div>
          )}
        </section>

        <section aria-labelledby="night" className="lg:pt-3">
          <h2 id="night" className="mb-5 text-[15px] font-semibold text-ink-soft">
            {t.nightTitle}
          </h2>
          <ol className="relative border-l-2 border-rule pl-6">
            {t.night.map((n) => (
              <li key={n.t} className="mb-7 last:mb-0">
                <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-paper bg-ink" aria-hidden />
                <time className="block text-xl font-semibold tabular-nums">{n.t}</time>
                <p className="mt-1 max-w-[46ch] text-ink-soft">{n.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="mt-20 max-w-3xl border-t border-rule pt-10" aria-labelledby="own">
        <h2 id="own" className="text-xl font-semibold">
          {t.ownTitle}
        </h2>
        <p className="mt-2 max-w-[62ch] text-ink-soft">{t.ownText}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <FilePick label={t.census} hint={t.fileTypes} inputRef={census} picked={picked.census} onPick={(n) => setPicked((p) => ({ ...p, census: n }))} />
          <FilePick label={t.earlier} hint={t.fileTypes} inputRef={earlier} picked={picked.earlier} onPick={(n) => setPicked((p) => ({ ...p, earlier: n }))} />
          <FilePick label={t.later} hint={t.fileTypes} inputRef={later} picked={picked.later} onPick={(n) => setPicked((p) => ({ ...p, later: n }))} />
        </div>
        <Button tone="secondary" className="mt-5" disabled={!picked.earlier || !picked.later || !!s.busy} onClick={importFiles}>
          {t.open}
        </Button>
      </section>

      <footer className="mt-20 max-w-[70ch] text-sm text-ink-faint">
        {t.footer}{' '}
        <a className="underline underline-offset-2" href="https://github.com/JohnnyBazzinga/lantern/blob/main/docs/PRIVACY.md" target="_blank" rel="noreferrer">
          {t.privacy}
        </a>
        <a className="ml-4 underline underline-offset-2" href="https://github.com/JohnnyBazzinga/lantern" target="_blank" rel="noreferrer">
          {t.source}
        </a>
        <a className="ml-4 underline underline-offset-2" href="#/lab">
          {t.lab}
        </a>
      </footer>
    </main>
  );
}

function Readiness({ local, preparing, onPrepare }: { local: ReturnType<typeof useSession>['local']; preparing: number | null; onPrepare: () => void }) {
  const t = useT(M);
  if (local === 'checking') return <Notice>{t.checking}</Notice>;
  if (local === 'available') return <Notice tone="scrub">{t.ready}</Notice>;
  if (local === 'downloadable' || local === 'downloading')
    return (
      <Notice>
        <p>{t.notYet}</p>
        <div className="mt-3 flex items-center gap-3">
          <Button tone="secondary" onClick={onPrepare} disabled={preparing !== null}>
            {preparing === null ? t.download : t.downloading(Math.round(preparing * 100))}
          </Button>
        </div>
      </Notice>
    );
  return (
    <Notice>
      {t.none}{' '}
      <a className="underline underline-offset-2" href="https://developer.chrome.com/docs/ai/get-started" target="_blank" rel="noreferrer">
        {t.needsChrome}
      </a>
      .
    </Notice>
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
    <label className="flex cursor-pointer flex-col gap-1 rounded-md border border-dashed border-rule-strong bg-sheet px-4 py-3 hover:border-ink">
      <span className="text-sm font-semibold">{label}</span>
      <span className="truncate text-sm text-ink-faint">{picked || hint}</span>
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
