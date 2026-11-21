import { msgs, tr } from '../i18n/lang';
import type { Proposal, ReviewGroup } from '../core/reconcile';
import { GROUP_ORDER } from '../core/reconcile';
import type { Act, Disposition, IdentityIssue } from '../core/types';

/**
 * Review items: what Rita decides, one at a time. A pair of rows (earlier + later version) or a
 * single row. Each item sits in exactly one group: the most urgent one among its rows.
 */

export interface ReviewItem {
  id: string;
  group: ReviewGroup;
  kind: 'pair' | 'single';
  a?: string; // earlier act (pairs)
  b?: string; // later act (pairs)
  act?: string; // single
  actIds: string[];
  identity: IdentityIssue[];
  proposals: Proposal[];
  /** no model judged this pair: Lantern makes no suggestion, the reviewer decides */
  undecidedByModel?: boolean;
}

const GROUP_COPY = msgs<Record<ReviewGroup, { title: string; hint: string }>>(
  {
    identity: { title: 'Check the patient', hint: 'Name or hospital number does not match the census' },
    open: { title: 'Ask the nurse', hint: 'Only the person who wrote it can answer' },
    changed: { title: 'Corrected later', hint: 'The newer file documents a correction' },
    'likely-same': { title: 'Possibly typed twice', hint: 'Check whether both rows are the same act' },
    'only-earlier': { title: 'Missing from the newer file', hint: 'In the earlier copy, not in the later one' },
    'only-later': { title: 'Only in the newer file', hint: 'Not in the earlier copy' },
    copies: { title: 'Identical in both files', hint: 'Nothing to compare' },
  },
  {
    identity: { title: 'Confirmar a identidade', hint: 'O nome ou o n.º de processo não coincide com a lista de doentes' },
    open: { title: 'Perguntar à enfermagem', hint: 'Só quem escreveu pode responder' },
    changed: { title: 'Corrigido depois', hint: 'O ficheiro mais recente documenta uma correção' },
    'likely-same': { title: 'Talvez escrito duas vezes', hint: 'Confirme se as duas linhas são o mesmo ato' },
    'only-earlier': { title: 'Falta no ficheiro mais recente', hint: 'Está na cópia anterior, não na posterior' },
    'only-later': { title: 'Só no ficheiro mais recente', hint: 'Não está na cópia anterior' },
    copies: { title: 'Iguais nos dois ficheiros', hint: 'Nada a comparar' },
  },
);

/** Title and hint of a review group, in the current interface language. */
export const groupCopy = (g: ReviewGroup) => tr(GROUP_COPY)[g];

export function buildItems(acts: Act[], proposals: Proposal[], identity: IdentityIssue[]): ReviewItem[] {
  const prop = new Map(proposals.map((p) => [p.actId, p]));
  const used = new Set<string>();
  const items: ReviewItem[] = [];
  const rank = (g: ReviewGroup) => GROUP_ORDER.indexOf(g);
  const issuesFor = (ids: string[]) => identity.filter((i) => i.actIds.some((a) => ids.includes(a)));

  for (const p of proposals) {
    if (p.disposition.kind !== 'duplicate' || used.has(p.actId)) continue;
    const b = p.actId;
    const a = p.disposition.of;
    const pa = prop.get(a);
    const groups = [p.group, pa?.group ?? p.group];
    const group = groups.sort((x, y) => rank(x) - rank(y))[0]!;
    used.add(a).add(b);
    items.push({ id: `${a}~${b}`, group, kind: 'pair', a, b, actIds: [a, b], identity: issuesFor([a, b]), proposals: [pa!, p].filter(Boolean) });
  }
  // possible duplicates that no model judged: show both rows side by side, let the reviewer decide
  const later = new Set(acts.filter((a) => a.fileId !== acts[0]?.fileId).map((a) => a.id));
  for (const p of proposals) {
    if (!p.pairWith || !later.has(p.actId) || used.has(p.actId) || used.has(p.pairWith)) continue;
    const pa = prop.get(p.pairWith);
    used.add(p.pairWith).add(p.actId);
    items.push({ id: `${p.pairWith}~${p.actId}`, group: p.group, kind: 'pair', a: p.pairWith, b: p.actId, actIds: [p.pairWith, p.actId], identity: issuesFor([p.pairWith, p.actId]), proposals: [pa!, p].filter(Boolean), undecidedByModel: true });
  }
  for (const act of acts) {
    if (used.has(act.id)) continue;
    const p = prop.get(act.id);
    if (!p) continue;
    items.push({ id: act.id, group: p.group, kind: 'single', act: act.id, actIds: [act.id], identity: issuesFor([act.id]), proposals: [p] });
  }
  return items.sort((x, y) => rank(x.group) - rank(y.group));
}

export function isDecided(item: ReviewItem, decisions: Record<string, Disposition>): boolean {
  return item.actIds.every((id) => decisions[id] !== undefined);
}

/** Lantern's suggestion for an item, as a decision map. */
export function suggested(item: ReviewItem): Record<string, Disposition> {
  return Object.fromEntries(item.proposals.map((p) => [p.actId, p.disposition]));
}
