import { useId } from 'react';

/** The band's outline, in a 600 × 420 box anchored to the top-right corner. */
const BAND = 'M307 0 C 290 8 270 22 262 34 C 250 52 232 78 214 90 C 196 102 172 108 170 122 C 168 150 190 176 222 186 C 250 196 280 226 314 230 C 340 232 380 214 422 194 C 470 172 540 124 600 77 V 0 Z';

/**
 * The quiet scenery behind a screen, as on the mockups: a deep green wave falling from the top-right
 * corner into the page's off-white, and a ribbon of fine lines along the left edge. Pure decoration:
 * hidden from screen readers, never printed, never in the way of a click.
 *
 *   hero  the start page: the ribbon, and a soft mint mist at the top right (the hero art draws its own dark shape)
 *   page  a page you read top to bottom (columns, worklist, result): the full wave
 *   work  a working screen (review): only the tip of the wave, and a fainter ribbon
 */
export function Backdrop({ variant }: { variant: 'hero' | 'page' | 'work' }) {
  const id = useId().replace(/:/g, '');
  const lines = Array.from({ length: 26 }, (_, i) => i);
  return (
    <div aria-hidden className="no-print pointer-events-none absolute inset-x-0 top-0 -z-10 h-[1100px] overflow-hidden">
      {/* the ribbon of fine lines on the left */}
      <svg
        className={`absolute -left-6 top-[120px] h-[900px] w-[260px] max-sm:hidden ${variant === 'work' ? 'opacity-50' : 'opacity-90'}`}
        viewBox="0 0 260 900"
        fill="none"
        preserveAspectRatio="none"
      >
        {lines.map((i) => (
          <path
            key={i}
            d={`M ${-10 + i * 1.6} ${880 - i * 4} C ${150 - i * 2.2} ${700 - i * 6}, ${-30 + i * 3.4} ${420 - i * 3}, ${120 + i * 2.4} ${-10 + i * 5}`}
            stroke="#7fae8c"
            strokeOpacity={0.16 + (i % 5) * 0.035}
            strokeWidth={0.7}
          />
        ))}
      </svg>

      {variant === 'page' ? (
        // a diagonal band of deep green with crisp edges, dissolving into white mist at its lower-left tip
        <svg className="absolute right-0 top-0 w-[min(47vw,780px)] max-sm:w-[70vw]" viewBox="0 0 600 420" fill="none">
          <defs>
            <linearGradient id={`w${id}`} x1="600" y1="0" x2="300" y2="200" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#0b2622" />
              <stop offset="0.55" stopColor="#123a31" />
              <stop offset="1" stopColor="#2f5e4d" />
            </linearGradient>
            <radialGradient id={`f${id}`} cx="176" cy="150" r="235" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#f4f2ee" stopOpacity="1" />
              <stop offset="0.3" stopColor="#f4f2ee" stopOpacity="1" />
              <stop offset="0.5" stopColor="#e9ece5" stopOpacity="0.72" />
              <stop offset="0.75" stopColor="#d9e2d8" stopOpacity="0.28" />
              <stop offset="1" stopColor="#d9e2d8" stopOpacity="0" />
            </radialGradient>
            <filter id={`b${id}`} x="-5%" y="-5%" width="110%" height="110%">
              <feGaussianBlur stdDeviation="0.8" />
            </filter>
          </defs>
          <g filter={`url(#b${id})`}>
            <path d={BAND} fill={`url(#w${id})`} />
            <path d={BAND} fill={`url(#f${id})`} />
          </g>
        </svg>
      ) : variant === 'work' ? (
        <svg className="absolute right-0 top-0 w-[min(22vw,340px)] max-sm:w-[40vw]" viewBox="0 0 600 420" fill="none">
          <defs>
            <radialGradient id={`m${id}`} cx="600" cy="0" r="420" gradientUnits="userSpaceOnUse">
              <stop offset="0.25" stopColor="#c9dcc5" stopOpacity="0.75" />
              <stop offset="1" stopColor="#f4f2ee" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`w${id}`} x1="600" y1="0" x2="480" y2="110" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#0b2622" />
              <stop offset="1" stopColor="#2f5e4d" />
            </linearGradient>
          </defs>
          <rect width="600" height="420" fill={`url(#m${id})`} />
          <path d="M470 0 C 500 46 546 86 600 110 V0 Z" fill={`url(#w${id})`} />
        </svg>
      ) : (
        <svg className="absolute right-0 top-0 w-[min(60vw,980px)]" viewBox="0 0 600 420" fill="none">
          <defs>
            <radialGradient id={`h${id}`} cx="600" cy="0" r="600" gradientUnits="userSpaceOnUse">
              <stop offset="0.2" stopColor="#d7e6d2" stopOpacity="0.7" />
              <stop offset="1" stopColor="#f4f2ee" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="600" height="420" fill={`url(#h${id})`} />
        </svg>
      )}
    </div>
  );
}
