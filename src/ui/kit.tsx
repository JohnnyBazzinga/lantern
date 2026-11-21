import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Cloud, Cpu, Scale } from 'lucide-react';
import { normText } from '../core/text';

export function Button({
  tone = 'primary',
  className = '',
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'secondary' | 'quiet' | 'pen' }) {
  const tones = {
    primary: 'bg-ink text-white hover:bg-[#25313f] disabled:bg-ink-faint',
    secondary: 'border border-rule-strong bg-sheet text-ink hover:border-ink',
    quiet: 'text-ink-soft underline-offset-4 hover:text-ink hover:underline',
    pen: 'border border-pen text-pen bg-sheet hover:bg-pen-wash',
  } as const;
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed ${tones[tone]} ${className}`}
    />
  );
}

/** Where an opinion came from. Every model output in Lantern carries one of these. */
export function RanOn({ source, model }: { source: 'on_device' | 'in_cloud' | 'rule'; model?: string }) {
  if (source === 'on_device')
    return (
      <span className="inline-flex items-center gap-1 rounded-sm bg-scrub-wash px-1.5 py-0.5 text-[13px] font-semibold text-scrub">
        <Cpu size={13} aria-hidden /> On this device
      </span>
    );
  if (source === 'in_cloud')
    return (
      <span className="inline-flex items-center gap-1 rounded-sm bg-ballpoint-wash px-1.5 py-0.5 text-[13px] font-semibold text-ballpoint" title={model}>
        <Cloud size={13} aria-hidden /> Cloud
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-paper px-1.5 py-0.5 text-[13px] font-semibold text-ink-soft">
      <Scale size={13} aria-hidden /> Rule
    </span>
  );
}

/** Renders text with the words that do not occur in `other` marked by the highlighter. */
export function Diff({ text, other }: { text: string; other?: string }) {
  if (!other || !text) return <>{text || <span className="text-ink-faint">(blank)</span>}</>;
  const theirs = new Set(normText(other).split(' '));
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((p, i) => {
        const n = normText(p);
        return n && !n.split(' ').every((t) => theirs.has(t)) ? (
          <mark key={i} className="diff">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        );
      })}
    </>
  );
}

export function LanternMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M9 3h6v2H9z" fill="currentColor" />
      <path d="M8 6h8l1 2.5V17l-1.5 2h-7L7 17V8.5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12.5" r="2.3" fill="#e9a23b" />
    </svg>
  );
}

export function Meter({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((100 * done) / total) : 0;
  return (
    <div className="flex items-center gap-2" aria-label={`${done} of ${total} rows decided`}>
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-rule">
        <div className="h-full bg-ink transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm tabular-nums text-ink-soft">
        {done} of {total} rows decided
      </span>
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'pen' | 'scrub'; children: ReactNode }) {
  const t = { info: 'border-rule bg-sheet', pen: 'border-pen/40 bg-pen-wash', scrub: 'border-scrub/30 bg-scrub-wash' }[tone];
  return <div className={`rounded-md border px-4 py-3 text-[15px] ${t}`}>{children}</div>;
}
