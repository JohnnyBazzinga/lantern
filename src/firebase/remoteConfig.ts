import {
  ensureInitialized,
  fetchAndActivate,
  getRemoteConfig,
  getValue,
  type RemoteConfig,
} from 'firebase/remote-config';
import { getFirebaseApp } from './app';

/**
 * Remote Config lets hospital IT change the cloud model, the prompt set and whether the
 * cloud second opinion is allowed, without shipping a new build. Values are fetched once,
 * cached in IndexedDB by the SDK, and frozen for the whole review session so every
 * result can cite the exact configuration that produced it.
 */
export const RC_DEFAULTS = {
  cloud_model: 'gemini-3.5-flash-lite',
  cloud_fallback_model: 'gemini-3.6-flash',
  prompt_set_version: 'v1',
  cloud_second_opinion_enabled: true,
  local_batch_rows: 5,
  persist_imported_reviews: true,
  allow_export: true,
} as const;

export interface LanternConfig {
  cloudModel: string;
  /** tried once when the cloud model is overloaded or out of quota */
  cloudFallbackModel: string;
  promptSetVersion: string;
  cloudSecondOpinionEnabled: boolean;
  localBatchRows: number;
  /** hospital IT: keep imported reviews in the browser (up to 12 h) so work survives a closed tab; off = memory only */
  persistImportedReviews: boolean;
  /** hospital IT: allow CSV download and printing of the worklist */
  allowExport: boolean;
  /** where the values came from: fresh fetch, last activated (cached) config, or in-code defaults */
  source: 'remote' | 'cached' | 'defaults';
  detail: string;
}

const fromDefaults = (detail: string): LanternConfig => ({
  cloudModel: RC_DEFAULTS.cloud_model,
  cloudFallbackModel: RC_DEFAULTS.cloud_fallback_model,
  promptSetVersion: RC_DEFAULTS.prompt_set_version,
  cloudSecondOpinionEnabled: RC_DEFAULTS.cloud_second_opinion_enabled,
  localBatchRows: RC_DEFAULTS.local_batch_rows,
  persistImportedReviews: RC_DEFAULTS.persist_imported_reviews,
  allowExport: RC_DEFAULTS.allow_export,
  source: 'defaults',
  detail,
});

let frozen: Promise<LanternConfig> | null = null;

/** The whole fetch step, Installations included; past this the last activated configuration applies. */
const FETCH_DEADLINE_MS = 5000;

export function loadConfig(): Promise<LanternConfig> {
  if (!frozen) frozen = load();
  return frozen;
}

async function load(): Promise<LanternConfig> {
  const app = getFirebaseApp();
  if (!app) return fromDefaults('Firebase not configured in this build');

  let rc: RemoteConfig;
  try {
    rc = getRemoteConfig(app);
    // short, so a model switch made in the console reaches open browsers within minutes
    rc.settings.minimumFetchIntervalMillis = 10 * 60 * 1000;
    rc.settings.fetchTimeoutMillis = 4000;
    rc.defaultConfig = { ...RC_DEFAULTS };
    await ensureInitialized(rc); // loads the last activated config from IndexedDB
  } catch (e) {
    return fromDefaults(`Remote Config unavailable: ${String(e)}`);
  }

  let source: LanternConfig['source'] = 'cached';
  let detail = 'Using the last activated configuration';
  if (navigator.onLine) {
    try {
      // fetchTimeoutMillis covers the fetch itself, not the Firebase Installations call before it,
      // which can wait forever on a network that drops Google's requests: bound the whole step.
      const changed = await Promise.race([
        fetchAndActivate(rc),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Remote Config fetch timed out')), FETCH_DEADLINE_MS)),
      ]);
      source = 'remote';
      detail = changed ? 'Fetched and activated a new configuration' : 'Configuration is up to date';
    } catch {
      detail = 'Fetch failed (offline or throttled); using the last activated configuration';
    }
  } else {
    detail = 'Offline; using the last activated configuration';
  }

  const anyRemote = ['cloud_model', 'prompt_set_version'].some((k) => getValue(rc, k).getSource() === 'remote');
  if (!anyRemote) {
    source = 'defaults';
    detail += ' (no remote values yet, in-code defaults apply)';
  }

  return {
    cloudModel: getValue(rc, 'cloud_model').asString() || RC_DEFAULTS.cloud_model,
    cloudFallbackModel: getValue(rc, 'cloud_fallback_model').asString() || RC_DEFAULTS.cloud_fallback_model,
    promptSetVersion: getValue(rc, 'prompt_set_version').asString() || RC_DEFAULTS.prompt_set_version,
    cloudSecondOpinionEnabled: getValue(rc, 'cloud_second_opinion_enabled').asBoolean(),
    localBatchRows: getValue(rc, 'local_batch_rows').asNumber() || RC_DEFAULTS.local_batch_rows,
    persistImportedReviews: getValue(rc, 'persist_imported_reviews').asBoolean(),
    allowExport: getValue(rc, 'allow_export').asBoolean(),
    source,
    detail,
  };
}
