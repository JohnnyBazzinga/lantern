/**
 * On-device capability checks.
 *
 * Why this exists: in firebase@13.4.0, if `LanguageModel` is missing from the browser,
 * the SDK creates no Chrome adapter and an `ONLY_ON_DEVICE` request is sent to the cloud
 * (firebase-js-sdk issue #10635). For patient data that would be a silent leak, so Lantern
 * checks availability itself and refuses to run user-data prompts unless the local model
 * is confirmed `available`.
 */

/** The exact core options every on-device session is created with (text in, text out, English). */
export const LOCAL_CORE_OPTIONS: LanguageModelCoreOptions = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

export type LocalAvailability = 'no-api' | LanguageModelAvailability | 'error';

export function hasPromptApi(): boolean {
  return typeof self !== 'undefined' && 'LanguageModel' in self && Boolean(self.LanguageModel);
}

export async function checkLocalAvailability(): Promise<LocalAvailability> {
  if (!hasPromptApi()) return 'no-api';
  try {
    return await self.LanguageModel!.availability(LOCAL_CORE_OPTIONS);
  } catch {
    return 'error';
  }
}

export class LocalModelUnavailableError extends Error {
  constructor(public readonly availability: LocalAvailability) {
    super(
      availability === 'no-api'
        ? 'This browser has no on-device model. Patient data stays here: continue with manual mapping.'
        : `The on-device model is not ready (${availability}). Patient data stays here: prepare the model or continue manually.`,
    );
    this.name = 'LocalModelUnavailableError';
  }
}

/** Throws unless the on-device model is ready. Call before any prompt that contains user data. */
export async function assertLocalReady(): Promise<void> {
  const a = await checkLocalAvailability();
  if (a !== 'available') throw new LocalModelUnavailableError(a);
}

export interface EnvironmentReport {
  promptApi: boolean;
  availability: LocalAvailability;
  online: boolean;
  userAgent: string;
  chromeMajor: number | null;
  contextWindow: number | null;
}

/** Diagnostics for the Lab page. Creating a raw session only happens when the model is available. */
export async function environmentReport(): Promise<EnvironmentReport> {
  const availability = await checkLocalAvailability();
  const m = navigator.userAgent.match(/Chrome\/(\d+)/);
  let contextWindow: number | null = null;
  if (availability === 'available') {
    try {
      const s = await self.LanguageModel!.create(LOCAL_CORE_OPTIONS);
      contextWindow = s.contextWindow ?? null;
      s.destroy();
    } catch {
      contextWindow = null;
    }
  }
  return {
    promptApi: hasPromptApi(),
    availability,
    online: navigator.onLine,
    userAgent: navigator.userAgent,
    chromeMajor: m?.[1] ? Number(m[1]) : null,
    contextWindow,
  };
}
