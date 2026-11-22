import { assertCloudAllowed, cloudAllowed } from '../ai/cloudPayload';
import { runTask, type Route } from '../ai/models';
import { mapColumnInput, mapColumnTask } from '../ai/prompts/v1/mapColumn';
import { mapColumnsInput, mapColumnsTask } from '../ai/prompts/v1/mapColumns';
import { judgePairInput, judgePairTask } from '../ai/prompts/v1/judgePair';
import { sameEventInput, sameEventTask } from '../ai/prompts/v1/sameEvent';
import { secondOpinionInput, secondOpinionTask } from '../ai/prompts/v1/secondOpinion';
import { buildActs, buildCensus } from '../core/acts';
import { findCandidates } from '../core/candidates';
import { resolveIdentities } from '../core/identity';
import { reconcileMapping, type FinalColumn, type ModelOpinion } from '../core/mapping';
import { profileColumns } from '../core/profile';
import { escalations, propose, type EscalationReason, type Proposal } from '../core/reconcile';
import type { Act, IdentityIssue, MatchCandidate, Relation, SourceFile } from '../core/types';
import { msgs, tr } from '../i18n/lang';

const STAGE = msgs(
  {
    columns: (file: string) => `Reading the columns of ${file}`,
    column: (header: string) => `Double-checking column “${header}”`,
    local: 'Comparing rows on this device',
    drill: 'Comparing the two versions',
    drillDetail: 'Fictional drill: on this device if it has the AI, otherwise in the cloud.',
    cloud: 'Asking the cloud for a second opinion',
    cloudDetail: 'Fictional drill rows only.',
  },
  {
    columns: (file) => `A ler as colunas de ${file}`,
    column: (header) => `A confirmar a coluna “${header}”`,
    local: 'A comparar as linhas neste computador',
    drill: 'A comparar as duas versões',
    drillDetail: 'Simulacro fictício: neste computador, se tiver a IA; senão, na nuvem.',
    cloud: 'A pedir uma segunda opinião à nuvem',
    cloudDetail: 'Só linhas fictícias do simulacro.',
  },
);

/** `stage` is the headline of what Lantern is doing; `detail` is the small print under it, when there is any. */
/**
 * A pair a model has just read, for the live list on the progress screen. It lives only in memory
 * for that screen: it is never stored and never sent. relation is the model's own reading (Lantern's
 * rules may still override it in the review); null when the call failed or was blocked.
 */
export interface JudgedPair {
  a: string;
  b: string;
  relation: Relation | null;
  source: 'on_device' | 'in_cloud' | null;
}

export type Progress = (p: { stage: string; detail?: string; done: number; total: number; judged?: JudgedPair }) => void;

/** Imported files run on-device only; the bundled drill may use the SDK's automatic cloud fallback. */
export function routeFor(files: SourceFile[]): Route {
  return files.every(cloudAllowed) ? 'drill-hybrid' : 'user-local';
}

const dataOrigin = (files: SourceFile[]) => (files.every(cloudAllowed) ? ('bundled-fixture' as const) : ('user-import' as const));

/**
 * Adaptive column mapping: one whole-table prompt, then per-column prompts only where Gemini Nano
 * and the deterministic value shapes disagree. Without a local model it falls back to value
 * shapes alone and flags every column it cannot settle, so the reviewer maps them by hand.
 */
export async function mapFile(file: SourceFile, cloudModel: string, onProgress?: Progress): Promise<FinalColumn[]> {
  const route = routeFor([file]);
  const opts = { route, dataOrigin: dataOrigin([file]), cloudModel, outgoingRefs: [`${file.name}#headers+3 samples`] };
  const profiles = profileColumns(file.headers, file.rows);
  let opinions: ModelOpinion[] = [];
  onProgress?.({ stage: tr(STAGE).columns(file.name), done: 0, total: 1 });
  try {
    opinions = (await runTask(mapColumnsTask, mapColumnsInput(file.headers, file.rows), opts)).value;
  } catch {
    return reconcileMapping(profiles, []);
  }
  let cols = reconcileMapping(profiles, opinions);
  const disputed = cols.filter((c) => c.needsReview);
  let i = 0;
  for (const c of disputed) {
    onProgress?.({ stage: tr(STAGE).column(c.header), done: ++i, total: disputed.length });
    try {
      const r = await runTask(mapColumnTask, mapColumnInput(file.headers, profiles[c.index]!), opts);
      opinions = [...opinions.filter((o) => o.index !== c.index), { index: c.index, ...r.value }];
    } catch {
      /* keep the first reading; the column stays flagged */
    }
  }
  if (disputed.length) cols = reconcileMapping(profiles, opinions);
  return cols;
}

export interface ReconcileResult {
  acts: Act[];
  earlier: Act[];
  later: Act[];
  identity: IdentityIssue[];
  candidates: MatchCandidate[];
  escalated: Map<string, EscalationReason[]>;
  proposals: Proposal[];
}

export interface ReconcileOptions {
  census: SourceFile | null;
  earlier: SourceFile;
  later: SourceFile;
  cloudModel: string;
  /** cloud second opinion on disputed pairs (only ever applied to bundled synthetic files) */
  secondOpinion: boolean;
  /** skip model judgments entirely (exact-copy baseline) */
  judge?: boolean;
  /** on-device pair question: narrow "same act?" (default) or the four-way relation prompt */
  pairPrompt?: 'same-event' | 'four-way';
  onProgress?: Progress;
}

export async function reconcileFiles(o: ReconcileOptions): Promise<ReconcileResult> {
  const files = [o.earlier, o.later, ...(o.census ? [o.census] : [])];
  const route = routeFor(files);
  const earlier = buildActs(o.earlier);
  const later = buildActs(o.later);
  const acts = [...earlier, ...later];
  const byId = new Map(acts.map((a) => [a.id, a]));
  const identity = resolveIdentities(acts, o.census ? buildCensus(o.census) : []);
  const candidates = findCandidates(earlier, later);

  if (o.judge !== false) {
    const todo = candidates.filter((c) => !c.exact);
    let done = 0;
    const stage = () => ({
      stage: route === 'user-local' ? tr(STAGE).local : tr(STAGE).drill,
      detail: route === 'user-local' ? undefined : tr(STAGE).drillDetail,
      total: todo.length,
    });
    for (const c of todo) {
      o.onProgress?.({ ...stage(), done: done++ });
      try {
        const a = byId.get(c.a)!;
        const b = byId.get(c.b)!;
        const fourWay = o.pairPrompt === 'four-way';
        const r = await runTask(fourWay ? judgePairTask : sameEventTask, fourWay ? judgePairInput(a, b) : sameEventInput(a, b), {
          route,
          dataOrigin: dataOrigin(files),
          cloudModel: o.cloudModel,
          outgoingRefs: [c.id],
        });
        c.local = { ...r.value, source: r.inferenceSource, ledgerId: r.ledger.id };
      } catch {
        /* no local verdict: escalation reason 'local-unavailable' */
      }
      o.onProgress?.({ ...stage(), done, judged: { a: c.a, b: c.b, relation: c.local?.relation ?? null, source: c.local ? (c.local.source as JudgedPair['source']) : null } });
    }
  }

  const escalated = escalations(candidates, byId);
  if (o.secondOpinion && o.judge !== false && escalated.size) {
    await askSecondOpinion({ files, acts, candidates, escalated, cloudModel: o.cloudModel, onProgress: o.onProgress });
  }

  const proposals = propose({ earlier, later, candidates, identity });
  return { acts, earlier, later, identity, candidates, escalated, proposals };
}

/** What a second-opinion request would send, for the preview shown before Rita confirms. */
export function secondOpinionPreview(acts: Act[], candidates: MatchCandidate[], escalated: Map<string, EscalationReason[]>) {
  const byId = new Map(acts.map((a) => [a.id, a]));
  return [...escalated.entries()].map(([cid, reasons]) => {
    const c = candidates.find((x) => x.id === cid)!;
    const a = byId.get(c.a)!;
    const b = byId.get(c.b)!;
    const context = acts.filter((x) => x.patientKey && x.patientKey === a.patientKey);
    return { candidateId: cid, reasons, prompt: secondOpinionInput(a, b, context) };
  });
}

/**
 * Cloud second opinion on disputed pairs. Refuses (throws) unless every file is a bundled synthetic
 * drill file, recognised by its SHA-256. Each request carries clinical text only: no names,
 * hospital numbers or beds.
 */
export async function askSecondOpinion(o: {
  files: SourceFile[];
  acts: Act[];
  candidates: MatchCandidate[];
  escalated: Map<string, EscalationReason[]>;
  cloudModel: string;
  onProgress?: Progress;
}): Promise<number> {
  assertCloudAllowed(o.files);
  const byId = new Map(o.acts.map((a) => [a.id, a]));
  let done = 0;
  let answered = 0;
  for (const [cid] of o.escalated) {
    const c = o.candidates.find((x) => x.id === cid);
    if (!c) continue;
    const a = byId.get(c.a)!;
    const b = byId.get(c.b)!;
    o.onProgress?.({ stage: tr(STAGE).cloud, detail: tr(STAGE).cloudDetail, done: done++, total: o.escalated.size });
    const context = o.acts.filter((x) => x.patientKey && x.patientKey === a.patientKey);
    try {
      const r = await runTask(secondOpinionTask, secondOpinionInput(a, b, context), {
        route: 'cloud',
        dataOrigin: 'bundled-fixture',
        cloudModel: o.cloudModel,
        outgoingRefs: [a.id, b.id, ...context.map((x) => x.id)].filter((v, i, s) => s.indexOf(v) === i),
      });
      c.cloud = { ...r.value, source: r.inferenceSource, ledgerId: r.ledger.id };
      answered++;
    } catch {
      /* the local verdict stands; the pair stays flagged */
    }
    o.onProgress?.({
      stage: tr(STAGE).cloud,
      detail: tr(STAGE).cloudDetail,
      done,
      total: o.escalated.size,
      judged: { a: c.a, b: c.b, relation: c.cloud?.relation ?? null, source: c.cloud ? (c.cloud.source as JudgedPair['source']) : null },
    });
  }
  return answered;
}
