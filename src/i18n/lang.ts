/**
 * Interface language. English (the hackathon's language) and European Portuguese (the people Lantern
 * was designed with). Plain module state, no library: core modules read `getLang()` when they build a
 * question or a late-entry note, and React screens subscribe through `useLang()`.
 *
 * Order of precedence: `?lang=pt|en` in the address, then the choice saved in this browser, then the
 * browser's own language. The saved choice is a per-viewer convenience only (it may be unavailable in a
 * private window, in which case the default applies).
 */

export type Lang = 'en' | 'pt';

const KEY = 'lantern.lang';
const isLang = (v: unknown): v is Lang => v === 'en' || v === 'pt';

function initial(): Lang {
  if (typeof window === 'undefined') return 'en';
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (isLang(q)) return q;
  } catch {
    /* no URL access */
  }
  try {
    const saved = window.localStorage.getItem(KEY);
    if (isLang(saved)) return saved;
  } catch {
    /* storage blocked */
  }
  try {
    if (navigator.language?.toLowerCase().startsWith('pt')) return 'pt';
  } catch {
    /* no navigator */
  }
  return 'en';
}

let current: Lang = initial();
const listeners = new Set<() => void>();

function applyToDocument() {
  if (typeof document !== 'undefined') document.documentElement.lang = current === 'pt' ? 'pt-PT' : 'en';
}
applyToDocument();

export const getLang = (): Lang => current;

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try {
    window.localStorage.setItem(KEY, lang);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
  applyToDocument();
  listeners.forEach((f) => f());
}

export function subscribeLang(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

/** BCP 47 locale for dates and times. */
export const locale = (lang: Lang = current) => (lang === 'pt' ? 'pt-PT' : 'en-GB');

/**
 * A pair of message sets. English is the source; the Portuguese set must have exactly the same shape,
 * so a missing translation is a type error, not a blank on screen.
 */
export function msgs<E>(en: E, pt: NoInfer<E>): Record<Lang, E> {
  return { en, pt };
}

/** For non-React code: the message set for the current language, read at call time. */
export const tr = <E>(m: Record<Lang, E>): E => m[current];
