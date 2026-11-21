import { loadDrillFiles } from '../app/files';
import { mapFile, reconcileFiles, type Progress } from '../app/pipeline';
import { guard, propose, type Proposal } from '../core/reconcile';
import { goldRelation, keyIds, scoreDrill, type AnswerKey, type DrillScore } from '../core/score';
import type { CanonicalField } from '../core/fields';

/**
 * The frozen drill benchmark. Four ways to turn the two emailed versions into one record:
 *  latest-only   take the most recent file (what most people would do)
 *  exact-only    merge identical rows, keep everything else (a careful spreadsheet user)
 *  local         Lantern with Gemini Nano only
 *  local+cloud   Lantern with a cloud second opinion on disputed pairs (synthetic data only)
 */

const EXPECTED_MAPPING: Record<string, CanonicalField[]> = {
  census: ['bed', 'patient_name', 'patient_id'],
  v1: ['bed', 'patient_name', 'patient_id', 'event_time', 'act', 'documented_by'],
  v2: ['bed', 'patient_name', 'patient_id', 'event_time', 'act', 'notes', 'documented_by'],
};

export interface BenchResult {
  mapping: { file: string; correct: number; total: number; flagged: number }[];
  methods: { name: string; score: DrillScore }[];
  local: { calls: number; onDevice: number; inCloud: number; agreeWithGold: number; agreeAfterGuard: number; judged: number };
  pairs: { pair: string; gold: string; local: string; localGuarded: string; cloud: string; rule: string }[];
  cloud: { calls: number; corrected: number; introducedErrors: number; agreeWithGold: number } | null;
  ms: { mapping: number; reconcile: number };
}

export async function runDrillBench(o: { cloudModel: string; withCloud: boolean; onProgress?: Progress }): Promise<BenchResult> {
  const key = (await (await fetch('/fixtures/drill/answer-key.json')).json()) as AnswerKey;
  const files = await loadDrillFiles();
  const t0 = performance.now();
  const mapping = [];
  for (const f of files) {
    f.mapping = await mapFile(f, o.cloudModel, o.onProgress);
    const exp = EXPECTED_MAPPING[f.id]!;
    mapping.push({
      file: f.name,
      correct: f.mapping.filter((c) => c.field === exp[c.index]).length,
      total: exp.length,
      flagged: f.mapping.filter((c) => c.needsReview).length,
    });
    // benchmark the reconciliation on a correct mapping (the reviewer confirms mapping in the product)
    f.mapping = f.mapping.map((c) => ({ ...c, field: exp[c.index] ?? c.field }));
  }
  const t1 = performance.now();
  const [census, v1, v2] = files as [(typeof files)[0], (typeof files)[0], (typeof files)[0]];
  const r = await reconcileFiles({ census, earlier: v1, later: v2, cloudModel: o.cloudModel, secondOpinion: o.withCloud, onProgress: o.onProgress });
  const t2 = performance.now();

  const ids = keyIds(key, r.acts);
  const base = { earlier: r.earlier, later: r.later, identity: r.identity };
  const latestOnly: Proposal[] = [
    ...r.earlier.map((a) => ({ actId: a.id, disposition: { kind: 'excluded' as const, reason: 'replaced by the latest file' }, because: '', needsReview: false, group: 'copies' as const })),
    ...r.later.map((b) => ({ actId: b.id, disposition: { kind: 'approved' as const }, because: '', needsReview: false, group: 'copies' as const })),
  ];
  const exactOnly = propose({ ...base, candidates: r.candidates.filter((c) => c.exact) });
  const localOnly = propose({ ...base, candidates: r.candidates.map((c) => ({ ...c, cloud: undefined })) });

  const methods = [
    { name: 'Latest file only', score: scoreDrill(key, r.acts, latestOnly, []) },
    { name: 'Exact copies only', score: scoreDrill(key, r.acts, exactOnly, r.identity) },
    { name: 'Lantern · on-device', score: scoreDrill(key, r.acts, localOnly, r.identity) },
  ];
  if (o.withCloud) methods.push({ name: 'Lantern · on-device + cloud second opinion', score: scoreDrill(key, r.acts, r.proposals, r.identity) });

  const judged = r.candidates.filter((c) => !c.exact);
  const gold = (c: (typeof judged)[0]) => goldRelation(key, ids.get(c.a) ?? '', ids.get(c.b) ?? '');
  const ok = (rel: string | undefined, g: string) => rel === g || (g === 'separate' && rel === 'insufficient');
  const withLocal = judged.filter((c) => c.local);
  const withCloud = judged.filter((c) => c.cloud);
  const byId = new Map(r.acts.map((a) => [a.id, a]));
  const guarded = (rel: string | undefined, c: (typeof judged)[0]) =>
    rel ? guard(rel as Parameters<typeof guard>[0], byId.get(c.a)!, byId.get(c.b)!) : { relation: '—' as const, rule: undefined };
  const pairs = judged.map((c) => {
    const lg = guarded(c.local?.relation, c);
    return {
      pair: `${ids.get(c.a) ?? c.a} ~ ${ids.get(c.b) ?? c.b}`,
      gold: gold(c),
      local: c.local?.relation ?? '—',
      localGuarded: lg.relation,
      cloud: c.cloud ? guarded(c.cloud.relation, c).relation : '—',
      rule: lg.rule ?? '',
    };
  });
  return {
    mapping,
    methods,
    pairs,
    local: {
      calls: withLocal.length,
      onDevice: withLocal.filter((c) => c.local!.source === 'on_device').length,
      inCloud: withLocal.filter((c) => c.local!.source === 'in_cloud').length,
      agreeWithGold: withLocal.filter((c) => ok(c.local!.relation, gold(c))).length,
      agreeAfterGuard: withLocal.filter((c) => ok(guarded(c.local!.relation, c).relation, gold(c))).length,
      judged: judged.length,
    },
    cloud: o.withCloud
      ? {
          calls: withCloud.length,
          corrected: withCloud.filter((c) => !ok(c.local?.relation, gold(c)) && ok(c.cloud!.relation, gold(c))).length,
          introducedErrors: withCloud.filter((c) => ok(c.local?.relation, gold(c)) && !ok(c.cloud!.relation, gold(c))).length,
          agreeWithGold: withCloud.filter((c) => ok(c.cloud!.relation, gold(c))).length,
        }
      : null,
    ms: { mapping: Math.round(t1 - t0), reconcile: Math.round(t2 - t1) },
  };
}
