import { useCallback, useEffect, useMemo, useState } from 'react';
import { getToken } from 'firebase/app-check';
import { Cloud, Cpu, Download, FlaskConical, ShieldCheck, WifiOff } from 'lucide-react';
import { environmentReport, type EnvironmentReport } from '../ai/capability';
import { getLedger, subscribeLedger, ledgerSummary, type LedgerEntry } from '../ai/ledger';
import { prepareLocalModel, runTask, type Route } from '../ai/models';
import { mapColumnsInput, mapColumnsTask } from '../ai/prompts/v1/mapColumns';
import { extractActInput, extractActTask } from '../ai/prompts/v1/extractAct';
import { appCheckConfigured, appCheckDebugMode, firebaseConfigured, getAppCheckInstance, projectId } from '../firebase/app';
import { loadConfig, RC_DEFAULTS, type LanternConfig } from '../firebase/remoteConfig';
import { parseSpreadsheet } from '../core/parse';
import { scoreExtraction, scoreMapping, type DevKey } from '../lab/spikeScore';
import { profileColumns } from '../core/profile';
import { reconcileMapping } from '../core/mapping';
import { mapColumnInput, mapColumnTask } from '../ai/prompts/v1/mapColumn';
import { runDrillBench } from '../lab/drillBench';

/**
 * Lab: the day-1 gate. Four spikes decide whether the product plan holds on real hardware.
 *  S1 on-device works offline after a browser restart
 *  S2 imported (user) data never reaches the cloud, even in a browser without Gemini Nano
 *  S3 Nano's column mapping and extraction quality on three improvised sheets
 *  S4 an App Check-protected cloud call works from the hosted origin
 */

const SMOKE_ENTRY = extractActInput({ act: 'Paracetamol 1g IV given', notes: 'temp 38.6 before', time: '22:15' });

type Status = 'idle' | 'running' | 'pass' | 'fail';

interface SpikeState {
  status: Status;
  lines: string[];
  data?: unknown;
}

const idle: SpikeState = { status: 'idle', lines: [] };

export default function Lab() {
  const [env, setEnv] = useState<EnvironmentReport | null>(null);
  const [config, setConfig] = useState<LanternConfig | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [s1, setS1] = useState<SpikeState>(idle);
  const [s2, setS2] = useState<SpikeState>(idle);
  const [s3, setS3] = useState<SpikeState>(idle);
  const [s3cloud, setS3cloud] = useState<SpikeState>(idle);
  const [s3m, setS3m] = useState<SpikeState>(idle);
  const [s5, setS5] = useState<SpikeState>(idle);
  const [s5cloud, setS5cloud] = useState(false);
  const [s5prompt, setS5prompt] = useState<'same-event' | 'four-way'>('same-event');
  const [s4, setS4] = useState<SpikeState>(idle);
  const [simulateNoNano, setSimulateNoNano] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);

  const refreshEnv = useCallback(async () => setEnv(await environmentReport()), []);

  useEffect(() => {
    void refreshEnv();
    void loadConfig().then(setConfig);
    const unsub = subscribeLedger(setLedger);
    const on = () => void refreshEnv();
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      unsub();
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, [refreshEnv]);

  const cloudModel = config?.cloudModel ?? RC_DEFAULTS.cloud_model;

  async function prepare() {
    setPrepareError(null);
    setProgress(0);
    try {
      await prepareLocalModel(mapColumnsTask, (p) => setProgress(p));
      setProgress(1);
    } catch (e) {
      setProgress(null);
      setPrepareError(e instanceof Error ? e.message : String(e));
    }
    void refreshEnv();
  }

  async function runS1() {
    setS1({ status: 'running', lines: [`online: ${navigator.onLine}`] });
    try {
      const r = await runTask(extractActTask, SMOKE_ENTRY, { route: 'user-local', dataOrigin: 'bundled-fixture', cloudModel });
      const pass = r.inferenceSource === 'on_device' && r.ledger.inferenceRequests === 0;
      setS1({
        status: pass ? 'pass' : 'fail',
        lines: [
          `online: ${navigator.onLine}`,
          `inferenceSource: ${r.inferenceSource}`,
          `latency: ${r.latencyMs} ms${r.ledger.coldStart ? ' (cold start)' : ''}`,
          `requests to Gemini endpoints during the call: ${r.ledger.inferenceRequests}`,
          `output: ${r.raw}`,
        ],
        data: { online: navigator.onLine, source: r.inferenceSource, latencyMs: r.latencyMs, cold: r.ledger.coldStart },
      });
    } catch (e) {
      setS1({ status: 'fail', lines: [`error: ${e instanceof Error ? e.message : String(e)}`] });
    }
  }

  async function runS2() {
    setS2({ status: 'running', lines: [] });
    const original = Object.getOwnPropertyDescriptor(self, 'LanguageModel');
    const lines: string[] = [];
    let overridden = false;
    if (simulateNoNano) {
      try {
        Object.defineProperty(self, 'LanguageModel', { value: undefined, configurable: true, writable: true });
        overridden = true;
        lines.push('Simulating a browser without LanguageModel (global hidden for this test).');
      } catch {
        lines.push('Could not hide LanguageModel in this browser; open the Lab in Firefox/Safari instead.');
      }
    }
    try {
      const r = await runTask(extractActTask, extractActInput({ act: 'Morphine 2mg SC PRN for pain 7/10', time: '23:05' }), {
        route: 'user-local',
        dataOrigin: 'user-import',
        cloudModel,
      });
      lines.push(`inferenceSource: ${r.inferenceSource}`, `Gemini requests: ${r.ledger.inferenceRequests}`);
      setS2({ status: r.inferenceSource === 'on_device' && r.ledger.inferenceRequests === 0 ? 'pass' : 'fail', lines });
    } catch (e) {
      // Being blocked is the correct outcome when there is no local model.
      const sum = ledgerSummary();
      lines.push(`blocked: ${e instanceof Error ? e.message : String(e)}`, `user-data requests to cloud so far: ${sum.userDataRequestsToCloud}`);
      setS2({ status: sum.userDataRequestsToCloud === 0 ? 'pass' : 'fail', lines });
    } finally {
      if (overridden) {
        if (original) Object.defineProperty(self, 'LanguageModel', original);
        else delete (self as unknown as Record<string, unknown>).LanguageModel;
      }
    }
  }

  async function runS3(route: Route, set: (s: SpikeState) => void) {
    set({ status: 'running', lines: ['loading fixtures…'] });
    try {
      const key = (await (await fetch('/fixtures/dev/dev-key.json')).json()) as DevKey;
      const lines: string[] = [];
      const results: unknown[] = [];
      let mapOk = 0;
      let mapTotal = 0;
      let exOk = 0;
      let exTotal = 0;
      let invented = 0;
      const latencies: number[] = [];
      let cold: number | null = null;
      for (const v of key.variants) {
        const buf = await (await fetch(`/fixtures/dev/${v.file}`)).arrayBuffer();
        const grid = await parseSpreadsheet(v.file, buf);
        const opts = { route, dataOrigin: 'bundled-fixture' as const, cloudModel, outgoingRefs: [`fixture:dev/${v.file}`] };
        const m = await runTask(mapColumnsTask, mapColumnsInput(grid.headers, grid.rows), opts);
        const ms = scoreMapping(m.value, v.mapping);
        mapOk += ms.correct;
        mapTotal += ms.total;
        lines.push(`${v.label}: mapping ${ms.correct}/${ms.total} (${m.latencyMs} ms, ${m.inferenceSource})`);
        ms.perColumn.filter((c) => !c.ok).forEach((c) => lines.push(`   ✗ col ${c.index} "${grid.headers[c.index]}": expected ${c.expected}, got ${c.got}`));
        for (let i = 0; i < grid.rows.length; i++) {
          const row = grid.rows[i]!;
          const k = v.rows[i];
          if (!k) continue;
          const input = extractActInput({
            act: row[v.entry.act] ?? '',
            notes: v.entry.notes !== null ? row[v.entry.notes] : undefined,
            time: v.entry.time !== null ? row[v.entry.time] : undefined,
          });
          try {
            const x = await runTask(extractActTask, input, opts);
            if (x.ledger.coldStart) cold = x.latencyMs;
            else latencies.push(x.latencyMs);
            const sc = scoreExtraction(x.value, k, input);
            exOk += sc.correct;
            exTotal += sc.total;
            invented += sc.unverified.length;
            const bad = sc.fields.filter((f) => f.ok === false).map((f) => `${f.field}="${f.got}"`);
            lines.push(
              `   row ${i + 1}: ${sc.correct}/${sc.total}${bad.length ? `  ✗ ${bad.join(', ')}` : ''}${sc.unverified.length ? `  ⚠ not in source: ${sc.unverified.join(', ')}` : ''}  (${x.latencyMs} ms)`,
            );
            results.push({ variant: v.file, row: i + 1, output: x.value, score: sc.correct, of: sc.total, unverified: sc.unverified, ms: x.latencyMs, source: x.inferenceSource });
          } catch (e) {
            exTotal += 6;
            lines.push(`   row ${i + 1}: ERROR ${e instanceof Error ? e.message : String(e)}`);
          }
          set({ status: 'running', lines: [...lines] });
        }
      }
      const sorted = [...latencies].sort((a, b) => a - b);
      const median = sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0;
      const summary = {
        route,
        mapping: `${mapOk}/${mapTotal}`,
        extraction: `${exOk}/${exTotal} (${exTotal ? Math.round((100 * exOk) / exTotal) : 0}%)`,
        valuesNotInSource: invented,
        coldStartMs: cold,
        medianWarmMs: median,
      };
      lines.unshift(`SUMMARY ${JSON.stringify(summary)}`);
      set({ status: 'pass', lines, data: { summary, results } });
    } catch (e) {
      set({ status: 'fail', lines: [`error: ${e instanceof Error ? e.message : String(e)}`] });
    }
  }

  /** Mapping only: whole-table prompt vs one prompt per column, each raw and after reconciliation with value shapes. */
  async function runS3m(route: Route) {
    setS3m({ status: 'running', lines: ['loading fixtures…'] });
    try {
      const key = (await (await fetch('/fixtures/dev/dev-key.json')).json()) as DevKey;
      const lines: string[] = [];
      const tally = { tableRaw: 0, tableRec: 0, colRaw: 0, colRec: 0, total: 0, flaggedTable: 0, flaggedCol: 0, msTable: 0, msCol: 0 };
      for (const v of key.variants) {
        const buf = await (await fetch(`/fixtures/dev/${v.file}`)).arrayBuffer();
        const grid = await parseSpreadsheet(v.file, buf);
        const profiles = profileColumns(grid.headers, grid.rows);
        const opts = { route, dataOrigin: 'bundled-fixture' as const, cloudModel, outgoingRefs: [`fixture:dev/${v.file}#headers`] };

        const t = await runTask(mapColumnsTask, mapColumnsInput(grid.headers, grid.rows), opts);
        const tableRec = reconcileMapping(profiles, t.value);
        tally.msTable += t.latencyMs;

        const perCol = [];
        let msCol = 0;
        for (const p of profiles) {
          const r = await runTask(mapColumnTask, mapColumnInput(grid.headers, p), opts);
          msCol += r.latencyMs;
          perCol.push({ index: p.index, ...r.value });
        }
        tally.msCol += msCol;
        const colRec = reconcileMapping(profiles, perCol);

        const s = {
          tableRaw: scoreMapping(t.value, v.mapping).correct,
          tableRec: scoreMapping(tableRec.map((c) => ({ index: c.index, field: c.field, confidence: 'high' as const })), v.mapping).correct,
          colRaw: scoreMapping(perCol, v.mapping).correct,
          colRec: scoreMapping(colRec.map((c) => ({ index: c.index, field: c.field, confidence: 'high' as const })), v.mapping).correct,
        };
        tally.tableRaw += s.tableRaw;
        tally.tableRec += s.tableRec;
        tally.colRaw += s.colRaw;
        tally.colRec += s.colRec;
        tally.total += v.mapping.length;
        tally.flaggedTable += tableRec.filter((c) => c.needsReview).length;
        tally.flaggedCol += colRec.filter((c) => c.needsReview).length;
        const n = v.mapping.length;
        lines.push(
          `${v.label}: table ${s.tableRaw}/${n} → reconciled ${s.tableRec}/${n} (${t.latencyMs} ms) | per-column ${s.colRaw}/${n} → reconciled ${s.colRec}/${n} (${msCol} ms)`,
        );
        colRec
          .filter((c) => c.needsReview || c.field !== v.mapping[c.index])
          .forEach((c) =>
            lines.push(
              `   ${c.field === v.mapping[c.index] ? '⚑' : '✗'} col ${c.index} "${c.header}": ${c.field} (model ${c.model}, shape ${c.shape}${c.reason ? `; ${c.reason}` : ''})`,
            ),
          );
        setS3m({ status: 'running', lines: [...lines] });
      }
      const summary = {
        route,
        tableRaw: `${tally.tableRaw}/${tally.total}`,
        tableReconciled: `${tally.tableRec}/${tally.total}`,
        perColumnRaw: `${tally.colRaw}/${tally.total}`,
        perColumnReconciled: `${tally.colRec}/${tally.total}`,
        flaggedForReview: { table: tally.flaggedTable, perColumn: tally.flaggedCol },
        totalMs: { table: tally.msTable, perColumn: tally.msCol },
      };
      lines.unshift(`SUMMARY ${JSON.stringify(summary)}`, '⚑ = correct but flagged for the reviewer · ✗ = wrong');
      setS3m({ status: 'pass', lines, data: { summary } });
    } catch (e) {
      setS3m({ status: 'fail', lines: [`error: ${e instanceof Error ? e.message : String(e)}`] });
    }
  }

  async function runS5() {
    const lines: string[] = [];
    setS5({ status: 'running', lines: ['loading the Ward 7B drill…'] });
    try {
      const r = await runDrillBench({
        cloudModel,
        withCloud: s5cloud,
        pairPrompt: s5prompt,
        onProgress: (p) => setS5({ status: 'running', lines: [...lines, `${p.stage} ${p.total > 1 ? `(${p.done}/${p.total})` : ''}`] }),
      });
      lines.push('MAPPING (adaptive)');
      r.mapping.forEach((m) => lines.push(`   ${m.file}: ${m.correct}/${m.total} correct, ${m.flagged} flagged for review`));
      lines.push(
        '',
        `PAIR JUDGMENTS (prompt: ${r.local.prompt}): ${r.local.calls}/${r.local.judged} judged locally (${r.local.onDevice} on_device, ${r.local.inCloud} in_cloud)`,
        `   "same act?" right: ${r.local.sameActAgree}/${r.local.calls} · full relation right: ${r.local.agreeWithGold} raw → ${r.local.agreeAfterGuard} after Lantern's rules`,
      );
      r.pairs.forEach((p) =>
        lines.push(
          `   ${p.local === p.gold || (p.gold === 'separate' && p.local === 'insufficient') ? '✓' : p.localGuarded === p.gold ? '↻' : '✗'} ${p.pair.padEnd(16)} gold ${p.gold.padEnd(10)} nano ${p.local.padEnd(12)} → ${p.localGuarded.padEnd(12)}${p.cloud !== '—' ? ` cloud ${p.cloud}` : ''}${p.rule ? `  (${p.rule})` : ''}`,
        ),
      );
      lines.push('   ✓ Nano right · ↻ fixed by a rule · ✗ still wrong');
      if (r.cloud)
        lines.push(
          `SECOND OPINION: ${r.cloud.calls} cloud calls. Raw answers: ${r.cloud.agreeWithGold}/${r.cloud.calls} match the key, ${r.cloud.corrected} fix a local error, ${r.cloud.introducedErrors} contradict a right local answer. After Lantern's rules: ${r.cloud.agreeAfterGuard}/${r.cloud.calls} match, ${r.cloud.introducedAfterGuard} new errors.`,
        );
      lines.push('', 'METHOD                                   | same-act recall | precision | false merges | corrections | false corr. | open Qs | v1-only kept | identity | ready (27) | open (2)');
      for (const m of r.methods) {
        const s = m.score;
        lines.push(
          `${m.name.padEnd(41)}| ${s.sameActRecall.padEnd(16)}| ${s.sameActPrecision.padEnd(10)}| ${String(s.falseMerges.length).padEnd(13)}| ${s.amendmentsFound.padEnd(12)}| ${String(s.spuriousCorrections).padEnd(12)}| ${s.openQuestionsKept.padEnd(8)}| ${s.earlierOnlyKept.padEnd(13)}| ${s.identityFound.padEnd(9)}| ${String(s.worklist.ready).padEnd(11)}| ${s.worklist.unresolved}`,
        );
        if (s.falseMerges.length) lines.push(`      false merges: ${s.falseMerges.join(', ')}`);
      }
      lines.push('', `time: mapping ${r.ms.mapping} ms, reconciliation ${r.ms.reconcile} ms`);
      setS5({ status: 'pass', lines, data: r });
    } catch (e) {
      setS5({ status: 'fail', lines: [...lines, `error: ${e instanceof Error ? e.message : String(e)}`] });
    }
  }

  async function runS4() {
    setS4({ status: 'running', lines: [] });
    const lines: string[] = [`build ${__BUILD_ID__}`, `Remote Config: ${config ? `${config.source}, cloud model ${config.cloudModel}, fallback ${config.cloudFallbackModel}` : 'not loaded yet'}`];
    const seen = new Set(getLedger().map((e) => e.id));
    const attempts = () =>
      getLedger()
        .filter((e) => !seen.has(e.id))
        .reverse()
        .map((e, i) => `attempt ${i + 1}: ${e.model}, ${e.inferenceSource}, ${e.latencyMs} ms${e.note ? `, ${e.note.slice(0, 140)}` : ''}`);
    try {
      const ac = getAppCheckInstance();
      if (ac) {
        const t = await getToken(ac, false);
        lines.push(`App Check token: obtained (${t.token.length} chars, not shown)${appCheckDebugMode ? ' — DEBUG provider' : ''}`);
      } else {
        lines.push('App Check: not configured in this build');
      }
      const r = await runTask(extractActTask, SMOKE_ENTRY, {
        route: 'cloud',
        dataOrigin: 'bundled-fixture',
        cloudModel,
        outgoingRefs: ['fixture:smoke-entry'],
      });
      lines.push(...attempts(), `inferenceSource: ${r.inferenceSource}`, `model: ${r.ledger.model}`, `latency: ${r.latencyMs} ms`, `output: ${r.raw}`);
      setS4({ status: r.inferenceSource === 'in_cloud' ? 'pass' : 'fail', lines, data: { latencyMs: r.latencyMs, model: r.ledger.model } });
    } catch (e) {
      lines.push(...attempts(), `error: ${e instanceof Error ? e.message : String(e)}`);
      setS4({ status: 'fail', lines });
    }
  }

  const report = useMemo(
    () => ({
      at: new Date().toISOString(),
      env,
      config,
      firebase: { configured: firebaseConfigured, projectId, appCheck: appCheckConfigured },
      S1: s1.data ?? s1.status,
      S2: { status: s2.status, lines: s2.lines },
      S3_local: (s3.data as { summary?: unknown } | undefined)?.summary ?? s3.status,
      S3_cloud: (s3cloud.data as { summary?: unknown } | undefined)?.summary ?? s3cloud.status,
      S3_mapping: (s3m.data as { summary?: unknown } | undefined)?.summary ?? s3m.status,
      S5_drill: s5.data ? { lines: s5.lines } : s5.status,
      S4: s4.data ?? s4.status,
      ledger: ledgerSummary(ledger),
    }),
    [env, config, s1, s2, s3, s3cloud, s3m, s5, s4, ledger],
  );

  function download() {
    const full = { ...report, S3_local_rows: (s3.data as { results?: unknown })?.results, S3_cloud_rows: (s3cloud.data as { results?: unknown })?.results, ledgerEntries: ledger };
    const blob = new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lantern-lab-${Date.now()}.json`;
    a.click();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Lantern · Lab</p>
          <h1 className="text-2xl font-semibold">Day-1 gate: does the plan hold on this machine?</h1>
        </div>
        <a href="#/" className="text-sm text-ink-400 underline-offset-4 hover:underline">
          ← back
        </a>
      </header>

      <section className="mb-6 grid gap-3 rounded-xl border border-ink-700 bg-ink-850 p-4 text-sm sm:grid-cols-2">
        <Kv k="Prompt API (LanguageModel)" v={env ? (env.promptApi ? 'present' : 'absent') : '…'} />
        <Kv k="Gemini Nano availability" v={env?.availability ?? '…'} />
        <Kv k="Chrome major version" v={env?.chromeMajor ?? 'not Chrome'} />
        <Kv k="Network" v={env ? (env.online ? 'online' : 'OFFLINE') : '…'} />
        <Kv k="Local context window" v={env?.contextWindow ?? 'n/a'} />
        <Kv k="Firebase project" v={projectId ?? 'not configured'} />
        <Kv k="App Check" v={appCheckConfigured ? (appCheckDebugMode ? 'reCAPTCHA Enterprise (debug)' : 'reCAPTCHA Enterprise') : 'not configured'} />
        <Kv k="Remote Config" v={config ? `${config.source}: cloud model ${config.cloudModel}, fallback ${config.cloudFallbackModel}` : '…'} />
        <Kv k="Build" v={__BUILD_ID__} />
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3 pt-1">
          <button onClick={prepare} className={btn}>
            <Download size={16} /> Prepare Gemini Nano (download / warm up)
          </button>
          {progress !== null && (
            <div className="flex min-w-48 flex-1 items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded bg-ink-700">
                <div className="h-full bg-device transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <span className="font-mono text-xs">{Math.round(progress * 100)}%</span>
            </div>
          )}
          <button onClick={refreshEnv} className={btnGhost}>
            Refresh
          </button>
        </div>
        {prepareError && <p className="sm:col-span-2 text-sm text-alert">{prepareError}</p>}
        {env && (!env.promptApi || env.availability === 'unavailable') && <NanoHelp env={env} />}
      </section>

      <Spike
        icon={<WifiOff size={18} />}
        title="S1 · On-device works offline"
        how="Run once online. Then go offline (turn Wi-Fi off), close Chrome completely, reopen this page from history, and run again. Pass = on_device with 0 Gemini requests while offline."
        state={s1}
        onRun={runS1}
      />
      <Spike
        icon={<ShieldCheck size={18} />}
        title="S2 · Imported data never reaches the cloud"
        how="Runs a 'user-import' prompt on the ONLY_ON_DEVICE route. Tick the box to simulate a browser without Gemini Nano (Lantern must block, not fall back). Also try this page in Firefox."
        state={s2}
        onRun={runS2}
        extra={
          <label className="flex items-center gap-2 text-xs text-ink-400">
            <input type="checkbox" checked={simulateNoNano} onChange={(e) => setSimulateNoNano(e.target.checked)} /> simulate no
            Gemini Nano
          </label>
        }
      />
      <Spike
        icon={<Cpu size={18} />}
        title="S3 · Nano mapping + extraction quality (3 sheets, 33 calls)"
        how="Synthetic dev sheets with different improvised headers. Scores column mapping and field extraction against the answer key, flags values not found in the source, and measures cold/warm latency."
        state={s3}
        onRun={() => runS3('user-local', setS3)}
      />
      <Spike
        icon={<Cpu size={18} />}
        title="S3m · Mapping strategies (table vs per-column, raw vs reconciled)"
        how="Mapping only (≈20 on-device calls). Compares one prompt for the whole table with one prompt per column, each before and after reconciliation with Lantern's deterministic value-shape profile."
        state={s3m}
        onRun={() => runS3m('user-local')}
      />
      <Spike
        icon={<FlaskConical size={18} />}
        title="S5 · Ward 7B drill benchmark (frozen answer key)"
        how="Full pipeline on the bundled drill: adaptive mapping, identity checks, exact copies, on-device pair judgments, and optionally a cloud second opinion on disputed pairs. Compares with 'latest file only' and 'exact copies only'."
        state={s5}
        onRun={runS5}
        extra={
          <div className="flex flex-col gap-1 text-xs text-ink-400">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={s5cloud} onChange={(e) => setS5cloud(e.target.checked)} /> with cloud second opinion
            </label>
            <label className="flex items-center gap-2">
              on-device question
              <select
                className="rounded border border-ink-600 bg-ink-900 px-1 py-0.5"
                value={s5prompt}
                onChange={(e) => setS5prompt(e.target.value as 'same-event' | 'four-way')}
              >
                <option value="same-event">same act? (yes/no/unsure)</option>
                <option value="four-way">four-way relation</option>
              </select>
            </label>
          </div>
        }
      />
      <Spike
        icon={<Cloud size={18} />}
        title="S3b · Same set in the cloud (comparison)"
        how="Runs the identical synthetic set with ONLY_IN_CLOUD so we can compare quality and latency with Nano."
        state={s3cloud}
        onRun={() => runS3('cloud', setS3cloud)}
      />
      <Spike
        icon={<Cloud size={18} />}
        title="S4 · App Check-protected cloud call"
        how="Gets an App Check token and makes one ONLY_IN_CLOUD call on a bundled synthetic entry."
        state={s4}
        onRun={runS4}
      />

      <section className="mt-8 rounded-xl border border-ink-700 bg-ink-850 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold">
            <FlaskConical size={18} /> Report
          </h2>
          <div className="flex gap-2">
            <button className={btnGhost} onClick={() => void navigator.clipboard.writeText(JSON.stringify(report, null, 2))}>
              Copy summary
            </button>
            <button className={btn} onClick={download}>
              Download full report
            </button>
          </div>
        </div>
        <pre className="max-h-80 overflow-auto rounded bg-ink-950 p-3 font-mono text-xs leading-relaxed text-ink-200">
          {JSON.stringify(report, null, 2)}
        </pre>
      </section>

      <section className="mt-6 rounded-xl border border-ink-700 bg-ink-850 p-4">
        <h2 className="mb-3 font-semibold">Provenance ledger ({ledger.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="text-ink-400">
              <tr>
                <th className="py-1 pr-3">task</th>
                <th className="pr-3">mode</th>
                <th className="pr-3">ran</th>
                <th className="pr-3">ms</th>
                <th className="pr-3">origin</th>
                <th className="pr-3">Gemini req.</th>
                <th>note</th>
              </tr>
            </thead>
            <tbody>
              {ledger.slice(0, 60).map((e) => (
                <tr key={e.id} className="border-t border-ink-700">
                  <td className="py-1 pr-3">{e.task}</td>
                  <td className="pr-3">{e.mode}</td>
                  <td className={`pr-3 ${e.inferenceSource === 'on_device' ? 'text-device' : e.inferenceSource === 'in_cloud' ? 'text-cloud' : 'text-alert'}`}>
                    {e.inferenceSource}
                  </td>
                  <td className="pr-3">{e.latencyMs}</td>
                  <td className="pr-3">{e.dataOrigin}</td>
                  <td className="pr-3">{e.inferenceRequests}</td>
                  <td className="max-w-xs truncate text-ink-400">{e.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const btn =
  'inline-flex items-center gap-2 rounded-lg bg-lamp px-3 py-2 text-sm font-medium text-ink-950 hover:brightness-110 disabled:opacity-50';
const btnGhost = 'inline-flex items-center gap-2 rounded-lg border border-ink-600 px-3 py-2 text-sm hover:bg-ink-800';

function NanoHelp({ env }: { env: EnvironmentReport }) {
  return (
    <div className="sm:col-span-2 rounded-lg border border-lamp/40 bg-lamp/5 p-3 text-sm leading-relaxed">
      <p className="mb-2 font-medium text-lamp">
        {env.promptApi
          ? 'Chrome exposes the Prompt API, but reports Gemini Nano as unavailable on this device.'
          : 'This browser does not expose Chrome’s built-in Prompt API (no LanguageModel global).'}
      </p>
      <ol className="list-decimal space-y-1 pl-5 text-ink-200">
        <li>
          Use desktop Chrome and update it at <code className="font-mono">chrome://settings/help</code>
          {env.chromeMajor ? ` (this is Chrome ${env.chromeMajor})` : ' (this does not look like Chrome)'}.
        </li>
        <li>
          In <code className="font-mono">chrome://flags</code> set <code className="font-mono">#optimization-guide-on-device-model</code> to
          “Enabled BypassPerfRequirement” and <code className="font-mono">#prompt-api-for-gemini-nano</code> to “Enabled”, then relaunch.
        </li>
        <li>
          Check <code className="font-mono">chrome://on-device-internals</code> (Model Status). Gemini Nano needs ~22&nbsp;GB of free disk and
          a GPU with more than 4&nbsp;GB VRAM, or 16&nbsp;GB RAM and 4 CPU cores.
        </li>
        <li>Come back, press Refresh, then “Prepare Gemini Nano”.</li>
      </ol>
      <p className="mt-2 text-xs text-ink-400">
        Until then Lantern refuses to process imported files here: patient data is never sent to the cloud as a fallback.
      </p>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="flex justify-between gap-3 border-b border-ink-700/60 pb-1">
      <span className="text-ink-400">{k}</span>
      <span className="text-right font-mono">{v}</span>
    </div>
  );
}

function Spike(props: { icon: React.ReactNode; title: string; how: string; state: SpikeState; onRun: () => void; extra?: React.ReactNode }) {
  const { status, lines } = props.state;
  const badge =
    status === 'pass'
      ? 'bg-device/15 text-device'
      : status === 'fail'
        ? 'bg-alert/15 text-alert'
        : status === 'running'
          ? 'bg-lamp/15 text-lamp'
          : 'bg-ink-700 text-ink-400';
  return (
    <section className="mb-4 rounded-xl border border-ink-700 bg-ink-850 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="flex items-center gap-2 font-semibold">
            {props.icon} {props.title}
          </h2>
          <p className="mt-1 text-sm text-ink-400">{props.how}</p>
        </div>
        <div className="flex items-center gap-3">
          {props.extra}
          <span className={`rounded px-2 py-0.5 font-mono text-xs ${badge}`}>{status}</span>
          <button className={btn} onClick={props.onRun} disabled={status === 'running'}>
            Run
          </button>
        </div>
      </div>
      {lines.length > 0 && (
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-ink-950 p-3 font-mono text-xs leading-relaxed text-ink-200">
          {lines.join('\n')}
        </pre>
      )}
    </section>
  );
}
