import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ClipboardCopy, Play, RefreshCw } from 'lucide-react';
import { checkLocalAvailability, type LocalAvailability } from '../ai/capability';
import { getLedger } from '../ai/ledger';
import { prepareLocalModel, runTask } from '../ai/models';
import { inferenceRequests, watchRequests, type ObservedRequest } from '../ai/netwatch';
import { extractActInput, extractActTask } from '../ai/prompts/v1/extractAct';
import { mapColumnsTask } from '../ai/prompts/v1/mapColumns';
import { RC_DEFAULTS } from '../firebase/remoteConfig';
import { locale, msgs } from '../i18n/lang';
import { useT } from '../i18n/react';
import { Backdrop } from '../ui/Backdrop';
import { AppBar, Button, Caution, Eyebrow, Kicker, Marked, Notice, Route, StateGlyph, Tick, usePageTitle } from '../ui/kit';

/**
 * "Check this computer": the page hospital IT opens before letting Lantern run on ward PCs.
 * Everything on it is read from this browser; nothing is sent anywhere, except during the local test,
 * which counts every request to Google so the claim "0 requests to Gemini" is measured, not stated.
 * Requirements quoted are Google's published ones (developer.chrome.com/docs/ai/get-started) and the
 * Chrome policy definition (GenAILocalFoundationalModelSettings, Chromium source).
 */

type Kind = 'ready' | 'it' | 'hand' | 'not-here';
interface Row {
  key: string;
  check: string;
  /** a value read from the machine, shown in mono, and Lantern's words about it */
  value?: string;
  note?: string;
  kind: Kind;
  word: string;
}

const M = msgs(
  {
    pageTitle: 'Check this computer',
    title: 'Check this computer',
    eyebrow: 'For hospital IT',
    kicker: 'Before Lantern runs on ward PCs',
    back: 'Back to Lantern',
    checking: 'Checking this computer…',
    verdict: {
      own: ['This computer can run Lantern', 'on its own.'],
      noAi: ['This computer can run Lantern,', 'without the on-device AI.'],
      cannot: ['Lantern cannot run', 'here yet.'],
    },
    checkedAt: (when: string) => `Checked ${when}. Everything below was read from this browser; nothing was sent anywhere.`,
    recheck: 'Check again',
    head: { check: 'Check', found: 'Found on this computer', result: 'Result' },
    kinds: { ready: 'Ready', it: 'Needs IT', hand: 'Check by hand', 'not-here': 'Not available here' } as Record<Kind, string>,
    rows: {
      browser: 'Browser',
      ai: 'On-device AI',
      policy: 'Chrome policy',
      disk: 'Disk and hardware',
      offline: 'Works offline',
      saved: 'Saved reviews',
      cloud: 'Cloud',
    },
    desktop: 'computer',
    phone: 'phone or tablet',
    availability: {
      available: 'Gemini Nano: available',
      downloadable: 'Gemini Nano: not downloaded yet',
      downloading: 'Gemini Nano: downloading',
      unavailable: 'Gemini Nano: unavailable on this computer',
      'no-api': 'no on-device AI in this browser',
      error: 'the browser did not answer',
    } as Record<LocalAvailability, string>,
    needsDownload: 'Download',
    policyOk: 'Allowed: the model is installed, which the value 1 (Disabled) would prevent.',
    policyHand: 'Cannot be read from a web page. Open chrome://policy: 0 or not set means allowed, 1 means disabled.',
    diskOk: 'Enough: the model is installed. Chrome removes it if free space falls below 10 GB.',
    diskHand: "Free disk cannot be read from a web page. Chrome needs 22 GB free on the profile's disk, and a GPU with more than 4 GB of video memory, or 16 GB of RAM and 4 CPU cores.",
    cores: (n: number, mem: number | null) => `${n} logical cores${mem ? `, about ${mem} GB of memory` : ''}`,
    build: (b: string) => `build ${b}`,
    offlineOk: 'The app and the drill are saved in this browser.',
    offlineNot: 'Not yet: the app has not been saved for use without a network in this browser.',
    offlineNoSw: 'This browser does not keep web apps for use without a network.',
    reloadOnce: 'Reload once',
    savedText: 'Reviews of your own files are deleted when Lantern is next opened, once 12 hours have passed since the last change. Only this browser profile can open them.',
    savedNoDb: 'This browser does not let Lantern save reviews (a private window?).',
    asConfigured: 'As configured',
    cloudText: 'Only the fictional drill can use the cloud. Your own files are refused in code, before any request.',
    blockedForFiles: 'Blocked for your files',
    testTitle: 'Run a local test',
    testText: 'One fictional row goes through the on-device model, the way your own files would. Lantern counts every request this page makes to Google meanwhile.',
    testRun: 'Run the local test',
    testRunning: 'Running…',
    testOk: (s: string) => `Answered on this device in ${s} s.`,
    testBlocked: 'Blocked: the on-device model is not ready here, so Lantern refused the call and nothing was sent.',
    testFailed: (why: string) => `The model did not answer: ${why}`,
    gemini: (n: number) => `Requests to Gemini: ${n}.`,
    google: (n: number, hosts: string) => (n ? `Other requests to Google: ${n} (${hosts}): the app's security check (reCAPTCHA) and settings; none of them carries the row.` : 'Other requests to Google: 0.'),
    nextTitle: 'What to do next',
    next: {
      download: 'Anyone: download the on-device AI now, before an outage. Chrome downloads it once; chrome://on-device-internals shows its size.',
      it: 'IT: open chrome://on-device-internals and the Broker State tab, which says why the model is unavailable. Then check that GenAILocalFoundationalModelSettings is 0 or not set, that ComponentUpdatesEnabled is not false, and that the disk and hardware meet the needs above.',
      chrome: 'Anyone: to use the on-device AI, open Lantern in Chrome on a computer (Windows 10 or 11, macOS 13 or later, Linux, or a Chromebook Plus). Without it, Lantern\'s rules still find copies, corrections and identity problems, and nothing is sent.',
      reload: 'Anyone: reload this page once while connected, so Lantern is saved for use without a network.',
      db: 'IT: allow site data for this address, or Lantern cannot keep a review if the browser is closed.',
      none: 'Nothing to do. Copy the report below into the ticket if one is open.',
    },
    copy: 'Copy this report',
    copied: 'Copied',
    copyHint: 'Plain text with the date, the Lantern build and the browser version, for a ticket. Nothing is written to disk.',
    bench: 'Developer bench (Lab, in English)',
    reportTitle: 'Lantern: check this computer',
    reportChecked: 'Checked',
    reportBuild: 'Lantern build',
    reportBrowser: 'Browser',
    reportVerdict: 'Verdict',
    reportTest: 'Local test',
    reportNotRun: 'not run',
  },
  {
    pageTitle: 'Verificar este computador',
    title: 'Verificar este computador',
    eyebrow: 'Para a informática',
    kicker: 'Antes de o Lantern correr nos computadores do serviço',
    back: 'Voltar ao Lantern',
    checking: 'A verificar este computador…',
    verdict: {
      own: ['Este computador consegue correr o Lantern', 'por conta própria.'],
      noAi: ['Este computador consegue correr o Lantern,', 'sem a IA local.'],
      cannot: ['O Lantern ainda não consegue', 'correr aqui.'],
    },
    checkedAt: (when) => `Verificado ${when}. Tudo o que está abaixo foi lido deste navegador; nada foi enviado.`,
    recheck: 'Verificar de novo',
    head: { check: 'Verificação', found: 'Encontrado neste computador', result: 'Resultado' },
    kinds: { ready: 'Pronto', it: 'Precisa da informática', hand: 'Verificar à mão', 'not-here': 'Não disponível aqui' },
    rows: {
      browser: 'Navegador',
      ai: 'IA local',
      policy: 'Política do Chrome',
      disk: 'Disco e hardware',
      offline: 'Funciona sem rede',
      saved: 'Revisões guardadas',
      cloud: 'Nuvem',
    },
    desktop: 'computador',
    phone: 'telemóvel ou tablet',
    availability: {
      available: 'Gemini Nano: disponível',
      downloadable: 'Gemini Nano: ainda não transferido',
      downloading: 'Gemini Nano: a transferir',
      unavailable: 'Gemini Nano: indisponível neste computador',
      'no-api': 'este navegador não tem IA local',
      error: 'o navegador não respondeu',
    },
    needsDownload: 'Transferir',
    policyOk: 'Permitido: o modelo está instalado, o que o valor 1 (desativado) impediria.',
    policyHand: 'Não se consegue ler numa página web. Abra chrome://policy: 0 ou não definida quer dizer permitido, 1 quer dizer desativado.',
    diskOk: 'Suficiente: o modelo está instalado. O Chrome remove-o se o espaço livre descer abaixo de 10 GB.',
    diskHand: 'O espaço livre não se consegue ler numa página web. O Chrome precisa de 22 GB livres no disco do perfil e de uma placa gráfica com mais de 4 GB de memória, ou de 16 GB de RAM e 4 núcleos de CPU.',
    cores: (n, mem) => `${n} núcleos lógicos${mem ? `, cerca de ${mem} GB de memória` : ''}`,
    build: (b) => `versão ${b}`,
    offlineOk: 'A aplicação e o simulacro estão guardados neste navegador.',
    offlineNot: 'Ainda não: a aplicação ainda não foi guardada para usar sem rede neste navegador.',
    offlineNoSw: 'Este navegador não guarda aplicações web para usar sem rede.',
    reloadOnce: 'Recarregar uma vez',
    savedText: 'As revisões dos seus ficheiros são apagadas quando o Lantern volta a ser aberto, passadas 12 horas sobre a última alteração. Só este perfil do navegador as abre.',
    savedNoDb: 'Este navegador não deixa o Lantern guardar revisões (uma janela privada?).',
    asConfigured: 'Como configurado',
    cloudText: 'Só o simulacro fictício pode usar a nuvem. Os seus ficheiros são recusados no código, antes de qualquer pedido.',
    blockedForFiles: 'Bloqueada para os seus ficheiros',
    testTitle: 'Fazer um teste local',
    testText: 'Uma linha fictícia passa pelo modelo local, tal como passariam os seus ficheiros. Entretanto, o Lantern conta todos os pedidos que esta página faz à Google.',
    testRun: 'Fazer o teste local',
    testRunning: 'A testar…',
    testOk: (s) => `Respondeu neste computador em ${s} s.`,
    testBlocked: 'Bloqueado: o modelo local não está pronto aqui, por isso o Lantern recusou o pedido e nada foi enviado.',
    testFailed: (why) => `O modelo não respondeu: ${why}`,
    gemini: (n) => `Pedidos ao Gemini: ${n}.`,
    google: (n, hosts) => (n ? `Outros pedidos à Google: ${n} (${hosts}): a verificação de segurança da aplicação (reCAPTCHA) e a configuração; nenhum deles leva a linha.` : 'Outros pedidos à Google: 0.'),
    nextTitle: 'O que fazer a seguir',
    next: {
      download: 'Qualquer pessoa: transfira já a IA local, antes de uma falha. O Chrome transfere-a uma vez; chrome://on-device-internals mostra o tamanho.',
      it: 'Informática: abra chrome://on-device-internals, separador Broker State, que diz porque é que o modelo está indisponível. Depois confirme que GenAILocalFoundationalModelSettings está a 0 ou não definida, que ComponentUpdatesEnabled não está a false, e que o disco e o hardware cumprem o indicado acima.',
      chrome: 'Qualquer pessoa: para usar a IA local, abra o Lantern no Chrome num computador (Windows 10 ou 11, macOS 13 ou posterior, Linux ou um Chromebook Plus). Sem ela, as regras do Lantern continuam a encontrar cópias, correções e dúvidas de identificação, e nada é enviado.',
      reload: 'Qualquer pessoa: recarregue esta página uma vez com ligação, para o Lantern ficar guardado para usar sem rede.',
      db: 'Informática: permita dados de sites para este endereço; caso contrário, o Lantern não consegue guardar uma revisão se o navegador for fechado.',
      none: 'Nada a fazer. Se houver um pedido aberto, copie o relatório abaixo para lá.',
    },
    copy: 'Copiar este relatório',
    copied: 'Copiado',
    copyHint: 'Texto simples com a data, a versão do Lantern e a do navegador, para colar num pedido. Nada é gravado no disco.',
    bench: 'Bancada de testes (Lab, em inglês)',
    reportTitle: 'Lantern: verificar este computador',
    reportChecked: 'Verificado',
    reportBuild: 'Versão do Lantern',
    reportBrowser: 'Navegador',
    reportVerdict: 'Veredicto',
    reportTest: 'Teste local',
    reportNotRun: 'não feito',
  },
);

interface Browser {
  name: string;
  version: string;
  platform: string;
  mobile: boolean;
}

function readBrowser(): Browser {
  const uad = (navigator as Navigator & { userAgentData?: { brands?: { brand: string; version: string }[]; mobile?: boolean; platform?: string } }).userAgentData;
  const ua = navigator.userAgent;
  const chrome = uad?.brands?.find((b) => b.brand === 'Google Chrome');
  const name = chrome
    ? 'Chrome'
    : /Edg\//.test(ua)
      ? 'Edge'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua) && !/Chrom(e|ium)/.test(ua)
          ? 'Safari'
          : /Chrom(e|ium)\//.test(ua)
            ? 'Chromium'
            : 'Browser';
  const version = chrome?.version ?? ua.match(/(?:Edg|Firefox|Version|Chrome|Chromium)\/(\d+)/)?.[1] ?? '';
  const platform =
    uad?.platform ||
    (/Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'ChromeOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '');
  return { name, version, platform, mobile: uad?.mobile ?? /Android|iPhone|iPad|Mobile/.test(ua) };
}

interface Facts {
  at: Date;
  browser: Browser;
  ai: LocalAvailability;
  cores: number;
  memory: number | null;
  sw: 'none' | 'not-yet' | 'ready';
  db: boolean;
  secure: boolean;
}

async function readFacts(): Promise<Facts> {
  const [ai, sw, db] = await Promise.all([
    checkLocalAvailability(),
    (async (): Promise<Facts['sw']> => {
      if (!('serviceWorker' in navigator) || !('caches' in window)) return 'none';
      // the precache keys carry a revision in the query, so match without it
      const [shell, drill] = await Promise.all([
        caches.match('/index.html', { ignoreSearch: true }),
        caches.match('/fixtures/drill/answer-key.json', { ignoreSearch: true }),
      ]).catch(() => [undefined, undefined]);
      return navigator.serviceWorker.controller && shell && drill ? 'ready' : 'not-yet';
    })(),
    new Promise<boolean>((resolve) => {
      try {
        const r = indexedDB.open('lantern');
        r.onsuccess = () => {
          r.result.close();
          resolve(true);
        };
        r.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    }),
  ]);
  return {
    at: new Date(),
    browser: readBrowser(),
    ai,
    cores: navigator.hardwareConcurrency || 0,
    memory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
    sw,
    db,
    secure: window.isSecureContext && !!globalThis.crypto?.subtle,
  };
}

type Test = { state: 'idle' } | { state: 'running' } | { state: 'done'; ok: boolean; blocked: boolean; text: string; ms: number | null; gemini: number; google: number; hosts: string };

/** The requests seen during the test: those to a Gemini endpoint, and the others with their hosts named. */
function counted(seen: ObservedRequest[]) {
  const gemini = inferenceRequests(seen);
  const other = seen.filter((r) => !gemini.includes(r));
  return { gemini: gemini.length, google: other.length, hosts: [...new Set(other.map((r) => r.host))].join(', ') };
}

/** The short build id, as the footer of the Lab shows it. */
const build = __BUILD_ID__.split(' ')[0] ?? __BUILD_ID__;

export default function Check() {
  const t = useT(M);
  usePageTitle(t.pageTitle);
  const [facts, setFacts] = useState<Facts | null>(null);
  const [test, setTest] = useState<Test>({ state: 'idle' });
  const [preparing, setPreparing] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const read = useCallback(() => {
    setFacts(null);
    void readFacts().then(setFacts);
  }, []);
  useEffect(read, [read]);

  async function runTest() {
    setTest({ state: 'running' });
    const watch = watchRequests();
    const t0 = performance.now();
    let result: Test;
    try {
      const r = await runTask(extractActTask, extractActInput({ act: 'Paracetamol 1g IV given', notes: 'temp 38.6 before', time: '22:15' }), {
        route: 'user-local',
        dataOrigin: 'diagnostic',
        cloudModel: RC_DEFAULTS.cloud_model,
      });
      const seen = watch.stop();
      result = { state: 'done', ok: r.inferenceSource === 'on_device', blocked: false, text: '', ms: r.latencyMs, ...counted(seen) };
    } catch (e) {
      const seen = watch.stop();
      const last = getLedger().at(-1);
      const blocked = last?.inferenceSource === 'blocked';
      result = {
        state: 'done',
        ok: blocked,
        blocked,
        text: blocked ? '' : e instanceof Error ? e.message : String(e),
        ms: blocked ? null : Math.round(performance.now() - t0),
        ...counted(seen),
      };
    }
    setTest(result);
  }

  async function download() {
    setPreparing(0);
    try {
      await prepareLocalModel(mapColumnsTask, (p) => setPreparing(p));
    } catch {
      /* the re-check below shows where it stands */
    }
    setPreparing(null);
    read();
  }

  const rows: Row[] = facts ? buildRows(facts, t) : [];
  // Lantern's rules run in any current browser; it needs a secure page for the file fingerprints (Web Crypto)
  const verdict = !facts ? null : !facts.secure ? 'cannot' : facts.ai === 'available' ? 'own' : 'noAi';
  const when = facts?.at.toLocaleString(locale(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) ?? '';

  const todo: ReactNode[] = [];
  if (facts) {
    if (facts.ai === 'downloadable' || facts.ai === 'downloading')
      todo.push(
        <span key="dl" className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span>{t.next.download}</span>
          <Button tone="secondary" onClick={() => void download()} disabled={preparing !== null}>
            {preparing === null ? t.needsDownload : `${Math.round(preparing * 100)}%`}
          </Button>
        </span>,
      );
    if (facts.ai === 'unavailable' || facts.ai === 'error') todo.push(t.next.it);
    if (facts.ai === 'no-api') todo.push(t.next.chrome);
    if (facts.sw === 'not-yet') todo.push(t.next.reload);
    if (!facts.db) todo.push(t.next.db);
    if (!todo.length) todo.push(t.next.none);
  }

  const report = () => {
    if (!facts) return '';
    const v = verdict ? t.verdict[verdict].join(' ') : '';
    const testLine =
      test.state === 'done'
        ? [test.blocked ? t.testBlocked : test.ok ? t.testOk(((test.ms ?? 0) / 1000).toFixed(1)) : t.testFailed(test.text), t.gemini(test.gemini), t.google(test.google, test.hosts)].join(' ')
        : t.reportNotRun;
    return [
      t.reportTitle,
      `${t.reportChecked}: ${facts.at.toISOString().slice(0, 16).replace('T', ' ')} UTC`,
      `${t.reportBuild}: ${__BUILD_ID__}`,
      `${t.reportBrowser}: ${navigator.userAgent}`,
      `${t.reportVerdict}: ${v}`,
      '',
      ...rows.map((r) => `- ${r.check}: ${[r.value, r.note].filter(Boolean).join('. ')} => ${r.word}`),
      '',
      `${t.reportTest}: ${testLine}`,
    ].join('\n');
  };

  return (
    <div className="relative isolate flex min-h-full flex-col">
      <Backdrop variant="page" />
      <AppBar
        onWave
        title={t.title}
        actions={
          <a href="#/" className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-[15px] font-semibold text-ink hover:underline">
            <ArrowLeft size={18} aria-hidden /> <span className="max-sm:sr-only">{t.back}</span>
          </a>
        }
      />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <Kicker>{t.kicker}</Kicker>
        </div>
        <h1 className="mt-5 max-w-[24ch] font-display text-[36px] font-medium leading-[1.06] tracking-[-0.02em] text-ink sm:text-[50px]" aria-live="polite">
          {!verdict ? (
            t.checking
          ) : verdict === 'cannot' ? (
            t.verdict.cannot.join(' ')
          ) : (
            <>
              {t.verdict[verdict][0]} <Marked>{t.verdict[verdict][1]}</Marked>
            </>
          )}
        </h1>
        {facts && (
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[16px] text-ink-soft">
            <span>{t.checkedAt(when)}</span>
            <button type="button" onClick={read} className="inline-flex items-center gap-1.5 font-semibold text-forest underline-offset-2 hover:underline">
              <RefreshCw size={15} aria-hidden /> {t.recheck}
            </button>
          </p>
        )}

        {/* the checks, as a sheet: what was read from the machine (mono), then Lantern's verdict on it */}
        <div className="mt-7 overflow-hidden rounded-2xl border border-rule bg-card shadow-[0_1px_2px_rgba(30,40,30,0.04)]">
          <table className="w-full border-collapse text-left">
            <thead className="max-md:sr-only">
              <tr className="bg-well text-[14px] text-ink">
                <th scope="col" className="w-[13rem] px-5 py-3 font-semibold">
                  {t.head.check}
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  {t.head.found}
                </th>
                <th scope="col" className="w-[15rem] px-5 py-3 font-semibold">
                  {t.head.result}
                </th>
              </tr>
            </thead>
            <tbody>
              {!facts && (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-ink-soft">
                    {t.checking}
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-rule align-top max-md:grid max-md:grid-cols-1 max-md:px-5 max-md:py-3">
                  <th scope="row" className="px-5 py-3.5 text-[16px] font-semibold max-md:p-0">
                    {r.check}
                  </th>
                  <td className="px-5 py-3.5 max-md:p-0 max-md:pt-1">
                    {r.value && <span className="block font-mono text-[15px] leading-[1.5] tracking-[-0.01em] text-ink">{r.value}</span>}
                    {r.note && <span className={`block max-w-[62ch] text-[15px] leading-[1.5] text-ink-soft ${r.value ? 'mt-0.5' : ''}`}>{r.note}</span>}
                  </td>
                  <td className="px-5 py-3.5 max-md:p-0 max-md:pt-2">
                    <ResultCell kind={r.kind} word={r.word} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* the proof: one fictional row through the on-device route, with the requests counted */}
        <section aria-labelledby="test" className="mt-9">
          <h2 id="test" className="font-display text-[28px] font-semibold leading-tight tracking-[-0.01em]">
            {t.testTitle}
          </h2>
          <p className="mt-2 max-w-[70ch] text-[16px] text-ink-soft">{t.testText}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button onClick={() => void runTest()} disabled={test.state === 'running' || !facts}>
              <Play size={16} fill="currentColor" strokeWidth={0} aria-hidden /> {test.state === 'running' ? t.testRunning : t.testRun}
            </Button>
            {test.state === 'done' && (
              <p role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[16px]">
                {test.blocked ? (
                  <>
                    <Tick size={20} /> <span>{t.testBlocked}</span>
                  </>
                ) : test.ok ? (
                  <>
                    <Route source="on_device" /> <span className="font-semibold">{t.testOk(((test.ms ?? 0) / 1000).toFixed(1))}</span>
                  </>
                ) : (
                  <>
                    <Caution size={20} /> <span>{t.testFailed(test.text)}</span>
                  </>
                )}
                <span className="basis-full text-[15px] text-ink-soft">
                  <strong className="font-semibold text-ink">{t.gemini(test.gemini)}</strong> {t.google(test.google, test.hosts)}
                </span>
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="todo" className="mt-10">
          <h2 id="todo" className="font-display text-[28px] font-semibold leading-tight tracking-[-0.01em]">
            {t.nextTitle}
          </h2>
          <ul className="mt-3 max-w-[80ch] space-y-2.5 text-[16px] leading-[1.5]">
            {todo.map((x, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-forest" aria-hidden />
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <Notice tone="info" className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4">
            <Button
              tone="secondary"
              disabled={!facts}
              onClick={() => {
                void navigator.clipboard?.writeText(report()).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                });
              }}
            >
              <ClipboardCopy size={17} aria-hidden /> {copied ? t.copied : t.copy}
            </Button>
            <span className="max-w-[60ch] text-[15px] text-ink-soft">{t.copyHint}</span>
          </Notice>
          <p className="mt-6 text-[15px]">
            <a href="#/lab" className="text-ink-soft underline underline-offset-2 hover:text-ink">
              {t.bench}
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}

function ResultCell({ kind, word }: { kind: Kind; word: string }) {
  const glyph =
    kind === 'ready' ? <Tick size={20} /> : kind === 'it' ? <StateGlyph state="waiting" /> : kind === 'hand' ? <Caution size={20} /> : <StateGlyph state="open" />;
  return (
    <span className={`flex items-center gap-2.5 text-[15.5px] font-semibold ${kind === 'ready' ? 'text-ink' : kind === 'not-here' ? 'text-ink-soft' : 'text-amber-ink'}`}>
      {glyph}
      {word}
    </span>
  );
}

function buildRows(f: Facts, t: (typeof M)['en']): Row[] {
  const b = f.browser;
  const chromeDesktop = b.name === 'Chrome' && !b.mobile;
  const browserText = [`${b.name}${b.version ? ` ${b.version}` : ''}`, b.platform, b.mobile ? t.phone : t.desktop].filter(Boolean).join(', ');
  const installed = f.ai === 'available';
  const download = f.ai === 'downloadable' || f.ai === 'downloading';
  const rows: Row[] = [
    // another browser with its own on-device model (Edge) still counts as ready when that model answers
    { key: 'browser', check: t.rows.browser, value: browserText, kind: chromeDesktop || installed ? 'ready' : 'not-here', word: chromeDesktop || installed ? t.kinds.ready : t.kinds['not-here'] },
    {
      key: 'ai',
      check: t.rows.ai,
      value: t.availability[f.ai],
      kind: installed ? 'ready' : f.ai === 'no-api' ? 'not-here' : download ? 'hand' : 'it',
      word: installed ? t.kinds.ready : f.ai === 'no-api' ? t.kinds['not-here'] : download ? t.needsDownload : t.kinds.it,
    },
  ];
  if (f.ai !== 'no-api')
    rows.push(
      { key: 'policy', check: t.rows.policy, value: 'GenAILocalFoundationalModelSettings', note: installed ? t.policyOk : t.policyHand, kind: installed ? 'ready' : 'hand', word: installed ? t.kinds.ready : t.kinds.hand },
      { key: 'disk', check: t.rows.disk, value: t.cores(f.cores, f.memory), note: installed ? t.diskOk : t.diskHand, kind: installed ? 'ready' : 'hand', word: installed ? t.kinds.ready : t.kinds.hand },
    );
  rows.push(
    {
      key: 'offline',
      check: t.rows.offline,
      value: f.sw === 'ready' ? t.build(build) : undefined,
      note: f.sw === 'ready' ? t.offlineOk : f.sw === 'not-yet' ? t.offlineNot : t.offlineNoSw,
      kind: f.sw === 'ready' ? 'ready' : f.sw === 'not-yet' ? 'hand' : 'not-here',
      word: f.sw === 'ready' ? t.kinds.ready : f.sw === 'not-yet' ? t.reloadOnce : t.kinds['not-here'],
    },
    { key: 'saved', check: t.rows.saved, note: f.db ? t.savedText : t.savedNoDb, kind: f.db ? 'ready' : 'it', word: f.db ? t.asConfigured : t.kinds.it },
    { key: 'cloud', check: t.rows.cloud, note: t.cloudText, kind: 'ready', word: t.blockedForFiles },
  );
  return rows;
}
