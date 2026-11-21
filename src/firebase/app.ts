import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY as string | undefined;
const appCheckDebug = import.meta.env.VITE_APPCHECK_DEBUG === 'true';

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);
export const appCheckConfigured = Boolean(recaptchaSiteKey);
export const projectId = config.projectId ?? null;

let app: FirebaseApp | null = null;
let appCheck: AppCheck | null = null;

/**
 * Lazily initialises Firebase. Returns null when the build has no Firebase config, so the
 * deterministic, on-device parts of Lantern keep working in a bare checkout.
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfigured) return null;
  if (!app) {
    app = initializeApp(config);
    if (recaptchaSiteKey) {
      if (appCheckDebug) {
        // Prints a debug token in the console; register it in the Firebase console.
        (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      // App Check tokens are only requested when a call actually goes to the cloud,
      // so on-device inference keeps working with no network.
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
  }
  return app;
}

export function getAppCheckInstance(): AppCheck | null {
  getFirebaseApp();
  return appCheck;
}

export const appCheckDebugMode = appCheckDebug;
