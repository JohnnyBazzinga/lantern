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
  cloud_model: 'gemini-3.8-flash',
  prompt_set_version: 'v1',
  cloud_second_opinion_enabled: true,
  local_batch_rows: 5,
} as const;

export interface LanternConfig {
  cloudModel: string;
  promptSetVersion: string;
  cloudSecondOpinionEnabled: boolean;
  localBatchRows: number;
  /** where the values came from: fresh fetch, last activated (cached) config, or in-code defaults */
  source: 'remote' | 'cached' | 'defaults';
  detail: string;
}

const fromDefaults = (detail: string): LanternConfig => ({
  cloudModel: RC_DEFAULTS.cloud_model,
  promptSetVersion: RC_DEFAULTS.prompt_set_version,
  cloudSecondOpinionEnabled: RC_DEFAULTS.cloud_second_opinion_enabled,
  localBatchRows: RC_DEFAULTS.local_batch_rows,
  source: 'defaults',
  detail,
});

let frozen: Promise<LanternConfig> | null = null;

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
    rc.settings.minimumFetchIntervalMillis = 60 * 60 * 1000;
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
      const changed = await fetchAndActivate(rc);
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
    promptSetVersion: getValue(rc, 'prompt_set_version').asString() || RC_DEFAULTS.prompt_set_version,
    cloudSecondOpinionEnabled: getValue(rc, 'cloud_second_opinion_enabled').asBoolean(),
    localBatchRows: getValue(rc, 'local_batch_rows').asNumber() || RC_DEFAULTS.local_batch_rows,
    source,
    detail,
  };
}
