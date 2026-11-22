import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  type AI,
  type GenerativeModel,
  type HybridParams,
} from 'firebase/ai';
import { getLimitedUseToken } from 'firebase/app-check';
import { getAppCheckInstance, getFirebaseApp } from '../firebase/app';
import { assertLocalReady, hasPromptApi, LOCAL_CORE_OPTIONS, LocalModelUnavailableError } from './capability';
import { recordLedger, type LedgerEntry, type LedgerMode } from './ledger';
import { inferenceRequests, watchRequests } from './netwatch';
import { loadConfig } from '../firebase/remoteConfig';

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

/**
 * The SDK keeps our onDeviceParams object and hands promptOptions to Chrome's session.prompt() on
 * every call, so setting `signal` here just before a call gives that call its own deadline.
 */
type DevicePromptOptions = { responseConstraint: object; signal?: AbortSignal };
const devicePromptOptions = new WeakMap<GenerativeModel, DevicePromptOptions>();

function modelFor(task: PromptTask<unknown>, route: Route, cloudModel: string): GenerativeModel {
  const key = `${task.id}@${task.version}|${route}|${cloudModel}`;
  const cached = models.get(key);
  if (cached) return cached;

  const params: HybridParams = { mode: MODE[route] };
  const devicePrompt: DevicePromptOptions = { responseConstraint: task.schema };
  if (route !== 'cloud') {
    // On-device sessions ignore inCloudParams: the system prompt must travel in initialPrompts.
    params.onDeviceParams = {
      createOptions: {
        ...LOCAL_CORE_OPTIONS,
        initialPrompts: [{ role: 'system', content: [{ type: 'text', value: task.system }] }],
      },
      promptOptions: devicePrompt,
    };
  }
  if (route !== 'user-local') {
    params.inCloudParams = {
      model: cloudModel,
      systemInstruction: task.system,
      generationConfig: { responseMimeType: 'application/json', responseJsonSchema: task.schema },
    };
  }
  // the SDK default is 180 s; an overloaded model should fail fast and fall back instead
  const m = getGenerativeModel(ai(), params, { timeout: CLOUD_TIMEOUT_MS });
  if (route !== 'cloud') devicePromptOptions.set(m, devicePrompt);
  models.set(key, m);
  return m;
}

let localCalls = 0;

const CLOUD_TIMEOUT_MS = 45_000;
/**
 * A network that silently drops Google's requests (some hospital firewalls do) can leave a cloud call
 * waiting forever: App Check's reCAPTCHA step runs before the SDK's request timeout applies. So every
 * attempt that may reach the cloud gets a hard deadline, and once the cloud is found unreachable,
 * Lantern stops trying it for a while: the drill finishes on its rules instead of hanging.
 */
const CLOUD_HARD_DEADLINE_MS = CLOUD_TIMEOUT_MS + 5_000;
const CLOUD_PAUSE_MS = 2 * 60_000;
const UNREACHABLE = /failed to fetch|networkerror|network error|fetch-error|load failed|appCheck\/|recaptcha/i;
let cloudDownUntil = 0;

/** The cloud cannot be reached from this network right now; not worth retrying for a while. */
export class CloudUnreachableError extends Error {}

/**
 * Before the first cloud call of a page: can this network get an App Check token at all? Bounded, so a
 * blocked reCAPTCHA is found in seconds rather than at the end of the 50 s call deadline.
 */
const APP_CHECK_DEADLINE_MS = 10_000;
let appCheckReached = false;
async function cloudPreflight(): Promise<void> {
  if (appCheckReached) return;
  const ac = getAppCheckInstance();
  if (!ac) return; // no App Check in this build: the call itself will say what is wrong
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const { token } = await Promise.race([
      getLimitedUseToken(ac),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new CloudUnreachableError(`App Check gave no token within ${APP_CHECK_DEADLINE_MS / 1000} s: this network may be blocking Google's servers.`)), APP_CHECK_DEADLINE_MS);
      }),
    ]);
    if (!token) throw new CloudUnreachableError('App Check gave an empty token.');
    appCheckReached = true;
  } finally {
    clearTimeout(timer);
  }
}

const localReady = () => assertLocalReady().then(
  () => true,
  () => false,
);
/**
 * Gemini Nano normally answers a Lantern prompt in 2–10 s. Constrained decoding can occasionally loop
 * inside a free-text field until the context window is full (observed: ~6 min, then truncated JSON),
 * so an on-device call that runs past this is stopped and retried once on a fresh session.
 */
const ON_DEVICE_TIMEOUT_MS = 45_000;
const DEVICE_STALL = 'On-device call stalled';
const RETRYABLE_STATUS = [429, 500, 502, 503, 504];
const RETRYABLE_TEXT = /\[(?:429|500|502|503|504)\b|high demand|overloaded|exceeded your current quota|deadline|timeout has expired/i;

/** Overload, quota and timeout errors are worth one more try; a rejected answer or a refusal is not. */
function retryable(e: unknown): boolean {
  if ((e as { ledger?: unknown }).ledger) return false; // the model answered; its output was rejected
  if (e instanceof LocalModelUnavailableError) return false;
  const status = (e as { customErrorData?: { status?: number } }).customErrorData?.status;
  if (status && RETRYABLE_STATUS.includes(status)) return true;
  return RETRYABLE_TEXT.test(e instanceof Error ? e.message : String(e));
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
  return JSON.parse(trimmed);
}

type TaskOpts = { route: Route; dataOrigin: DataOrigin; cloudModel: string; outgoingRefs?: string[] };

export async function runTask<T>(task: PromptTask<T>, input: string, opts: TaskOpts): Promise<TaskResult<T>> {
  // user-local: Gemini Nano only, one more try on a fresh session if the first call stalls or is cut off.
  // Other routes: one retry on the same model, then the Remote Config fallback model.
  // Every failed attempt stays in the ledger, so the retries are visible.
  const fallback = opts.route === 'user-local' ? null : (await loadConfig()).cloudFallbackModel;
  const plan =
    opts.route === 'user-local'
      ? [opts.cloudModel, opts.cloudModel]
      : [opts.cloudModel, opts.cloudModel, ...(fallback && fallback !== opts.cloudModel ? [fallback] : [])];
  let last: unknown;
  let failed = 0;
  for (let i = 0; i < plan.length; ) {
    const model = plan[i]!;
    if (failed) await pause(1500 * failed);
    try {
      return await attempt(task, input, opts, model, failed ? `after ${failed} failed attempt${failed > 1 ? 's' : ''}` : undefined);
    } catch (e) {
      last = e;
      if (e instanceof CloudUnreachableError) throw e;
      failed++;
      // a stalled call or a cut-off answer is sampling bad luck: worth one fresh try
      const unlucky = deviceStalled(e) || (failed === 1 && Boolean((e as { ledger?: unknown }).ledger));
      if (opts.route === 'user-local' ? !unlucky : !(unlucky || retryable(e))) throw e;
      i++;
      // a cloud model that timed out is overloaded: waiting on it again only doubles the delay
      if (cloudTimedOut(e)) while (i < plan.length && plan[i] === model) i++;
    }
  }
  throw last;
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
function deviceStalled(e: unknown): boolean {
  return errorText(e).includes(DEVICE_STALL);
}
function cloudTimedOut(e: unknown): boolean {
  return !deviceStalled(e) && /timeout has expired|timed? ?out|deadline/i.test(errorText(e));
}

async function attempt<T>(task: PromptTask<T>, input: string, opts: TaskOpts, cloudModel: string, retryNote?: string): Promise<TaskResult<T>> {
  const base = {
    task: task.id,
    promptVersion: task.version,
    mode: LEDGER_MODE[opts.route],
    model: opts.route === 'user-local' ? 'gemini-nano (Chrome)' : cloudModel,
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

  if (opts.route !== 'user-local' && Date.now() < cloudDownUntil && (opts.route === 'cloud' || !(await localReady()))) {
    const note = 'Skipped: the cloud could not be reached from this network a moment ago.';
    recordLedger({ ...base, inferenceSource: 'error', latencyMs: 0, coldStart: false, inferenceRequests: 0, googleRequests: [], schemaValid: null, note });
    throw new CloudUnreachableError(note);
  }

  if (opts.route === 'cloud' || (opts.route === 'drill-hybrid' && !(await localReady()))) {
    try {
      await cloudPreflight();
    } catch (e) {
      cloudDownUntil = Date.now() + CLOUD_PAUSE_MS;
      const note = `Cloud unreachable: ${errorText(e)}`;
      recordLedger({ ...base, inferenceSource: 'error', latencyMs: 0, coldStart: false, inferenceRequests: 0, googleRequests: [], schemaValid: null, note });
      throw e instanceof CloudUnreachableError ? e : new CloudUnreachableError(note);
    }
  }

  const watch = watchRequests();
  const t0 = performance.now();
  const model = modelFor(task as PromptTask<unknown>, opts.route, cloudModel);
  const device = devicePromptOptions.get(model);
  const deadline = new AbortController();
  const timer = setTimeout(
    () => deadline.abort(new DOMException(`${DEVICE_STALL} after ${ON_DEVICE_TIMEOUT_MS / 1000} s and was stopped`, 'TimeoutError')),
    ON_DEVICE_TIMEOUT_MS,
  );
  if (device) device.signal = deadline.signal;
  let hard: ReturnType<typeof setTimeout> | undefined;
  try {
    const call = model.generateContent(input).catch((e: unknown) => {
      // Chrome rejects with the abort reason; keep the stall recognisable whatever it is wrapped in,
      // but never relabel the SDK's own cloud timeout (a drill call that went to the cloud)
      throw deadline.signal.aborted && !/timeout has expired/i.test(errorText(e)) ? (deadline.signal.reason as Error) : e;
    });
    const res =
      opts.route === 'user-local'
        ? await call
        : await Promise.race([
            call,
            new Promise<never>((_, reject) => {
              call.catch(() => {}); // the losing call may still reject later; it is already accounted for
              hard = setTimeout(
                () => reject(new CloudUnreachableError(`No answer within ${CLOUD_HARD_DEADLINE_MS / 1000} s: this network may be blocking Google's servers.`)),
                CLOUD_HARD_DEADLINE_MS,
              );
            }),
          ]);
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
        model: source === 'on_device' ? 'gemini-nano (Chrome)' : cloudModel,
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
      model: source === 'on_device' ? 'gemini-nano (Chrome)' : cloudModel,
      inferenceSource: source,
      latencyMs,
      coldStart,
      inferenceRequests: inferenceRequests(seen).length,
      googleRequests: seen,
      schemaValid,
      note: retryNote,
    });
    return { value, raw, inferenceSource: source, latencyMs, ledger };
  } catch (e) {
    const seen = watch.stop();
    if ((e as { ledger?: unknown }).ledger) throw e;
    if (opts.route !== 'user-local' && !deviceStalled(e) && (e instanceof CloudUnreachableError || UNREACHABLE.test(errorText(e)))) {
      cloudDownUntil = Date.now() + CLOUD_PAUSE_MS;
      if (!(e instanceof CloudUnreachableError)) e = new CloudUnreachableError(errorText(e));
    }
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
  } finally {
    clearTimeout(timer);
    clearTimeout(hard);
    if (device) device.signal = undefined;
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
