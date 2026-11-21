import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  type AI,
  type GenerativeModel,
  type HybridParams,
} from 'firebase/ai';
import { getFirebaseApp } from '../firebase/app';
import { assertLocalReady, hasPromptApi, LOCAL_CORE_OPTIONS, LocalModelUnavailableError } from './capability';
import { recordLedger, type LedgerEntry, type LedgerMode } from './ledger';
import { inferenceRequests, watchRequests } from './netwatch';

/**
 * Three deliberate routes, one SDK:
 *  - 'user-local'   ONLY_ON_DEVICE  — anything derived from a file the user imported. Guarded: never runs
 *                                     unless the local model is confirmed available (patient data stays here).
 *  - 'drill-hybrid' PREFER_ON_DEVICE — the bundled synthetic drill. On a machine without Gemini Nano the SDK
 *                                     falls back to the cloud automatically, and the ledger labels it.
 *  - 'cloud'        ONLY_IN_CLOUD    — the second opinion. Callers may only pass bundled-fixture content
 *                                     (enforced in src/ai/cloudPayload.ts).
 */
export type Route = 'user-local' | 'drill-hybrid' | 'cloud';
export type DataOrigin = LedgerEntry['dataOrigin'];

export interface PromptTask<T> {
  id: string;
  version: string;
  system: string;
  /** JSON Schema used both as Chrome's responseConstraint and as the cloud responseJsonSchema */
  schema: Record<string, unknown>;
  /** returns the typed value or throws with a reason */
  parse: (json: unknown) => T;
}

export interface TaskResult<T> {
  value: T;
  raw: string;
  inferenceSource: 'on_device' | 'in_cloud';
  latencyMs: number;
  ledger: LedgerEntry;
}

const MODE: Record<Route, (typeof InferenceMode)[keyof typeof InferenceMode]> = {
  'user-local': InferenceMode.ONLY_ON_DEVICE,
  'drill-hybrid': InferenceMode.PREFER_ON_DEVICE,
  cloud: InferenceMode.ONLY_IN_CLOUD,
};

const LEDGER_MODE: Record<Route, LedgerMode> = {
  'user-local': 'only_on_device',
  'drill-hybrid': 'prefer_on_device',
  cloud: 'only_in_cloud',
};

let aiInstance: AI | null = null;
function ai(): AI {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase is not configured in this build (see .env.example).');
  aiInstance ??= getAI(app, { backend: new GoogleAIBackend(), useLimitedUseAppCheckTokens: true });
  return aiInstance;
}

const models = new Map<string, GenerativeModel>();

function modelFor(task: PromptTask<unknown>, route: Route, cloudModel: string): GenerativeModel {
  const key = `${task.id}@${task.version}|${route}|${cloudModel}`;
  const cached = models.get(key);
  if (cached) return cached;

  const params: HybridParams = { mode: MODE[route] };
  if (route !== 'cloud') {
    // On-device sessions ignore inCloudParams: the system prompt must travel in initialPrompts.
    params.onDeviceParams = {
      createOptions: {
        ...LOCAL_CORE_OPTIONS,
        initialPrompts: [{ role: 'system', content: [{ type: 'text', value: task.system }] }],
      },
      promptOptions: { responseConstraint: task.schema },
    };
  }
  if (route !== 'user-local') {
    params.inCloudParams = {
      model: cloudModel,
      systemInstruction: task.system,
      generationConfig: { responseMimeType: 'application/json', responseJsonSchema: task.schema },
    };
  }
  const m = getGenerativeModel(ai(), params);
  models.set(key, m);
  return m;
}

let localCalls = 0;

function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
  return JSON.parse(trimmed);
}

export async function runTask<T>(
  task: PromptTask<T>,
  input: string,
  opts: { route: Route; dataOrigin: DataOrigin; cloudModel: string; outgoingRefs?: string[] },
): Promise<TaskResult<T>> {
  const base = {
    task: task.id,
    promptVersion: task.version,
    mode: LEDGER_MODE[opts.route],
    model: opts.route === 'user-local' ? 'gemini-nano (Chrome)' : opts.cloudModel,
    dataOrigin: opts.dataOrigin,
    outgoingRefs: opts.route === 'user-local' ? [] : (opts.outgoingRefs ?? []),
  };

  if (opts.route === 'cloud' && opts.dataOrigin === 'user-import') {
    // Defence in depth; the payload builder already refuses this.
    throw new Error('Refusing to send imported data to the cloud.');
  }
  if (opts.route === 'user-local') {
    try {
      await assertLocalReady();
    } catch (e) {
      recordLedger({
        ...base,
        inferenceSource: 'blocked',
        latencyMs: 0,
        coldStart: false,
        inferenceRequests: 0,
        googleRequests: [],
        schemaValid: null,
        note: e instanceof LocalModelUnavailableError ? e.message : String(e),
      });
      throw e;
    }
  }

  const watch = watchRequests();
  const t0 = performance.now();
  try {
    const res = await modelFor(task as PromptTask<unknown>, opts.route, opts.cloudModel).generateContent(input);
    const latencyMs = Math.round(performance.now() - t0);
    const seen = watch.stop();
    const raw = res.response.text();
    const source = res.response.inferenceSource === 'on_device' ? 'on_device' : 'in_cloud';
    const coldStart = source === 'on_device' && localCalls === 0;
    if (source === 'on_device') localCalls++;

    let value: T;
    let schemaValid = true;
    let note: string | undefined;
    try {
      value = task.parse(parseJsonLoose(raw));
    } catch (e) {
      schemaValid = false;
      note = `Output rejected: ${e instanceof Error ? e.message : String(e)}`;
      const ledger = recordLedger({
        ...base,
        model: source === 'on_device' ? 'gemini-nano (Chrome)' : opts.cloudModel,
        inferenceSource: source,
        latencyMs,
        coldStart,
        inferenceRequests: inferenceRequests(seen).length,
        googleRequests: seen,
        schemaValid,
        note,
      });
      throw Object.assign(new Error(note), { ledger, raw });
    }
    const ledger = recordLedger({
      ...base,
      model: source === 'on_device' ? 'gemini-nano (Chrome)' : opts.cloudModel,
      inferenceSource: source,
      latencyMs,
      coldStart,
      inferenceRequests: inferenceRequests(seen).length,
      googleRequests: seen,
      schemaValid,
    });
    return { value, raw, inferenceSource: source, latencyMs, ledger };
  } catch (e) {
    const seen = watch.stop();
    if ((e as { ledger?: unknown }).ledger) throw e;
    recordLedger({
      ...base,
      inferenceSource: 'error',
      latencyMs: Math.round(performance.now() - t0),
      coldStart: false,
      inferenceRequests: inferenceRequests(seen).length,
      googleRequests: seen,
      schemaValid: null,
      note: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}

/**
 * Downloads / warms the on-device model. Chrome requires a user gesture, so call this from a click.
 * Resolves when the model is ready; reports progress 0..1.
 */
export async function prepareLocalModel(task: PromptTask<unknown>, onProgress: (p: number) => void): Promise<void> {
  if (!hasPromptApi()) throw new LocalModelUnavailableError('no-api');
  await modelFor(task, 'user-local', 'unused').initializeDeviceModel(onProgress);
}
