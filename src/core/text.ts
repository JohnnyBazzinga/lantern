/** Small, dependency-free text helpers used by the deterministic layer. */

export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Normalisation for exact-copy detection: case, accents, spacing and punctuation do not matter. */
export function normText(s: string): string {
  return fold(s)
    .replace(/[^\p{L}\p{N}%./]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(s: string): string[] {
  return normText(s)
    .split(' ')
    .filter((t) => t.length > 1 || /\d/.test(t));
}

/** Jaccard similarity over tokens, with numbers split from units ("2g" → "2", "g"). */
export function similarity(a: string, b: string): number {
  const split = (s: string) => new Set(tokens(s).flatMap((t) => t.match(/\d+(?:\.\d+)?|[^\d]+/g) ?? [t]));
  const A = split(a);
  const B = split(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array<number>(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0]![j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m]![n]!;
}

/** "22:15", "2215", "22h15", "9:05" → minutes since 12:00 (night shift ordering); null if unreadable. */
export function nightMinutes(raw: string): number | null {
  const m = raw.trim().match(/^(\d{1,2})[:h.]?(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const t = h * 60 + min;
  return h < 12 ? t + 24 * 60 - 12 * 60 : t - 12 * 60;
}

/**
 * Error-prone abbreviations (subset of the ISMP list) that must never be resolved by a model.
 * Lantern turns them into an open question for the documenting clinician.
 */
const ERROR_PRONE: { rx: RegExp; label: string }[] = [
  { rx: /\bMS\b/, label: "'MS' (morphine sulfate or magnesium sulfate)" },
  { rx: /\bMSO4\b/i, label: "'MSO4' (morphine or magnesium)" },
  { rx: /\bMgSO4\b/, label: "'MgSO4' (confused with morphine)" },
  { rx: /\b\d+\s*U\b/, label: "'U' for units (misread as 0 or 4)" },
  { rx: /\bIU\b/, label: "'IU' (misread as IV or 10)" },
  { rx: /\bQ\.?O?D\b/i, label: "'QD'/'QOD' (daily vs every other day)" },
  { rx: /\b\d+\.0\s*(?:mg|g|ml|mcg)\b/i, label: 'trailing zero (1.0 mg misread as 10 mg)' },
  { rx: /(?:^|\s)\.\d+\s*(?:mg|g|ml|mcg)\b/i, label: 'naked decimal (.5 mg misread as 5 mg)' },
];

export function errorProneAbbreviations(s: string): string[] {
  return ERROR_PRONE.filter((e) => e.rx.test(s)).map((e) => e.label);
}
