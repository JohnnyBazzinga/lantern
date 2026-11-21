import { editDistance, fold } from './text';
import type { Act, CensusEntry, IdentityIssue } from './types';

/**
 * Patient identity is checked deterministically, before any model sees a row: wrong-patient
 * entries were the most frequent error when an ED ran on a spreadsheet during the 2021 HSE
 * ransomware attack. Lantern never merges or attributes on the bed number alone.
 */

export type NameMatch = 'same' | 'initial' | 'variant' | 'different';

const words = (s: string) =>
  fold(s)
    .replace(/[^a-z\s.]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

export function compareNames(a: string, b: string): NameMatch {
  const A = words(a);
  const B = words(b);
  if (!A.length || !B.length) return 'different';
  if (A.join(' ') === B.join(' ')) return 'same';
  const lastA = A[A.length - 1]!;
  const lastB = B[B.length - 1]!;
  const firstA = A[0]!.replace('.', '');
  const firstB = B[0]!.replace('.', '');
  const surnameClose = lastA === lastB || editDistance(lastA, lastB) <= 1;
  if (!surnameClose) return 'different';
  if (lastA === lastB && (firstA.length === 1 || firstB.length === 1) && firstA[0] === firstB[0]) return 'initial';
  if (firstA === firstB && lastA === lastB) return 'same';
  if (editDistance(firstA, firstB) <= 1 || (firstA[0] === firstB[0] && lastA !== lastB)) return 'variant';
  return 'different';
}

const normId = (s: string) => s.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
const isTransposition = (a: string, b: string) =>
  a.length === b.length && a !== b && [...a].sort().join('') === [...b].sort().join('');

/** Assigns `patientKey` to every act and returns the identity issues the reviewer must settle. */
export function resolveIdentities(acts: Act[], census: CensusEntry[]): IdentityIssue[] {
  const issues: IdentityIssue[] = [];
  const byId = new Map(census.map((c) => [normId(c.patientId), c]));
  const push = (kind: IdentityIssue['kind'], act: Act, detail: string, suggestion?: CensusEntry) => {
    const key = `${kind}|${suggestion?.patientId ?? act.patientId ?? act.bed}`;
    const existing = issues.find((i) => i.id === key);
    if (existing) {
      if (!existing.actIds.includes(act.id)) existing.actIds.push(act.id);
      return;
    }
    issues.push({
      id: key,
      kind,
      actIds: [act.id],
      detail,
      ...(suggestion && { suggestion: { patientName: suggestion.patientName, patientId: suggestion.patientId } }),
    });
  };

  for (const act of acts) {
    const id = normId(act.patientId);
    const name = act.patientName;
    if (!id && !name) {
      act.patientKey = null;
      push('no-identity', act, `Bed ${act.bed || '?'} only: no name or hospital number. Do not attribute by bed.`);
      continue;
    }
    const byIdHit = id ? byId.get(id) : undefined;
    if (byIdHit) {
      act.patientKey = byIdHit.patientId;
      const nm = name ? compareNames(name, byIdHit.patientName) : 'same';
      if (nm === 'variant') push('name-variant', act, `“${name}” vs census “${byIdHit.patientName}” for ${byIdHit.patientId}`, byIdHit);
      if (nm === 'different')
        push('id-name-conflict', act, `${act.patientId} belongs to ${byIdHit.patientName} in the census, but the row says “${name}”`, byIdHit);
      continue;
    }
    const byName = name ? census.filter((c) => compareNames(name, c.patientName) !== 'different') : [];
    if (byName.length === 1) {
      const c = byName[0]!;
      act.patientKey = c.patientId;
      if (id) {
        const t = isTransposition(id, normId(c.patientId));
        push('id-mismatch', act, `${name}: row says ${act.patientId}, census says ${c.patientId}${t ? ' (looks like transposed digits)' : ''}`, c);
      }
      continue;
    }
    act.patientKey = id || `name:${fold(name)}`;
    push('not-in-census', act, `${name || act.patientId} is not on the 21:00 census (admitted during the outage?)`);
  }
  return issues;
}
