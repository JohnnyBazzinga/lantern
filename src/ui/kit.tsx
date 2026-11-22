import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Check, Cloud, Cpu, Scale } from 'lucide-react';
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
    steps: 'Passos',
    step: { columns: 'Colunas', review: 'Revisão', worklist: 'Lista para registo' },
    stepDone: 'feito',
  },
);

export function Button({
  tone = 'primary',
  size = 'md',
  className = '',
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'secondary' | 'quiet' | 'pen'; size?: 'md' | 'lg' }) {
  const tones = {
    primary: 'bg-night text-white hover:bg-night-soft disabled:bg-ink-faint',
    secondary: 'border border-rule-strong bg-sheet text-ink hover:border-night',
    quiet: 'text-ink-soft underline-offset-4 hover:text-ink hover:underline',
    pen: 'border border-pen text-pen bg-sheet hover:bg-pen-wash',
  } as const;
  const sizes = { md: 'min-h-[42px] px-4 py-2 text-[16px]', lg: 'min-h-[56px] px-7 py-3.5 text-[19px]' } as const;
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 rounded-md text-left font-semibold leading-tight transition-colors duration-100 disabled:cursor-not-allowed ${sizes[size]} ${tones[tone]} ${className}`}
    />
  );
}

/**
 * Where a judgment ran. Every model output in Lantern carries one of these three tags, always with
 * the same icon, word and colour: teal for this device, blue for the cloud, ink on gutter grey for a rule.
 */
export function Route({ source, model, children, muted = false }: { source: 'on_device' | 'in_cloud' | 'rule'; model?: string; children?: ReactNode; muted?: boolean }) {
  const t = useT(M);
  const look = {
    on_device: { Icon: Cpu, label: t.device, tone: 'bg-scrub-wash text-scrub' },
    in_cloud: { Icon: Cloud, label: t.cloud, tone: 'bg-ballpoint-wash text-ballpoint' },
    rule: { Icon: Scale, label: t.rule, tone: 'bg-gutter text-ink' },
  }[source];
  return (
    <span
      title={model}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[4px] px-2 py-0.5 text-[14px] font-semibold leading-6 ${muted ? 'bg-gutter text-ink-soft' : look.tone}`}
    >
      <look.Icon size={15} strokeWidth={2.2} aria-hidden /> {children ?? look.label}
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
  if (!text) return <span className="font-sans text-ink-faint">{t.blank}</span>;
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

export function LanternMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path d="M9 3h6v2H9z" fill="currentColor" />
      <path d="M8 6h8l1 2.5V17l-1.5 2h-7L7 17V8.5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12.5" r="2.5" fill="var(--color-lamp)" />
    </svg>
  );
}

export function Meter({ done, total }: { done: number; total: number }) {
  const t = useT(M);
  const pct = total ? Math.round((100 * done) / total) : 0;
  return (
    <div aria-label={t.decided(done, total)}>
      <span className="text-[15px] tabular-nums text-ink-soft">{t.decided(done, total)}</span>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-rule">
        <div className="h-full bg-night transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'pen' | 'scrub'; children: ReactNode }) {
  const t = { info: 'border-rule bg-sheet', pen: 'border-pen/40 bg-pen-wash', scrub: 'border-scrub/30 bg-scrub-wash' }[tone];
  return <div className={`rounded-md border px-4 py-3 text-[16px] ${t}`}>{children}</div>;
}

export type StepKey = 'columns' | 'review' | 'worklist';
const STEPS: StepKey[] = ['columns', 'review', 'worklist'];

/** The path through a review. It is a real sequence, so it is numbered; a step that can be opened is a button. */
export function Steps({ current, onGo = {} }: { current: StepKey; onGo?: Partial<Record<StepKey, () => void>> }) {
  const t = useT(M);
  const at = STEPS.indexOf(current);
  return (
    <nav aria-label={t.steps} className="no-print">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[15px] sm:gap-x-1.5 lg:flex-nowrap">
        {STEPS.map((k, i) => {
          const done = i < at;
          const here = i === at;
          const go = onGo[k];
          const inner = (
            <>
              <span
                className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[13px] font-semibold tabular-nums ${
                  here ? 'bg-night text-white' : done ? 'bg-gutter text-ink' : 'border border-rule-strong text-ink-soft'
                }`}
              >
                {done ? <Check size={13} strokeWidth={3} aria-label={t.stepDone} /> : i + 1}
              </span>
              {t.step[k]}
            </>
          );
          const look = `flex items-center gap-1.5 whitespace-nowrap rounded-md px-1 py-1 sm:px-1.5 ${here ? 'font-semibold text-night' : 'text-ink-soft'}`;
          return (
            <li key={k} className="flex items-center gap-1 sm:gap-1.5">
              {i > 0 && <span className="hidden h-px w-5 bg-rule-strong sm:block" aria-hidden />}
              {go && !here ? (
                <button type="button" onClick={go} className={`${look} underline-offset-4 hover:text-night hover:underline`}>
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
 * The bar every screen after Start shares: where you are (the steps), and what has left this PC (the tally).
 * On a wide screen it stays in view; on a phone it scrolls away with the page.
 */
export function AppBar({ title, steps, children }: { title?: string; steps?: ReactNode; children?: ReactNode }) {
  return (
    <header className="no-print z-30 border-b border-rule bg-paper lg:sticky lg:top-0">
      <div className="mx-auto flex max-w-[1720px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6 lg:h-[60px] lg:flex-nowrap lg:py-0">
        <div className="flex items-center gap-2 text-night">
          <LanternMark size={26} />
          <span className="text-[19px] font-extrabold tracking-[-0.01em]">Lantern</span>
          {title && <span className="ml-2 whitespace-nowrap text-[15px] text-ink-soft">{title}</span>}
        </div>
        <div className="order-3 w-full lg:order-none lg:w-auto lg:shrink-0">{steps}</div>
        <div className="order-4 flex w-full flex-wrap items-center gap-x-4 gap-y-2 lg:order-none lg:ml-auto lg:w-auto lg:flex-nowrap">{children}</div>
        <LangToggle className="order-2 ml-auto lg:order-none lg:ml-0" />
      </div>
    </header>
  );
}
