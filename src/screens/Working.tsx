import { useEffect, useMemo, useState } from 'react';
import { subscribeLedger, type LedgerEntry } from '../ai/ledger';
import { useSession } from '../app/session';
import { buildActs } from '../core/acts';
import type { Act } from '../core/types';
import { Backdrop } from '../ui/Backdrop';
import { Card, Kicker, Route, Wordmark } from '../ui/kit';
import { Tally } from '../ui/Tally';
import { RELATION } from './Review';
import { msgs } from '../i18n/lang';
import { useT } from '../i18n/react';

const M = msgs(
  {
    task: {
      'map-columns': 'Read the columns',
      'map-column': 'Double-checked one column',
      'same-event': 'Compared two rows',
      'judge-pair': 'Compared two rows',
      'second-opinion': 'Second opinion',
      'extract-act': 'Read one entry',
    } as Record<string, string>,
    of: (done: number, total: number) => `${done} of ${total}`,
    kicker: 'Lantern is working',
    readColumns: (file: string) => `Read the columns of ${file}`,
    second: 'Second opinion:',
    nano: 'Gemini Nano:',
    gemini: 'Gemini in the cloud:',
    noAnswer: "No answer: Lantern's rules will decide.",
    times: (a: string, b: string) => `${a} and ${b}`,
    noTime: 'no time',
    bed: (b: string) => `Bed ${b || '?'}`,
    failed: (n: number) => ` ${n} ${n === 1 ? 'call' : 'calls'} failed (a busy model or a stalled answer): Lantern retries once, then leaves that row for you to decide.`,
    blocked: (n: number) => ` ${n} blocked: no on-device AI here, so your data was not sent anywhere.`,
    failedShort: 'failed',
    blockedShort: 'blocked, nothing sent',
  },
  {
    task: {
      'map-columns': 'Leu as colunas',
      'map-column': 'Confirmou uma coluna',
      'same-event': 'Comparou duas linhas',
      'judge-pair': 'Comparou duas linhas',
      'second-opinion': 'Segunda opinião',
      'extract-act': 'Leu um registo',
    },
    of: (done, total) => `${done} de ${total}`,
    kicker: 'O Lantern está a trabalhar',
    readColumns: (file) => `Leu as colunas de ${file}`,
    second: 'Segunda opinião:',
    nano: 'Gemini Nano:',
    gemini: 'Gemini na nuvem:',
    noAnswer: 'Sem resposta: decidem as regras do Lantern.',
    times: (a, b) => `${a} e ${b}`,
    noTime: 'sem hora',
    bed: (b) => `Cama ${b || '?'}`,
    failed: (n) =>
      ` ${n} ${n === 1 ? 'pedido falhou' : 'pedidos falharam'} (o modelo estava ocupado ou deixou de responder): o Lantern tenta mais uma vez e, se falhar, deixa essa linha para decidir.`,
    blocked: (n) => ` ${n} ${n === 1 ? 'bloqueado' : 'bloqueados'}: não há IA local neste computador, por isso os seus dados não foram enviados para lado nenhum.`,
    failedShort: 'falhou',
    blockedShort: 'bloqueado, nada enviado',
  },
);

/**
 * While Lantern works: what it is doing, how far it is, and each pair a model has read, with the
 * model's own reading and where it ran. That reading is not the decision: Lantern's rules may still
 * override it, and the reviewer decides. Progress is drawn as the lantern moving through the night:
 * the band fills behind a lamp. Nothing is slowed down for show; with no model it is on screen for a moment.
 */
export default function Working() {
  const { busy, session } = useSession();
  const t = useT(M);
  const relation = useT(RELATION);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [since] = useState(() => new Date().toISOString());
  useEffect(() => subscribeLedger((es) => setEntries(es.filter((e) => e.at >= since))), [since]);
  const running = !!busy;
  // The rows behind each pair, read from the opened files (the drill's and the reviewer's own alike).
  const acts = useMemo(() => {
    const m = new Map<string, Act>();
    if (running && session) for (const f of session.files) if (f.role === 'log') for (const a of buildActs(f)) m.set(a.id, a);
    return m;
    // rebuilt when a run starts, not on every progress tick
  }, [running, session?.files]);
  if (!busy) return null;
  const pct = busy.total > 1 ? Math.round((100 * busy.done) / busy.total) : null;
  const failed = entries.filter((e) => e.inferenceSource === 'error').length;
  const blocked = entries.filter((e) => e.inferenceSource === 'blocked').length;
  const columns = entries.filter((e) => e.task.startsWith('map-column') && (e.inferenceSource === 'on_device' || e.inferenceSource === 'in_cloud'));
  // The pairs read so far, newest first, each with its call's time where the ledger kept a reference to it.
  const done = (e: LedgerEntry) => e.inferenceSource === 'on_device' || e.inferenceSource === 'in_cloud';
  const pairs = (busy.pairs ?? []).map((p) => {
    const second = entries.find((e) => done(e) && e.task === 'second-opinion' && e.outgoingRefs[0] === p.a && e.outgoingRefs[1] === p.b);
    const call = p.source === 'in_cloud' && second ? second : entries.find((e) => done(e) && e.task !== 'second-opinion' && e.outgoingRefs[0] === `${p.a}~${p.b}`);
    return { ...p, ms: call && call.inferenceSource === p.source ? call.latencyMs : null, second: call === second && !!second };
  });
  const lines = [
    ...pairs.map((p, i) => ({ key: `p${pairs.length - i}`, pair: p })),
    ...columns.map((e) => ({ key: e.id, entry: e })),
  ].slice(0, 6);
  const secs = (ms: number) => <span className="whitespace-nowrap text-[15px] tabular-nums text-ink-soft">{(ms / 1000).toFixed(1)} s</span>;

  return (
    <div className="fixed inset-0 z-50 isolate overflow-y-auto bg-paper px-4 pb-10 pt-6 sm:px-8" role="status" aria-live="polite">
      <Backdrop variant="page" />
      <div className="mx-auto w-full max-w-[1400px]">
        <Wordmark />
      </div>
      <div className="mx-auto mt-[6vh] w-full max-w-[820px]">
        <div className="min-h-[7.5rem]">
          <Kicker>{t.kicker}</Kicker>
          <p className="mt-4 font-display text-[32px] font-medium leading-[1.1] tracking-[-0.018em] text-ink sm:text-[44px]">{busy.stage}</p>
          {busy.detail && <p className="mt-2 max-w-[64ch] text-[17px] text-ink-soft">{busy.detail}</p>}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[#dde2d6]" aria-hidden>
            <div
              className={`absolute inset-y-0 left-0 rounded-full bg-forest transition-[width] duration-300 ${pct === null ? 'animate-pulse' : ''}`}
              style={{ width: `${pct ?? 8}%` }}
            />
          </div>
          <span className="w-[5.5rem] text-right font-mono text-[15px] tabular-nums text-ink-soft">{pct !== null ? t.of(busy.done, busy.total) : ''}</span>
        </div>

        {session && (
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Tally kind={session.kind} />
          </div>
        )}

        <div className="mt-6 min-h-[25rem]">
          {(failed > 0 || blocked > 0) && (
            <p className="mb-2 max-w-[70ch] text-[15px] text-ink-soft">
              {failed > 0 && t.failed(failed).trim()}
              {blocked > 0 && t.blocked(blocked)}
            </p>
          )}
          {lines.length > 0 && (
            <Card as="ul" className="overflow-hidden">
              {lines.map((l) => {
                if ('entry' in l) {
                  const e = l.entry;
                  const file = e.task === 'map-columns' ? e.outgoingRefs[0]?.split('#')[0] : undefined;
                  return (
                    <li key={l.key} className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3 text-[16px] last:border-b-0">
                      <span className="min-w-0">{file ? t.readColumns(file) : (t.task[e.task] ?? e.task)}</span>
                      <span className="flex shrink-0 items-center gap-3">
                        {secs(e.latencyMs)}
                        <Route source={e.inferenceSource as 'on_device' | 'in_cloud'} model={e.model} />
                      </span>
                    </li>
                  );
                }
                const p = l.pair;
                const a = acts.get(p.a);
                const b = acts.get(p.b);
                return (
                  <li key={l.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-b border-rule px-5 py-3 text-[16px] last:border-b-0">
                    <span className="min-w-0">
                      {p.second && <span className="text-ink-soft">{t.second} </span>}
                      <span className="font-semibold">{a?.patientName || b?.patientName || t.bed(a?.bed ?? '')}</span>
                      <span className="ml-3 whitespace-nowrap font-mono text-[14.5px] tabular-nums text-ink-soft">{t.times(a?.eventTime || t.noTime, b?.eventTime || t.noTime)}</span>
                    </span>
                    <span className="row-span-2 flex shrink-0 items-center gap-3">
                      {p.ms !== null && secs(p.ms)}
                      {p.source && <Route source={p.source} />}
                    </span>
                    {/* the model's own reading, named as the model's: the rules and the reviewer come after */}
                    <span className="text-[15px] text-ink-soft">
                      {p.relation && p.source ? (
                        <>
                          {p.source === 'on_device' ? t.nano : t.gemini} <span className="text-ink">{relation[p.relation]}</span>
                        </>
                      ) : (
                        t.noAnswer
                      )}
                    </span>
                  </li>
                );
              })}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
