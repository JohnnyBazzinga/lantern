import { hasCorrectionNote, relayedFrom } from './clinical';
import { ct } from './i18n';
import { identityDetail } from './identity';
import type { ReviewGroup } from './reconcile';
import type { Act, IdentityIssue } from './types';

/**
 * The questions Lantern prepares for the nurse. Each one names the patient, the time and the rows it is
 * about, and asks the specific thing only the author can answer. One question per issue, not per row.
 * They are written in the interface language; the rows are quoted exactly as typed.
 */

export function pairQuestion(group: ReviewGroup, a: Act, b: Act): { owner: string; question: string } {
  const t = ct();
  const relayed = relayedFrom(b);
  if (group === 'changed' || hasCorrectionNote(b)) {
    if (relayed)
      return {
        owner: relayed,
        question: t.relayedQuestion(b.documentedBy, t.q(a.actText), t.at(a.eventTime), t.q(b.actText), t.q(b.notes)),
      };
    return {
      owner: a.documentedBy || b.documentedBy || t.nurseInCharge,
      question: t.correctionQuestion(t.q(a.actText), t.at(a.eventTime), t.q(b.actText), b.notes ? t.q(b.notes) : ''),
    };
  }
  return {
    owner: a.documentedBy || b.documentedBy || t.nurseInCharge,
    question: t.twiceQuestion(t.q(a.actText), t.at(a.eventTime), t.q(b.actText), t.at(b.eventTime)),
  };
}

export function singleQuestion(group: ReviewGroup, a: Act, abbreviations: string[] = []): string {
  const t = ct();
  const what = t.q(a.actText);
  const at = t.at(a.eventTime);
  if (abbreviations.length) return t.abbreviationQuestion(what, at, abbreviations.join(t.and));
  if (group === 'only-earlier') return t.onlyEarlierQuestion(what, at);
  if (group === 'only-later') return t.onlyLaterQuestion(what, at);
  return t.confirmQuestion(what, at);
}

/** The open question for a pair no rule or model can link, asked about the later row. */
export function unlinkedQuestion(a: Act, b: Act): string {
  const t = ct();
  return `${singleQuestion('open', b)}${t.notEnoughToLink(t.q(a.actText), t.at(a.eventTime))}`;
}

export function identityQuestion(issue: IdentityIssue, a: Act): string {
  const t = ct();
  const who = [a.patientName && t.q(a.patientName), a.patientId, a.bed && t.bed(a.bed)].filter(Boolean).join(', ');
  const detail = identityDetail(issue);
  switch (issue.kind) {
    case 'no-identity':
      return t.noIdentityQuestion(t.q(a.actText), t.at(a.eventTime), a.bed);
    case 'id-mismatch':
    case 'id-name-conflict':
      return t.whichPatient(who, detail);
    case 'name-variant':
      return t.samePatient(who, detail);
    case 'not-in-census':
      return t.notInCensusQuestion(who);
  }
}
