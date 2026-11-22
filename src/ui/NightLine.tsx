import type { ReactNode } from 'react';

/**
 * The night line: one band from dusk to morning. The hours the record was down are night-dark, and
 * each event is a lamp on it. It appears only where time is the question: the drill's story on the
 * start page, and the doses of one medicine through the night in the review.
 *
 * Times are minutes since 12:00 (as `Act.timeMinutes`), so a night sorts and scales across midnight.
 */
export interface NightMark {
  at: number;
  label: string;
  /** how many rows sit at this time; shown inside the lamp when more than one */
  count?: number;
  /** ringed: the rows being compared now */
  focus?: boolean;
  /** hollow: the row only may belong here (an abbreviation Lantern does not interpret) */
  unsure?: boolean;
  title?: string;
}

/** The time between two neighbouring lamps, in words, drawn as a dimension line inside the band. */
export interface NightGap {
  from: number;
  to: number;
  label: string;
}

/** A gap gets its words inside the band only if it is at least this share of the line; the caller says the rest in a sentence. */
export const GAP_FITS = 0.28;

const clock = (m: number) => `${String((12 + Math.floor(m / 60)) % 24).padStart(2, '0')}:00`;

export function NightLine({
  from,
  to,
  down,
  marks,
  gaps = [],
  inside,
  animate = false,
  label,
}: {
  from: number;
  to: number;
  /** the stretch the record was down; the whole line when omitted */
  down?: [number, number];
  marks: NightMark[];
  /** shown inside the band on a wide pane, between the two lamps each one measures */
  gaps?: NightGap[];
  /** a short caption set inside the dark band */
  inside?: ReactNode;
  /** draw the band, then light the lamps in order (the start page's one orchestrated moment) */
  animate?: boolean;
  label: string;
}) {
  const span = to - from;
  const pos = (m: number) => `${(100 * (m - from)) / span}%`;
  const [d0, d1] = down ?? [from, to];
  const hours: number[] = [];
  for (let h = Math.ceil(from / 60) * 60; h <= to; h += 60) hours.push(h);
  const every = hours.length > 9 ? 3 : hours.length > 5 ? 2 : 1;
  return (
    <div role="img" aria-label={label} className="select-none">
      {/* the times of the lamps, above the band */}
      <div className="relative h-7">
        {marks.map((m, i) => (
          <span
            key={i}
            className={`absolute bottom-1 -translate-x-1/2 whitespace-nowrap text-[15px] font-semibold tabular-nums ${animate ? 'animate-lamp-on' : ''}`}
            style={{ left: pos(m.at), animationDelay: animate ? `${650 + i * 120}ms` : undefined }}
          >
            {m.label}
          </span>
        ))}
      </div>
      <div className="relative h-10 rounded-[3px] bg-gutter">
        <div
          className={`absolute inset-y-0 flex items-center overflow-hidden rounded-[3px] bg-night ${animate ? 'animate-night-draw' : ''}`}
          style={{ left: pos(d0), width: `${(100 * (d1 - d0)) / span}%` }}
        >
          {inside && <span className="truncate pl-10 pr-4 text-[14px] text-white/80">{inside}</span>}
        </div>
        {gaps
          .filter((g) => (g.to - g.from) / span >= GAP_FITS)
          .map((g) => (
            <span
              key={g.from}
              className="absolute inset-y-0 hidden items-center gap-2 px-5 text-[13px] text-white/85 @4xl:flex"
              style={{ left: pos(g.from), width: `${(100 * (g.to - g.from)) / span}%` }}
            >
              <span className="h-px flex-1 bg-white/35" />
              <span className="whitespace-nowrap">{g.label}</span>
              <span className="h-px flex-1 bg-white/35" />
            </span>
          ))}
        {marks.map((m, i) => (
          <span key={i} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: pos(m.at) }} title={m.title}>
            <span
              className={`grid place-items-center rounded-full text-[13px] font-extrabold leading-none ${animate ? 'animate-lamp-on' : ''} ${
                m.unsure ? 'border-2 border-dashed border-lamp bg-night text-lamp' : 'bg-lamp text-night'
              } ${m.count && m.count > 1 ? 'h-6 w-6' : m.unsure ? 'h-6 w-6' : 'h-4 w-4'} ${m.focus ? 'outline outline-2 outline-offset-[3px] outline-white' : ''}`}
              style={{ animationDelay: animate ? `${650 + i * 120}ms` : undefined, boxShadow: m.unsure ? undefined : '0 0 0 4px rgb(245 184 74 / 0.28)' }}
            >
              {m.unsure ? '?' : m.count && m.count > 1 ? m.count : ''}
            </span>
          </span>
        ))}
      </div>
      {/* the hours, below */}
      <div className="relative h-7">
        {hours.map((h, i) => (
          <span key={h} className={`absolute top-0 ${h === from ? '' : h === to ? '-translate-x-full' : '-translate-x-1/2'}`} style={{ left: pos(h) }}>
            <span className={`block w-px bg-rule-strong ${h === from ? '' : h === to ? 'ml-auto' : 'mx-auto'} ${i % every === 0 ? 'h-2' : 'h-1'}`} />
            {i % every === 0 && <span className="block text-[13px] tabular-nums text-ink-faint">{clock(h)}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
