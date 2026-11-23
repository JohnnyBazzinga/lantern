import { useRef, useState, type ReactNode } from 'react';
import { prepareLocalModel } from '../ai/models';
import { mapColumnsTask } from '../ai/prompts/v1/mapColumns';
import { sessionTitle, useSession } from '../app/session';
import { locale, msgs } from '../i18n/lang';
import { LangToggle, useT } from '../i18n/react';
import { ArrowRight, BookOpen, Check, Clock, Cloud, CloudOff, FileText, Laptop, Play, Scale, ScanSearch, Upload, Users } from 'lucide-react';
import { Backdrop } from '../ui/Backdrop';
import { HeroNight } from '../ui/HeroNight';
import { Button, Card, Kicker, Marked, Notice, Wordmark, usePageTitle } from '../ui/kit';

const M = msgs(
  {
    night: [
      { t: '21:40', title: 'The record goes down', text: 'Night nurses log care in a spreadsheet on the ward PC, and on paper.' },
      { t: '03:10', title: 'Version 1 is emailed', text: 'The nurse in charge sends the spreadsheet to the clinical secretary.' },
      { t: '07:40', title: 'Version 2, reply-all', text: 'A nurse replies with a copy re-typed from notes: three corrections, and three rows lost when the sheet was sorted.' },
      { t: '08:30', title: 'The systems are back', text: 'Rita, the clinical secretary, has two versions and the 21:00 census. Everything has to go back into the record.' },
    ],
    nightTitle: 'The night in the drill',
    nav: { overview: 'Overview', drill: 'The drill', how: 'How it works', privacy: 'Data & privacy' },
    navLabel: 'On this page',
    kicker: 'Outage recovery for real care',
    head: ['Bring the night back', 'into', 'the record.'],
    seeHow: 'See how it works',
    minutes: '~10 minutes',
    fictional: 'Fictional ward · fictional patients',
    heroNotes: [
      { t: '21:40', text: 'Record goes down' },
      { t: '03:10', text: 'v1 emailed' },
      { t: '07:40', text: 'v2, reply-all' },
      { t: '08:30', text: 'Systems are back' },
    ],
    heroChip: 'Match · Rebuild · Restore',
    stateDevice: 'On this device',
    stateNone: 'No on-device AI',
    wardSign: 'Ward 7B',
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
    hides:
      'Hidden in the two versions: three corrections, three rows lost when the sheet was sorted, four patient-identity problems, two entries only their author can explain, and three pairs that look alike but are separate acts. At the end you see what became of each.',
    pickFirst: 'Pick the earlier and the later version to open them.',
    wrongType: (file: string) => `Lantern cannot read ${file}: it is not a spreadsheet. Pick an .xlsx or .csv file exported from the log.`,
    importFailed: 'Lantern could not open these files. Check that each one is an .xlsx or .csv copy of the log, then pick them again. Nothing was uploaded.',
    drillFailed: 'The drill could not be opened. Reload the page and try again; if you are offline, open Lantern once with a connection first.',
    details: 'What the browser reported:',
    ownTitle: 'Use your own files',
    ownText:
      'Pick two versions of the same downtime log, and the census if you have one. They are read in this browser and never uploaded; comparisons run on this device only.',
    census: 'Census (optional)',
    earlier: 'Earlier version',
    later: 'Later version',
    fileTypes: '.xlsx or .csv',
    open: 'Open these files',
    footer:
      "Lantern is a documentation aid for re-entering records after downtime. It does not diagnose, dose or triage, and it never writes into any record system. It is an open-source project built for Google's #BuildHybridAI hackathon, not a hospital product, and it has not been approved for use with real patients.",
    privacy: 'Data protection',
    source: 'Source code',
    lab: 'Check this computer (for IT)',
    checkPc: 'Check this computer',
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
    nav: { overview: 'Visão geral', drill: 'O simulacro', how: 'Como funciona', privacy: 'Dados e privacidade' },
    navLabel: 'Nesta página',
    kicker: 'Recuperar os registos depois de uma falha',
    head: ['Devolva a noite', 'ao', 'processo clínico.'],
    seeHow: 'Ver como funciona',
    minutes: '~10 minutos',
    fictional: 'Enfermaria e doentes fictícios · registos em inglês',
    heroNotes: [
      { t: '21:40', text: 'Registo em baixo' },
      { t: '03:10', text: 'v1 por email' },
      { t: '07:40', text: 'v2, resposta a todos' },
      { t: '08:30', text: 'Sistemas de volta' },
    ],
    heroChip: 'Comparar · Reconstruir · Repor',
    stateDevice: 'Neste computador',
    stateNone: 'Sem IA local',
    wardSign: 'Enfermaria 7B',
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
    hides:
      'Escondidos nas duas versões: três correções, três linhas perdidas quando a folha foi ordenada, quatro dúvidas de identificação, dois registos que só quem os escreveu pode explicar e três pares parecidos que são atos diferentes. No fim, vê o que aconteceu a cada um.',
    pickFirst: 'Escolha a versão anterior e a posterior para as abrir.',
    wrongType: (file) => `O Lantern não consegue ler ${file}: não é uma folha de cálculo. Escolha um ficheiro .xlsx ou .csv exportado da folha de contingência.`,
    importFailed: 'O Lantern não conseguiu abrir estes ficheiros. Confirme que cada um é uma cópia .xlsx ou .csv da folha de contingência e volte a escolhê-los. Nada foi enviado.',
    drillFailed: 'Não foi possível abrir o simulacro. Recarregue a página e tente outra vez; se estiver sem rede, abra o Lantern uma vez com ligação primeiro.',
    details: 'O que o navegador indicou:',
    ownTitle: 'Usar os seus ficheiros',
    ownText:
      'Escolha duas versões da mesma folha de contingência e, se a tiver, a lista de doentes. São lidas neste navegador e nunca são enviadas; as comparações correm só neste computador.',
    census: 'Lista de doentes (opcional)',
    earlier: 'Versão anterior',
    later: 'Versão posterior',
    fileTypes: '.xlsx ou .csv',
    open: 'Abrir estes ficheiros',
    footer:
      'O Lantern é um apoio à documentação para voltar a registar depois de uma falha dos sistemas. Não faz diagnósticos, não calcula doses nem faz triagem, e nunca escreve em nenhum sistema de registo. É um projeto de código aberto, feito para o hackathon #BuildHybridAI da Google; não é um produto hospitalar e não foi aprovado para uso com doentes reais.',
    privacy: 'Proteção de dados (em inglês)',
    source: 'Código-fonte',
    lab: 'Verificar este computador (para a informática)',
    checkPc: 'Verificar este computador',
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
  usePageTitle('');
  const [preparing, setPreparing] = useState<number | null>(null);
  const [prepError, setPrepError] = useState<string | null>(null);
  const census = useRef<HTMLInputElement>(null);
  const earlier = useRef<HTMLInputElement>(null);
  const later = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState({ census: '', earlier: '', later: '' });
  // which action the last error belongs to, so it is shown beside that action and in its words
  const [tried, setTried] = useState<'drill' | 'import' | null>(null);
  const [wrongType, setWrongType] = useState<string | null>(null);

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
    const c = census.current?.files?.[0];
    const odd = [c, e, l].find((f) => f && !/\.(xlsx|xls|csv)$/i.test(f.name));
    setWrongType(odd ? odd.name : null);
    if (odd) return;
    setTried('import');
    void s.startImport({ census: c, earlier: e, later: l });
  };

  const go = (id: string) => () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const startDrill = () => {
    setTried('drill');
    void s.startDrill();
  };
  const hasAi = s.local === 'available';

  return (
    <div className="relative isolate min-h-full overflow-x-clip">
      <Backdrop variant="hero" />
      {/* the picture bleeds to the top-right corner of the window, as on the mockup; below lg it sits under the text */}
      <div className="pointer-events-none absolute right-0 top-0 hidden w-[56vw] max-w-[1040px] lg:block">
        <HeroNight notes={t.heroNotes} chip={t.heroChip} />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 xl:px-9">
        <header className="relative flex items-center gap-4 pt-5 sm:pt-6">
          <Wordmark size="lg" />
          <nav aria-label={t.navLabel} className="mx-auto hidden md:block">
            <ul className="flex items-center gap-1 text-[15px] xl:gap-3">
              <NavPill active onClick={go('top')}>{t.nav.overview}</NavPill>
              <NavPill onClick={go('night')}>{t.nav.drill}</NavPill>
              <NavPill onClick={go('routes')}>{t.nav.how}</NavPill>
              <li>
                <a className="block rounded-full px-4 py-1.5 text-ink hover:bg-well" href="https://github.com/JohnnyBazzinga/lantern/blob/main/docs/PRIVACY.md" target="_blank" rel="noreferrer">
                  {t.nav.privacy}
                </a>
              </li>
            </ul>
          </nav>
          <LangToggle className="ml-auto md:ml-0" />
        </header>

        <section id="top" className="scroll-mt-4 lg:min-h-[calc(min(56vw,1040px)*480/900-84px)]">
          <div className="pt-10 lg:max-w-[min(40vw,620px)] lg:pt-[3.2vw] min-[1700px]:pt-14">
            <Kicker>{t.kicker}</Kicker>
            <h1 className="mt-5 font-display text-[44px] font-medium leading-[1.02] tracking-[-0.025em] text-ink sm:text-[58px] lg:text-[clamp(46px,4.25vw,74px)]">
              <span className="block">{t.head[0]}</span>
              <span className="block">
                {t.head[1]} <Marked>{t.head[2]}</Marked>
              </span>
            </h1>
            <p className="mt-5 max-w-[56ch] text-[18px] leading-[1.5] text-ink lg:max-w-[min(36vw,570px)]">{t.lede}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" onClick={startDrill} disabled={!!s.busy} className="max-sm:w-full">
                <Play size={17} fill="currentColor" strokeWidth={0} aria-hidden /> {t.startDrill}
              </Button>
              <Button size="lg" tone="secondary" onClick={go('routes')} className="max-sm:w-full">
                <BookOpen size={19} strokeWidth={1.8} aria-hidden /> {t.seeHow}
              </Button>
            </div>

            {s.resumable && (
              <Notice tone="ok" className="mt-6 max-w-[64ch]">
                <p>
                  <strong className="font-semibold">{t.saved}</strong>{' '}
                  {t.savedWhat(
                    sessionTitle(s.resumable.kind).toLowerCase(),
                    new Date(s.resumable.createdAt).toLocaleString(locale(), { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
                    s.resumable.reviewer ?? '',
                  )}{' '}
                  {s.resumable.kind === 'import' && t.savedShared}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Button tone="secondary" onClick={s.resume}>
                    {t.resume}
                  </Button>
                  <Button tone="quiet" onClick={() => void s.reset()}>
                    {t.remove}
                  </Button>
                </div>
              </Notice>
            )}
            {s.error && tried !== 'import' && (
              <div className="mt-5 max-w-[64ch]" role="alert">
                <Notice tone="alarm">
                  <strong className="font-semibold">{t.drillFailed}</strong>
                  <span className="mt-1 block text-[15px] text-ink-soft">
                    {t.details} {s.error}
                  </span>
                </Notice>
              </div>
            )}
          </div>
        </section>
        <div className="mt-8 lg:hidden">
          <HeroNight notes={t.heroNotes} chip={t.heroChip} />
        </div>

        <Card as="section" id="night" aria-labelledby="night-title" className="mt-8 scroll-mt-6 px-5 pb-6 pt-6 sm:px-10 sm:pt-7 xl:-mx-[30px]">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <h2 id="night-title" className="font-display text-[28px] font-semibold leading-tight tracking-[-0.01em] sm:text-[32px]">
              {t.nightTitle}
            </h2>
            <div className="flex flex-wrap gap-2 text-[14.5px]">
              <span className="inline-flex items-center gap-2 rounded-full border border-rule-strong px-3.5 py-1.5">
                <Clock size={16} strokeWidth={1.8} aria-hidden /> {t.minutes}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-rule-strong px-3.5 py-1.5">
                <Users size={16} strokeWidth={1.8} aria-hidden /> {t.fictional}
              </span>
            </div>
          </div>
          <ol className="relative mt-7 grid gap-y-6 md:mt-8 md:grid-cols-4 md:gap-x-8">
            {t.night.map((n, i) => {
              const last = i === t.night.length - 1;
              return (
                <li key={n.t} className="relative pl-9 md:pl-0">
                  <time className="block text-[18px] font-semibold tabular-nums text-ink md:pl-[3px]">{n.t}</time>
                  {/* the line between this event and the next, through the dots */}
                  {!last && <span className="absolute left-[11px] top-[14px] h-[calc(100%+24px)] w-[2px] bg-forest md:left-[12px] md:right-[-44px] md:top-[45px] md:h-[2px] md:w-auto" aria-hidden />}
                  {/* every dot sits in the same 24px slot, so the titles under them line up */}
                  <span className="absolute left-0 top-[1px] grid h-6 w-6 place-items-center md:static md:mt-1.5" aria-hidden>
                    <span
                      className={`grid place-items-center rounded-full ${
                        last ? 'h-6 w-6 bg-forest text-white' : i === 0 ? 'h-[18px] w-[18px] border-2 border-forest bg-card' : 'h-[14px] w-[14px] bg-forest'
                      }`}
                    >
                      {last && <Check size={14} strokeWidth={3} />}
                    </span>
                  </span>
                  <p className="mt-1 text-[17px] font-semibold leading-snug text-ink md:mt-3">{n.title}</p>
                  <p className="mt-1 max-w-[40ch] text-[15px] leading-[1.45] text-ink-soft">{n.text}</p>
                </li>
              );
            })}
          </ol>
          <p className="mt-7 flex items-start gap-3 border-t border-rule pt-4 text-[15px] leading-[1.45] text-ink-soft">
            <ScanSearch size={19} strokeWidth={1.8} className="mt-0.5 shrink-0 text-moss" aria-hidden />
            {t.hides}
          </p>
        </Card>

        <div className="mt-8 grid gap-x-10 gap-y-10 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)_1px_minmax(0,1fr)] xl:-ml-[30px]">
          <WardSign text={t.wardSign} />
          <section id="routes" aria-labelledby="routes-title" className="scroll-mt-6">
            <h2 id="routes-title" className="font-display text-[28px] font-semibold leading-tight tracking-[-0.01em] sm:text-[32px]">
              {t.routes}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2 text-[14.5px] font-semibold">
              <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 ${hasAi ? 'bg-mint text-forest' : 'text-ink-soft'}`}>
                <Laptop size={17} strokeWidth={1.9} aria-hidden /> {t.stateDevice}
                {hasAi && <span className="sr-only">✓</span>}
              </span>
              <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 ${!hasAi && s.local !== 'checking' ? 'bg-stone text-ink' : 'text-ink-soft'}`}>
                <CloudOff size={17} strokeWidth={1.9} aria-hidden /> {t.stateNone}
              </span>
            </div>
            <div className="mt-4 text-[16px] leading-[1.5]">
              <Readiness local={s.local} preparing={preparing} onPrepare={prepare} />
              {prepError && (
                <p role="alert" className="mt-2 text-alarm">
                  {prepError}
                </p>
              )}
            </div>
            <ul className="mt-4 space-y-2.5 text-[15px] leading-[1.45] text-ink-soft">
              <li className="flex items-start gap-3">
                <Cloud size={18} strokeWidth={1.8} className="mt-0.5 shrink-0 text-ink" aria-hidden />
                {t.routeCloud}
              </li>
              <li className="flex items-start gap-3">
                <Scale size={18} strokeWidth={1.8} className="mt-0.5 shrink-0 text-ink" aria-hidden />
                {t.routeRule}
              </li>
            </ul>
          </section>
          <span className="hidden bg-rule-strong lg:block" aria-hidden />
          <section aria-labelledby="own" className="min-w-0">
            <h2 id="own" className="font-display text-[28px] font-semibold leading-tight tracking-[-0.01em] sm:text-[32px]">
              {t.ownTitle}
            </h2>
            <p className="mt-3 max-w-[62ch] text-[16px] leading-[1.5] text-ink">{t.ownText}</p>
            <div className="mt-5 grid grid-cols-3 gap-3 max-[460px]:grid-cols-1">
              <FilePick icon={<FileText size={22} strokeWidth={1.6} />} label={t.census} hint={t.fileTypes} inputRef={census} picked={picked.census} onPick={(n) => setPicked((p) => ({ ...p, census: n }))} />
              <FilePick icon={<Upload size={22} strokeWidth={1.6} />} label={t.earlier} hint={t.fileTypes} inputRef={earlier} picked={picked.earlier} onPick={(n) => setPicked((p) => ({ ...p, earlier: n }))} />
              <FilePick icon={<Upload size={22} strokeWidth={1.6} />} label={t.later} hint={t.fileTypes} inputRef={later} picked={picked.later} onPick={(n) => setPicked((p) => ({ ...p, later: n }))} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Button tone={picked.earlier && picked.later ? 'primary' : 'secondary'} disabled={!picked.earlier || !picked.later || !!s.busy} onClick={importFiles}>
                {t.open} <ArrowRight size={17} aria-hidden />
              </Button>
              {/* a disabled button says why */}
              {(!picked.earlier || !picked.later) && <span className="text-[14.5px] text-ink-soft">{t.pickFirst}</span>}
            </div>
            {(wrongType || (s.error && tried === 'import')) && (
              <div className="mt-4" role="alert">
                <Notice tone="alarm">
                  <strong className="font-semibold">{wrongType ? t.wrongType(wrongType) : t.importFailed}</strong>
                  {!wrongType && (
                    <span className="mt-1 block text-[15px] text-ink-soft">
                      {t.details} {s.error}
                    </span>
                  )}
                </Notice>
              </div>
            )}
          </section>
        </div>

        <footer className="mt-16 border-t border-rule pb-12 pt-6 text-[14.5px] leading-[1.5] text-ink-soft">
          <p className="max-w-[96ch]">{t.footer}</p>
          <span className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
            <a className="underline underline-offset-2 hover:text-ink" href="https://github.com/JohnnyBazzinga/lantern/blob/main/docs/PRIVACY.md" target="_blank" rel="noreferrer">
              {t.privacy}
            </a>
            <a className="underline underline-offset-2 hover:text-ink" href="https://github.com/JohnnyBazzinga/lantern" target="_blank" rel="noreferrer">
              {t.source}
            </a>
            <a className="underline underline-offset-2 hover:text-ink" href="#/check">
              {t.lab}
            </a>
          </span>
        </footer>
      </div>
    </div>
  );
}

function NavPill({ active = false, onClick, children }: { active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <li>
      <button type="button" onClick={onClick} aria-current={active ? 'true' : undefined} className={`block rounded-full px-4 py-1.5 ${active ? 'bg-[#d6d9d1] font-medium text-ink' : 'text-ink hover:bg-well'}`}>
        {children}
      </button>
    </li>
  );
}

/**
 * The corridor sign of the fictional ward, drawn: the mockup's photograph until a real one is chosen.
 * Decoration only.
 */
function WardSign({ text }: { text: string }) {
  return (
    <div aria-hidden className="relative hidden h-full min-h-[230px] overflow-hidden rounded-2xl bg-[linear-gradient(160deg,#20403a_0%,#122a26_55%,#0b1d1a_100%)] lg:block">
      <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-[#e9f3e9]/25 blur-3xl" />
      <div className="absolute bottom-0 left-[18%] h-[46%] w-[34%] rounded-t-md bg-[#2b4a43]/70" />
      <div className="absolute bottom-0 left-[60%] h-[40%] w-[16%] rounded-t-sm bg-[#d9e6dd]/15" />
      <div className="absolute left-[16%] top-[13%] flex origin-left -rotate-[7deg] skew-y-[4deg] items-center gap-4 rounded-md bg-[#0e1f1c] px-5 py-3 font-display text-[34px] font-medium text-[#eef3ef] shadow-[0_18px_30px_-12px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
        {text}
        <ArrowRight size={30} strokeWidth={2} />
      </div>
    </div>
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
        <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button tone="secondary" onClick={onPrepare} disabled={preparing !== null}>
            {preparing === null ? t.download : t.downloading(Math.round(preparing * 100))}
          </Button>
          <a className="font-semibold text-forest underline underline-offset-2" href="#/check">
            {t.checkPc}
          </a>
        </span>
      </>
    );
  return (
    <>
      <p>
        {t.none}{' '}
        <a className="underline underline-offset-2" href="https://developer.chrome.com/docs/ai/get-started" target="_blank" rel="noreferrer">
          {t.needsChrome}
        </a>
        .
      </p>
      <a className="mt-2 inline-block font-semibold text-forest underline underline-offset-2" href="#/check">
        {t.checkPc}
      </a>
    </>
  );
}

function FilePick({
  icon,
  label,
  hint,
  inputRef,
  picked,
  onPick,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  picked: string;
  onPick: (n: string) => void;
}) {
  return (
    <label
      className={`flex min-h-[112px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-3 py-4 text-center transition-colors focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-forest ${
        picked ? 'border-mint-line bg-mint' : 'border-rule-strong bg-card/60 hover:border-forest hover:bg-mint/60'
      }`}
    >
      <span className={picked ? 'text-forest' : 'text-ink'} aria-hidden>
        {picked ? <Check size={22} strokeWidth={2.2} /> : icon}
      </span>
      <span className="text-[15.5px] font-semibold leading-tight">{label}</span>
      <span className={`max-w-full truncate text-[13.5px] ${picked ? 'font-mono text-ink' : 'text-ink-soft'}`}>{picked || hint}</span>
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(e) => onPick(e.target.files?.[0]?.name ?? '')} />
    </label>
  );
}
