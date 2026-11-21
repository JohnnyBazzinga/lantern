/**
 * Network watcher: records every request the page makes to Google endpoints while an
 * inference task runs, so the ledger can state "0 requests left the device" as a measured
 * fact rather than a claim. Uses two independent signals: a fetch wrapper and the
 * Resource Timing API (which also sees script/XHR/beacon traffic).
 */

const WATCHED = /(googleapis\.com|google\.com\/recaptcha|gstatic\.com\/recaptcha|firebaseappcheck|firebaseinstallations|firebaseremoteconfig)/i;

export interface ObservedRequest {
  url: string;
  host: string;
  via: 'fetch' | 'resource-timing';
  at: number;
}

type Listener = (r: ObservedRequest) => void;
const listeners = new Set<Listener>();
let installed = false;

function emit(url: string, via: ObservedRequest['via']) {
  if (!WATCHED.test(url)) return;
  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    /* keep raw */
  }
  const r: ObservedRequest = { url: url.split('?')[0] ?? url, host, via, at: performance.now() };
  listeners.forEach((l) => l(r));
}

/** Install once, as early as possible (before Firebase modules make requests). */
export function installNetwatch(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    emit(url, 'fetch');
    return original(input, init);
  };
  if ('PerformanceObserver' in window) {
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          const rt = e as PerformanceResourceTiming;
          if (rt.initiatorType !== 'fetch') emit(e.name, 'resource-timing');
        }
      }).observe({ type: 'resource', buffered: false });
    } catch {
      /* not supported */
    }
  }
}

/** Collect watched requests until stop() is called. */
export function watchRequests(): { stop: () => ObservedRequest[] } {
  const seen: ObservedRequest[] = [];
  const l: Listener = (r) => seen.push(r);
  listeners.add(l);
  return {
    stop: () => {
      listeners.delete(l);
      return seen;
    },
  };
}

/** Requests that carry prompt content to a Gemini endpoint (as opposed to App Check / config traffic). */
export function inferenceRequests(rs: ObservedRequest[]): ObservedRequest[] {
  return rs.filter((r) => /firebasevertexai\.googleapis\.com|generativelanguage\.googleapis\.com|aiplatform\.googleapis\.com/.test(r.host));
}
