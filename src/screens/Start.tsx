import { useRef, useState } from 'react';
import { prepareLocalModel } from '../ai/models';
import { mapColumnsTask } from '../ai/prompts/v1/mapColumns';
import { useSession } from '../app/session';
import { Button, LanternMark, Notice } from '../ui/kit';

const NIGHT = [
  { t: '21:40', text: 'The electronic record goes down. Night nurses log care in a spreadsheet on the ward PC, and on paper.' },
  { t: '03:10', text: 'The nurse in charge emails the spreadsheet to the clinical secretary.' },
  { t: '07:40', text: 'A nurse replies to all with her own copy: acts re-typed from her notes, three corrections, and three rows lost when she sorted it.' },
  { t: '08:30', text: 'Systems are back. Rita, the clinical secretary, has two versions and the 21:00 census. Everything has to go back into the record.' },
];

export default function Start() {
  const s = useSession();
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
      <header className="mb-14 flex items-center gap-2 text-ink">
        <LanternMark />
        <span className="text-lg font-semibold">Lantern</span>
      </header>

      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <section>
          <h1 className="max-w-[18ch] text-[2.6rem] font-semibold leading-[1.08] tracking-[-0.015em] sm:text-[3.2rem]">
            The systems are back. Now last night has to go back into the record.
          </h1>
          <p className="mt-6 max-w-[60ch] text-lg text-ink-soft">
            Lantern compares the spreadsheets and notes a ward kept during an IT outage, links every act to the cell it came from,
            and helps you decide, row by row, what goes back into the record. Patient data stays on this device.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button onClick={() => void s.startDrill()} disabled={!!s.busy} className="px-5 py-3 text-base">
              Start the Ward 7B drill
            </Button>
            {s.resumable && (
              <Button tone="secondary" onClick={s.resume}>
                Resume your last review
              </Button>
            )}
          </div>
          <p className="mt-3 text-sm text-ink-faint">The drill uses a fictional ward and fictional patients. It takes about ten minutes.</p>

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
            The night in the drill
          </h2>
          <ol className="relative border-l-2 border-rule pl-6">
            {NIGHT.map((n) => (
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
          Use your own files
        </h2>
        <p className="mt-2 max-w-[62ch] text-ink-soft">
          Pick two versions of the same downtime log, and the census if you have one. They are read in this browser and never uploaded;
          comparisons run on this device only. Without an on-device model, Lantern still finds identical rows and identity problems, and you
          decide the rest.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <FilePick label="Census (optional)" inputRef={census} picked={picked.census} onPick={(n) => setPicked((p) => ({ ...p, census: n }))} />
          <FilePick label="Earlier version" inputRef={earlier} picked={picked.earlier} onPick={(n) => setPicked((p) => ({ ...p, earlier: n }))} />
          <FilePick label="Later version" inputRef={later} picked={picked.later} onPick={(n) => setPicked((p) => ({ ...p, later: n }))} />
        </div>
        <Button tone="secondary" className="mt-5" disabled={!picked.earlier || !picked.later || !!s.busy} onClick={importFiles}>
          Open these files
        </Button>
      </section>

      <footer className="mt-20 max-w-[70ch] text-sm text-ink-faint">
        Lantern is a documentation aid for re-entering records after downtime. It does not diagnose, dose or triage, and it never writes
        into any record system. <a className="underline underline-offset-2" href="#/lab">Diagnostics</a>
      </footer>
    </main>
  );
}

function Readiness({ local, preparing, onPrepare }: { local: ReturnType<typeof useSession>['local']; preparing: number | null; onPrepare: () => void }) {
  if (local === 'checking') return <Notice>Checking this device…</Notice>;
  if (local === 'available')
    return (
      <Notice tone="scrub">
        <strong className="font-semibold">Gemini Nano is ready on this device.</strong> Lantern can read and compare the sheets here, with no
        network at all.
      </Notice>
    );
  if (local === 'downloadable' || local === 'downloading')
    return (
      <Notice>
        <p>
          <strong className="font-semibold">Gemini Nano can run on this device</strong> once Chrome has downloaded it. Do this before an
          outage: afterwards it works offline.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Button tone="secondary" onClick={onPrepare} disabled={preparing !== null}>
            {preparing === null ? 'Prepare this device' : `Downloading ${Math.round(preparing * 100)}%`}
          </Button>
        </div>
      </Notice>
    );
  return (
    <Notice>
      <strong className="font-semibold">This browser has no on-device model.</strong> The drill still works: its synthetic rows are compared
      in the cloud instead, and every call says where it ran. Your own files would stay here and you would compare them by hand.{' '}
      <a className="underline underline-offset-2" href="https://developer.chrome.com/docs/ai/get-started" target="_blank" rel="noreferrer">
        Gemini Nano needs desktop Chrome
      </a>
      .
    </Notice>
  );
}

function FilePick({ label, inputRef, picked, onPick }: { label: string; inputRef: React.RefObject<HTMLInputElement | null>; picked: string; onPick: (n: string) => void }) {
  return (
    <label className="flex cursor-pointer flex-col gap-1 rounded-md border border-dashed border-rule-strong bg-sheet px-4 py-3 hover:border-ink">
      <span className="text-sm font-semibold">{label}</span>
      <span className="truncate text-sm text-ink-faint">{picked || '.xlsx or .csv'}</span>
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
