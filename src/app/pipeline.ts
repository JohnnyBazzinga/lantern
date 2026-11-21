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
import type { Act, IdentityIssue, MatchCandidate, SourceFile } from '../core/types';

export type Progress = (p: { stage: string; done: number; total: number }) => void;

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
  onProgress?.({ stage: `Reading the columns of ${file.name}`, done: 0, total: 1 });
  try {
    opinions = (await runTask(mapColumnsTask, mapColumnsInput(file.headers, file.rows), opts)).value;
  } catch {
    return reconcileMapping(profiles, []).map((c) => ({ ...c, needsReview: c.needsReview || c.shape === null }));
  }
  let cols = reconcileMapping(profiles, opinions);
  const disputed = cols.filter((c) => c.needsReview);
  let i = 0;
  for (const c of disputed) {
    onProgress?.({ stage: `Double-checking column “${c.header}”`, done: ++i, total: disputed.length });
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
    for (const c of todo) {
      o.onProgress?.({ stage: 'Comparing rows on this device', done: done++, total: todo.length });
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
    }
  }

  const escalated = escalations(candidates, byId);
  if (o.secondOpinion && o.judge !== false && escalated.size) {
    assertCloudAllowed(files); // throws for anything a user imported
    let done = 0;
    for (const [cid] of escalated) {
      const c = candidates.find((x) => x.id === cid)!;
      const a = byId.get(c.a)!;
      const b = byId.get(c.b)!;
      o.onProgress?.({ stage: 'Asking for a second opinion (synthetic drill data)', done: done++, total: escalated.size });
      const context = acts.filter((x) => x.patientKey && x.patientKey === a.patientKey);
      try {
        const r = await runTask(secondOpinionTask, secondOpinionInput(a, b, context), {
          route: 'cloud',
          dataOrigin: 'bundled-fixture',
          cloudModel: o.cloudModel,
          outgoingRefs: [a.id, b.id, ...context.map((x) => x.id)].filter((v, i, s) => s.indexOf(v) === i),
        });
        c.cloud = { ...r.value, source: r.inferenceSource, ledgerId: r.ledger.id };
      } catch {
        /* the local verdict stands; the pair stays flagged */
      }
    }
  }

  const proposals = propose({ earlier, later, candidates, identity });
  return { acts, earlier, later, identity, candidates, escalated, proposals };
}
