import type { FinalColumn } from './mapping';

export type SourceOrigin = 'bundled-fixture' | 'user-import';

export interface SourceFile {
  id: string;
  name: string;
  hash: string;
  /** "census", "v1", "v2"… in the order the reviewer received them */
  versionLabel: string;
  role: 'log' | 'census';
  origin: SourceOrigin;
  headers: string[];
  rows: string[][];
  mapping: FinalColumn[];
}

export interface Evidence {
  fileId: string;
  row: number; // data row index (0-based); sheet row = row + 2
  col: number;
  ref: string; // "E5"
  text: string;
}

/** One documented act = one row of an improvised downtime log. Values are kept as written. */
export interface Act {
  id: string; // `${fileId}:${row}`
  fileId: string;
  versionLabel: string;
  row: number;
  bed: string;
  patientName: string;
  patientId: string;
  eventTime: string;
  /** minutes since 12:00, so a night shift sorts correctly across midnight; null when missing/unreadable */
  timeMinutes: number | null;
  actText: string;
  notes: string;
  documentedBy: string;
  evidence: Partial<Record<'bed' | 'patient' | 'time' | 'act' | 'notes' | 'by', Evidence>>;
  /** canonical patient key after identity resolution (census hospital number when known) */
  patientKey: string | null;
}

export type Relation = 'same' | 'amendment' | 'separate' | 'insufficient';

export interface Judgment {
  relation: Relation;
  evidence: string;
  changed: string[];
  source: 'on_device' | 'in_cloud' | 'rule';
  ledgerId?: string;
}

/** A possible correspondence between an act in an earlier version (a) and a later one (b). */
export interface MatchCandidate {
  id: string;
  a: string;
  b: string;
  exact: boolean;
  similarity: number;
  timeGap: number | null; // minutes
  local?: Judgment;
  cloud?: Judgment;
}

export type Disposition =
  | { kind: 'approved'; /** e.g. the nurse's answer that settled an open question */ note?: string }
  | { kind: 'corrected'; changes: { field: string; from: string; to: string; basis: string }[] }
  | { kind: 'duplicate'; of: string }
  /** owner: initials of the nurse who must answer (or "nurse in charge"); ref: the review item it came from, so a pair yields one question */
  | { kind: 'unresolved'; owner: string; question: string; ref?: string }
  | { kind: 'excluded'; reason: string };

export type IdentityIssueKind = 'name-variant' | 'id-mismatch' | 'id-name-conflict' | 'not-in-census' | 'no-identity';

export interface IdentityIssue {
  id: string;
  kind: IdentityIssueKind;
  actIds: string[];
  detail: string;
  suggestion?: { patientName: string; patientId: string };
}

export interface AuditEvent {
  seq: number;
  at: string;
  actor: string;
  action: string;
  targetIds: string[];
  before?: unknown;
  after?: unknown;
  ledgerId?: string;
}

export interface CensusEntry {
  bed: string;
  patientName: string;
  patientId: string;
}
