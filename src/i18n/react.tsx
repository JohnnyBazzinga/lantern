import { useSyncExternalStore } from 'react';
import { getLang, setLang, subscribeLang, type Lang } from './lang';

export function useLang(): Lang {
  return useSyncExternalStore(subscribeLang, getLang, () => 'en');
}

/** The message set for the current language; re-renders when the language changes. */
export function useT<E>(m: Record<Lang, E>): E {
  return m[useLang()];
}

const OPTIONS: { lang: Lang; short: string; name: string }[] = [
  { lang: 'en', short: 'EN', name: 'English' },
  { lang: 'pt', short: 'PT', name: 'Português' },
];

/** Two-way language switch. Each option is labelled in its own language, so anyone can find theirs. */
export function LangToggle({ className = '' }: { className?: string }) {
  const lang = useLang();
  return (
    <div role="group" aria-label={lang === 'pt' ? 'Idioma' : 'Language'} className={`no-print inline-flex rounded-lg border border-ink/80 bg-sheet p-[3px] ${className}`}>
      {OPTIONS.map((o) => (
        <button
          key={o.lang}
          type="button"
          lang={o.lang === 'pt' ? 'pt-PT' : 'en'}
          aria-pressed={lang === o.lang}
          title={o.name}
          onClick={() => setLang(o.lang)}
          className={`rounded-md px-2.5 py-1 text-[13px] font-semibold tabular-nums transition-colors ${
            lang === o.lang ? 'bg-forest text-white' : 'text-ink hover:bg-well'
          }`}
        >
          <span aria-hidden>{o.short}</span>
          <span className="sr-only">{o.name}</span>
        </button>
      ))}
    </div>
  );
}
