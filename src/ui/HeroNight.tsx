import { useId } from 'react';
import { Link2 } from 'lucide-react';

/**
 * The start page's picture, drawn rather than photographed so it stays sharp at any size and speaks
 * both languages: the ward's spreadsheet in perspective, the night nurse's paper note with the four
 * times of the drill, and a line of green light between them where Lantern does its work. Decoration
 * only (the same facts are in the text), so it is hidden from screen readers.
 *
 * Everything is laid out in a 900 × 480 box, the size it has on the mockup.
 */
export function HeroNight({ notes, chip }: { notes: { t: string; text: string }[]; chip: string }) {
  const id = useId().replace(/:/g, '');
  // the spreadsheet: a quadrilateral seen at an angle, with its grid interpolated between the edges
  const TL = [196, 132],
    TR = [492, 100],
    BR = [446, 520],
    BL = [40, 520];
  const lerp = (a: number[], b: number[], t: number) => [a[0]! + (b[0]! - a[0]!) * t, a[1]! + (b[1]! - a[1]!) * t];
  const at = (u: number, v: number) => lerp(lerp(TL, TR, u), lerp(BL, BR, u), v);
  const ROWS = 15;
  const COLS = [0, 0.17, 0.36, 0.56, 0.78, 1];
  const rowLines = Array.from({ length: ROWS + 1 }, (_, i) => [at(0, i / ROWS), at(1, i / ROWS)]);
  const colLines = COLS.map((u) => [at(u, 0), at(u, 1)]);
  const lit = 5; // the row Lantern has just matched
  const cell = (r: number, c0: number, c1: number) => [at(COLS[c0]!, r / ROWS), at(COLS[c1]!, r / ROWS), at(COLS[c1]!, (r + 1) / ROWS), at(COLS[c0]!, (r + 1) / ROWS)];
  const poly = (pts: number[][]) => pts.map((p) => p.join(',')).join(' ');
  const firstCol = [201, 207, 210, 213, 216, 219, 302, 305, 308, 311, 314, 317];
  return (
    <div aria-hidden className="relative w-full select-none" style={{ aspectRatio: '900 / 480' }}>
      <svg viewBox="0 0 900 480" className="absolute inset-0 h-full w-full" fill="none">
        <defs>
          <clipPath id={`c${id}`}>
            <path d={SHAPE} />
          </clipPath>
          <linearGradient id={`bg${id}`} x1="900" y1="0" x2="80" y2="460" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#0b2622" />
            <stop offset="0.55" stopColor="#163a31" />
            <stop offset="1" stopColor="#24493e" />
          </linearGradient>
          <linearGradient id={`sheet${id}`} x1="200" y1="110" x2="120" y2="500" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#9fb0a9" />
            <stop offset="0.45" stopColor="#c7d2cc" />
            <stop offset="1" stopColor="#7d918a" />
          </linearGradient>
          <linearGradient id={`paper${id}`} x1="520" y1="110" x2="860" y2="460" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#dcd8cf" />
            <stop offset="0.5" stopColor="#ebe7de" />
            <stop offset="1" stopColor="#cfcac0" />
          </linearGradient>
          <radialGradient id={`vig${id}`} cx="520" cy="250" r="520" gradientUnits="userSpaceOnUse">
            <stop offset="0.45" stopColor="#0b2622" stopOpacity="0" />
            <stop offset="1" stopColor="#0b2622" stopOpacity="0.55" />
          </radialGradient>
          <linearGradient id={`glow${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c8ffd8" stopOpacity="0" />
            <stop offset="0.18" stopColor="#c8ffd8" stopOpacity="0.95" />
            <stop offset="0.8" stopColor="#7dffa8" stopOpacity="0.9" />
            <stop offset="1" stopColor="#7dffa8" stopOpacity="0" />
          </linearGradient>
          <filter id={`soft${id}`} x="-50%" y="-10%" width="200%" height="120%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id={`shadow${id}`} x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="-6" dy="10" stdDeviation="10" floodColor="#04110f" floodOpacity="0.45" />
          </filter>
        </defs>

        <path d={SHAPE} fill={`url(#bg${id})`} />
        <g clipPath={`url(#c${id})`}>
          {/* the spreadsheet */}
          <polygon points={poly([TL, TR, BR, BL])} fill={`url(#sheet${id})`} opacity="0.92" />
          <polygon points={poly(cell(lit, 1, 5))} fill="#2e8c4e" opacity="0.92" />
          {rowLines.map(([a, b], i) => (
            <line key={`r${i}`} x1={a![0]} y1={a![1]} x2={b![0]} y2={b![1]} stroke="#3c4d47" strokeOpacity="0.55" strokeWidth="1" />
          ))}
          {colLines.map(([a, b], i) => (
            <line key={`c${i}`} x1={a![0]} y1={a![1]} x2={b![0]} y2={b![1]} stroke="#3c4d47" strokeOpacity={i === 1 ? 0.7 : 0.45} strokeWidth="1" />
          ))}
          {firstCol.map((n, i) => {
            const [x, y] = at(0.07, (i + 2.62) / ROWS);
            return (
              <text key={n} x={x} y={y} fontSize="11" fill="#34443f" fillOpacity="0.75" fontFamily="var(--font-mono)" transform={`rotate(-6 ${x} ${y})`}>
                {n}
              </text>
            );
          })}
          {(() => {
            const [x, y] = at(0.2, (lit + 0.68) / ROWS);
            return (
              <text x={x} y={y} fontSize="12" fill="#e7f7ec" fontFamily="var(--font-mono)" fontWeight="600" transform={`rotate(-6 ${x} ${y})`}>
                210
              </text>
            );
          })()}

          {/* the paper note */}
          <g filter={`url(#shadow${id})`}>
            <path d="M512 150 L 818 106 Q 830 104 832 116 L 880 470 L 528 498 Q 518 499 517 488 L 500 164 Q 499 152 512 150 Z" fill={`url(#paper${id})`} />
          </g>
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1={520 + i * 1.5} y1={214 + i * 62} x2={806 + i * 6} y2={178 + i * 60} stroke="#6e6a62" strokeOpacity="0.55" strokeWidth="1" />
          ))}
          {notes.map((n, i) => (
            <g key={n.t} transform={`rotate(-7.5 ${530 + i * 2} ${200 + i * 61})`} fontFamily="var(--font-hand)" fill="#2b2d2b">
              <text x={528 + i * 2} y={204 + i * 61} fontSize="27">
                {n.t}
              </text>
              <text x={612 + i * 2} y={204 + i * 61} fontSize="24">
                {n.text}
              </text>
            </g>
          ))}

          <rect width="900" height="480" fill={`url(#vig${id})`} />

          {/* the line of light */}
          <g transform="rotate(14 470 260)">
            <rect x="461" y="20" width="18" height="480" fill={`url(#glow${id})`} opacity="0.55" filter={`url(#soft${id})`} />
            <rect x="469" y="20" width="2" height="480" fill={`url(#glow${id})`} />
          </g>

          {/* the focus marks around the match */}
          <path d="M350 332 V296 H420 V332 M350 372 V410 H404 V372" stroke="#e8f3ec" strokeOpacity="0.75" strokeWidth="1.5" />
        </g>
      </svg>
      {/* the glass chip, in HTML so its words translate and its glass blurs what is behind it */}
      <span
        className="absolute flex items-center gap-2.5 whitespace-nowrap rounded-xl border border-white/30 bg-[#16332c]/55 px-[2.2%] text-[clamp(11px,1.05vw,16px)] font-medium text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] backdrop-blur-[6px]"
        style={{ left: '30.4%', top: '69.6%', height: '9.6%' }}
      >
        <Link2 className="h-[1.15em] w-[1.15em]" strokeWidth={2} />
        {chip}
      </span>
    </div>
  );
}

/** The dark card the picture sits in: a slanted shape with soft corners, rising to the top-right corner. */
const SHAPE =
  'M160 127 L 430 74 C 470 66 488 40 506 18 C 516 6 524 0 540 0 L 900 0 L 900 330 C 870 380 840 430 790 458 C 780 462 770 464 750 464 L 92 464 C 66 464 52 446 58 422 L 128 150 C 132 136 144 130 160 127 Z';
