import { useEffect, useState, type ButtonHTMLAttributes, type ElementType, type ReactNode } from 'react';
import { Check, CircleAlert, Cloud, Laptop, Scale, TriangleAlert } from 'lucide-react';
import { normText } from '../core/text';
import { msgs } from '../i18n/lang';
import { LangToggle, useT } from '../i18n/react';

const M = msgs(
  {
    device: 'On this device',
    cloud: 'Cloud',
    rule: 'Rule',
    blank: '(blank)',
    decided: (done: number, total: number) => `${done} of ${total} rows decided`,
    waiting: (n: number) => `${n} waiting for a nurse's answer`,
    steps: 'Steps',
    step: { columns: 'Columns', review: 'Review', worklist: 'Worklist' },
    stepDone: 'done',
  },
  {
    device: 'Neste computador',
    cloud: 'Nuvem',
    rule: 'Regra',
    blank: '(em branco)',
    decided: (done, total) => `${done} de ${total} linhas decididas`,
    waiting: (n) => `${n} à espera de resposta da enfermagem`,
    steps: 'Passos',
    step: { columns: 'Colunas', review: 'Revisão', worklist: 'Lista para registo' },
    stepDone: 'feito',
  },
);

/** The browser tab says which screen this is ("Review – Lantern"), so a second tab or the history is readable. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} – Lantern` : 'Lantern';
    return () => {
      document.title = 'Lantern';
    };
  }, [title]);
}

/**
 * The three states a thing waiting on the reviewer can be in, as one glyph used everywhere (the review
 * queue, the columns): open (an empty radio), done (forest, tick), needs an answer or a look (amber, "?").
 */
export function StateGlyph({ state, label }: { state: 'open' | 'waiting' | 'done'; label?: string }) {
  return (
    <span
      className={`grid h-[20px] w-[20px] shrink-0 place-items-center rounded-full text-[12px] font-bold leading-none transition-colors duration-150 ${
        state === 'done' ? 'bg-forest text-white' : state === 'waiting' ? 'border-[1.5px] border-amber bg-amber-wash text-amber-ink' : 'border-[1.5px] border-ink-faint/70'
      }`}
    >
      {state === 'done' ? <Check size={12} strokeWidth={3.5} aria-hidden /> : state === 'waiting' ? <span aria-hidden>?</span> : null}
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

/** A filled green tick: this is fine. */
export function Tick({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-grid shrink-0 place-items-center rounded-full bg-moss text-white ${className}`} style={{ width: size, height: size }} aria-hidden>
      <Check size={Math.round(size * 0.62)} strokeWidth={3.2} />
    </span>
  );
}

/** Amber triangle: worth a look. Red circle: this blocks. */
export function Caution({ size = 20, className = '' }: { size?: number; className?: string }) {
  return <TriangleAlert size={size} strokeWidth={2} className={`shrink-0 text-amber ${className}`} aria-hidden />;
}
export function Alarm({ size = 20, className = '' }: { size?: number; className?: string }) {
  return <CircleAlert size={size} strokeWidth={2} className={`shrink-0 text-alarm ${className}`} aria-hidden />;
}

export type Tone = 'primary' | 'secondary' | 'quiet' | 'ask' | 'alarm';

export function Button({
  tone = 'primary',
  size = 'md',
  className = '',
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: 'md' | 'lg' }) {
  const tones = {
    primary: 'bg-forest text-white shadow-[0_1px_2px_rgba(10,46,34,0.25)] hover:bg-forest-deep active:bg-forest-deep disabled:bg-ink-faint disabled:shadow-none',
    secondary: 'border border-rule-strong bg-sheet text-ink hover:border-forest active:bg-well disabled:border-rule disabled:text-ink-faint',
    quiet: 'text-ink-soft underline-offset-4 hover:text-ink hover:underline active:text-forest',
    ask: 'border border-amber-line bg-amber-wash text-amber-ink hover:border-amber active:bg-amber-wash',
    alarm: 'border border-alarm/50 bg-alarm-wash text-alarm hover:border-alarm',
  } as const;
  const sizes = { md: 'min-h-[44px] px-5 py-2 text-[16px]', lg: 'min-h-[54px] px-7 py-3 text-[17px]' } as const;
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 rounded-lg text-left font-semibold leading-tight transition-colors duration-100 disabled:cursor-not-allowed ${sizes[size]} ${tones[tone]} ${className}`}
    />
  );
}

/**
 * Where a judgment ran. Every model output in Lantern carries one of these three tags, always with
 * the same icon, word and colour: mint for this device, stone for the cloud and for a rule.
 */
export function Route({ source, model, children, muted = false }: { source: 'on_device' | 'in_cloud' | 'rule'; model?: string; children?: ReactNode; muted?: boolean }) {
  const t = useT(M);
  const look = {
    on_device: { Icon: Laptop, label: t.device, tone: 'bg-mint text-forest' },
    in_cloud: { Icon: Cloud, label: t.cloud, tone: 'bg-stone text-ink' },
    rule: { Icon: Scale, label: t.rule, tone: 'bg-stone text-ink' },
  }[source];
  return (
    <span
      title={model}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-[14px] font-semibold leading-5 ${muted ? 'bg-stone text-ink-soft' : look.tone}`}
    >
      <look.Icon size={16} strokeWidth={2} aria-hidden /> {children ?? look.label}
    </span>
  );
}

/** The name the other screens know the route tag by. */
export const RanOn = Route;

/** A long token made mostly of digits: a hospital number. Only these are compared character by character. */
const isNumberLike = (w: string) => w.length >= 6 && (w.match(/\d/g)?.length ?? 0) >= 4;

/**
 * Renders text with the words that do not occur in `other` marked by the highlighter. A hospital
 * number that differs from one of the same length is marked digit by digit, so two transposed digits
 * show as exactly those two.
 */
export function Diff({ text, other }: { text: string; other?: string }) {
  const t = useT(M);
  if (!text) return <span className="font-sans italic text-ink-faint">{t.blank}</span>;
  if (!other) return <>{text}</>;
  const theirs = new Set(normText(other).split(' '));
  const theirNumbers = other.split(/\s+/).filter(isNumberLike);
  const parts = text.split(/(\s+)/);
  const differs = parts.map((p) => {
    const n = normText(p);
    return !!n && !n.split(' ').every((w) => theirs.has(w));
  });
  const out: ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]!;
    if (!differs[i]) {
      out.push(<span key={i}>{p}</span>);
      continue;
    }
    const twin = isNumberLike(p) ? theirNumbers.find((o) => o.length === p.length) : undefined;
    if (twin) {
      out.push(
        <span key={i}>
          {[...p].map((ch, j) =>
            ch.toLowerCase() === twin[j]!.toLowerCase() ? (
              ch
            ) : (
              <mark key={j} className="diff">
                {ch}
              </mark>
            ),
          )}
        </span>,
      );
      continue;
    }
    // one stroke of the highlighter over a run of words that differ, spaces included
    let end = i;
    while (end + 2 < parts.length && differs[end + 2] && !isNumberLike(parts[end + 2]!)) end += 2;
    out.push(
      <mark key={i} className="diff">
        {parts.slice(i, end + 1).join('')}
      </mark>,
    );
    i = end;
  }
  return <>{out}</>;
}

/** The lantern, drawn in one line: ring, cap, glass with two bars, base. */
export function LanternMark({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round">
      <path d="M10 3.2a2 2 0 0 1 4 0" />
      <path d="M8.5 4.6h7l.9 2H7.6z" />
      <rect x="7.2" y="6.6" width="9.6" height="12.6" rx="2.4" />
      <path d="M10.4 9.4v7M13.6 9.4v7" />
      <path d="M8.3 19.2l-.5 1.6h8.4l-.5-1.6" />
    </svg>
  );
}

/** "Lantern", as on the mockups: the mark and the name in the serif. */
export function Wordmark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span className="flex items-center gap-2 text-ink">
      <LanternMark size={size === 'lg' ? 36 : 32} />
      <span className={`font-display font-medium tracking-[-0.015em] ${size === 'lg' ? 'text-[32px]' : 'text-[28px]'} leading-none`}>Lantern</span>
    </span>
  );
}

/**
 * How far the review is. Rows sent to a nurse are counted apart, in amber: they have a question
 * out, not a decision, so they never add to "decided".
 */
export function Meter({ done, total, waiting = 0 }: { done: number; total: number; waiting?: number }) {
  const t = useT(M);
  const pct = (n: number) => (total ? (100 * n) / total : 0);
  return (
    <div role="group" aria-label={waiting ? `${t.decided(done, total)}, ${t.waiting(waiting)}` : t.decided(done, total)}>
      <p className="font-display text-[20px] font-semibold leading-snug tabular-nums text-ink">{t.decided(done, total)}</p>
      {waiting > 0 && <p className="text-[14px] text-amber-ink">{t.waiting(waiting)}</p>}
      <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-[#dde2d6]" aria-hidden>
        <div className="h-full bg-forest transition-[width] duration-300" style={{ width: `${pct(done)}%` }} />
        <div className="h-full bg-amber transition-[width] duration-300" style={{ width: `${pct(waiting)}%` }} />
      </div>
    </div>
  );
}

/** A band of text in a tinted card: information (sage), an answer needed (amber), an error (red), all well (mint). */
export function Notice({ tone = 'info', children, className = '' }: { tone?: 'info' | 'ask' | 'alarm' | 'ok'; children: ReactNode; className?: string }) {
  const t = {
    info: 'border-[#dfe5d8] bg-sage',
    ask: 'border-amber-line bg-amber-wash',
    alarm: 'border-alarm/30 bg-alarm-wash',
    ok: 'border-mint-line bg-mint',
  }[tone];
  return <div className={`rounded-xl border px-4 py-3 text-[16px] ${t} ${className}`}>{children}</div>;
}

/** The soft card everything sits on. */
export function Card({ as: As = 'div', className = '', children, ...p }: { as?: ElementType; className?: string; children: ReactNode } & Record<string, unknown>) {
  return (
    <As {...p} className={`rounded-2xl border border-rule bg-card shadow-[0_1px_2px_rgba(30,40,30,0.04),0_8px_24px_-12px_rgba(30,40,30,0.08)] ${className}`}>
      {children}
    </As>
  );
}

/** Small spaced capitals in a mint pill: what kind of thing this is ("CHECK THE PATIENT", "STEP 1 OF 3"). */
export function Eyebrow({ children, icon, className = '' }: { children: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <span className={`caps inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-mint px-3 py-[7px] text-[#16301f] ${className}`}>
      {icon}
      {children}
    </span>
  );
}

/** Small spaced capitals after a short rule, in grey: the line above a big title. */
export function Kicker({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`caps flex items-center gap-3 text-ink-soft ${className}`}>
      <span className="h-px w-8 bg-ink-soft/60" aria-hidden />
      {children}
    </span>
  );
}

/** The soft green marker under the last words of a big title. */
export function Marked({ children }: { children: ReactNode }) {
  return <span className="marker-leaf">{children}</span>;
}

export type StepKey = 'columns' | 'review' | 'worklist';
const STEPS: StepKey[] = ['columns', 'review', 'worklist'];

/** The path through a review. It is a real sequence, so it is numbered; a step that can be opened is a button. */
export function Steps({ current, onGo = {} }: { current: StepKey | 'after'; onGo?: Partial<Record<StepKey, () => void>> }) {
  const t = useT(M);
  // 'after': every step is done (the drill's result page)
  const at = current === 'after' ? STEPS.length : STEPS.indexOf(current);
  return (
    <nav aria-label={t.steps} className="no-print">
      <ol className="flex items-center gap-x-1 text-[15px] sm:gap-x-2">
        {STEPS.map((k, i) => {
          const done = i < at;
          const here = i === at;
          const go = onGo[k];
          const inner = (
            <>
              <span
                className={`grid h-[24px] w-[24px] shrink-0 place-items-center rounded-full text-[13px] font-semibold tabular-nums ${
                  here ? 'bg-forest text-white' : done ? 'border-[1.5px] border-[#b9c9b8] text-moss' : 'border-[1.5px] border-ink-faint/60 text-ink-soft'
                }`}
              >
                {done ? <Check size={14} strokeWidth={3} aria-label={t.stepDone} /> : i + 1}
              </span>
              {/* on a phone only the current step keeps its word; the others keep their number and their name for screen readers */}
              <span className={here ? '' : 'sr-only sm:not-sr-only'}>{t.step[k]}</span>
            </>
          );
          const look = `flex min-h-[32px] items-center gap-2 whitespace-nowrap rounded-md px-1 py-1 ${here ? 'font-semibold text-ink' : 'text-ink-soft'}`;
          return (
            <li key={k} className="flex items-center gap-1 sm:gap-2">
              {i > 0 && <span className="hidden h-px w-5 bg-ink-faint/50 sm:block min-[1600px]:w-7" aria-hidden />}
              {go && !here ? (
                <button type="button" onClick={go} className={`${look} underline-offset-4 hover:text-ink hover:underline`}>
                  {inner}
                </button>
              ) : (
                <span className={look} aria-current={here ? 'step' : undefined}>
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * The bar every screen after Start shares: the name, the drill, where you are (the steps), and what has
 * left this PC (the tally). On a wide screen it stays in view; on a phone it scrolls away with the page.
 */
export function AppBar({ title, steps, actions, onWave = false, children }: { title?: string; steps?: ReactNode; actions?: ReactNode; onWave?: boolean; children?: ReactNode }) {
  // At the top of the page the bar is see-through, so the wave behind it shows, as on the mockups; once
  // the page scrolls under it, it turns solid. Phone: two rows (mark, steps, language; then the tally). Wide: one sticky row.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`no-print relative z-30 transition-[background-color,box-shadow] duration-150 lg:sticky lg:top-0 ${scrolled ? 'bg-paper shadow-[0_1px_0_var(--color-rule)]' : 'bg-transparent'}`}>
      <div className="mx-auto flex max-w-[1720px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 sm:gap-x-5 sm:px-6 lg:h-[64px] lg:flex-nowrap lg:gap-x-4 lg:py-0 xl:px-8 min-[1800px]:gap-x-6">
        <div className="flex items-center gap-4">
          <span className="min-[440px]:hidden" aria-label="Lantern" role="img">
            <LanternMark size={28} className="text-ink" />
          </span>
          <span className="hidden min-[440px]:block">
            <Wordmark />
          </span>
          {title && (
            <>
              <span className="hidden h-7 w-px bg-ink-faint/40 sm:block lg:hidden min-[1600px]:block" aria-hidden />
              <span className="hidden whitespace-nowrap text-[15px] text-ink sm:inline lg:hidden min-[1600px]:inline">{title}</span>
            </>
          )}
        </div>
        <div className="shrink-0 lg:ml-2 min-[1600px]:ml-4">{steps}</div>
        <div className="order-last flex w-full items-center gap-x-2 lg:order-none lg:ml-auto lg:w-auto">{children}</div>
        {/* over the page's dark wave (until the page scrolls under the bar) the actions are written in white, as on the mockup */}
        {actions && <div className={`ml-auto flex items-center lg:ml-0 ${onWave && !scrolled ? '[&_button]:!text-white' : ''}`}>{actions}</div>}
        <LangToggle className={actions ? '' : 'ml-auto lg:ml-0'} />
      </div>
    </header>
  );
}
