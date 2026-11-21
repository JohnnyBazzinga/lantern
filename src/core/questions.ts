import { relayedFrom } from './clinical';
import type { ReviewGroup } from './reconcile';
import type { Act, IdentityIssue } from './types';

/**
 * The questions Lantern prepares for the nurse. Each one names the patient, the time and the rows it is
 * about, and asks the specific thing only the author can answer. One question per issue, not per row.
 */

const t = (a: Act) => a.eventTime || 'no time';
const q = (s: string) => `“${s || '(blank)'}”`;

export function pairQuestion(group: ReviewGroup, a: Act, b: Act): { owner: string; question: string } {
  const relayed = relayedFrom(b);
  if (group === 'changed' || /\b(?:corr|not given|mistake|error)/i.test(`${b.actText} ${b.notes}`)) {
    if (relayed)
      return {
        owner: relayed,
        question: `${b.documentedBy || 'Someone'} corrected your entry on your word: ${q(a.actText)} at ${t(a)} became ${q(b.actText)} (${q(b.notes)}). Please confirm and enter the correction yourself.`,
      };
    return {
      owner: a.documentedBy || b.documentedBy || 'nurse in charge',
      question: `The later copy corrects ${q(a.actText)} at ${t(a)} to ${q(b.actText)}${b.notes ? ` (${q(b.notes)})` : ''}. Which version is right?`,
    };
  }
  return {
    owner: a.documentedBy || b.documentedBy || 'nurse in charge',
    question: `One copy says ${q(a.actText)} at ${t(a)}, the other ${q(b.actText)} at ${t(b)}. Is this one act written twice, or two separate acts?`,
  };
}

export function singleQuestion(group: ReviewGroup, a: Act, abbreviations: string[] = []): string {
  if (abbreviations.length) return `${q(a.actText)} at ${t(a)} uses ${abbreviations.join(' and ')}. What exactly was given?`;
  if (group === 'only-earlier') return `${q(a.actText)} at ${t(a)} is in the earlier copy but not in the later one. Was it removed on purpose, or lost when the sheet was edited?`;
  if (group === 'only-later') return `${q(a.actText)} at ${t(a)} is only in the later copy. Please confirm it happened, and when.`;
  return `Please confirm ${q(a.actText)} at ${t(a)}.`;
}

export function identityQuestion(issue: IdentityIssue, a: Act): string {
  const who = [a.patientName && q(a.patientName), a.patientId, a.bed && `bed ${a.bed}`].filter(Boolean).join(', ');
  switch (issue.kind) {
    case 'no-identity':
      return `${q(a.actText)} at ${t(a)} has only ${a.bed ? `bed ${a.bed}` : 'no patient details'}: no name or hospital number. Which patient was this?`;
    case 'id-mismatch':
    case 'id-name-conflict':
      return `The row says ${who}. ${issue.detail} Which patient is it?`;
    case 'name-variant':
      return `The row says ${who}. ${issue.detail} Is it the same patient?`;
    case 'not-in-census':
      return `${who || 'This patient'} is not on the 21:00 census. Please confirm the admission and the hospital number.`;
  }
}
