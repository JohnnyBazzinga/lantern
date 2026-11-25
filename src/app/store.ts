import Dexie, { type Table } from 'dexie';
import type { Proposal } from '../core/reconcile';
import type { Act, AuditEvent, Disposition, IdentityIssue, MatchCandidate, SourceFile } from '../core/types';
import type { LedgerEntry } from '../ai/ledger';

/**
 * A review session, kept in this browser's IndexedDB so Rita can close the laptop and resume,
 * with or without network. Nothing here is ever synced anywhere.
 */
export interface SessionData {
  id: string;
  kind: 'drill' | 'import';
  title: string;
  createdAt: string;
  startedAt: number;
  finishedAt?: number;
  files: SourceFile[];
  acts: Act[];
  earlierIds: string[];
  laterIds: string[];
  candidates: MatchCandidate[];
  escalated: [string, string[]][];
  identity: IdentityIssue[];
  proposals: Proposal[];
  decisions: Record<string, Disposition>;
  /** identity issue id → how the reviewer settled it */
  identityDecisions: Record<string, 'census' | 'as-written' | 'ask'>;
  audit: AuditEvent[];
  cloudAsked: boolean;
  /** re-entry progress on the worklist: when each act was ticked as typed into the record, and by whom */
  entered: Record<string, Entered | boolean>;
  /** the date the outage night started (YYYY-MM-DD); clock times before noon belong to the next day */
  nightOf?: string;
  /** initials of the person reviewing, recorded with every tick and decision */
  reviewer?: string;
  /** answers received to questions for the nurses, by question ref */
  answers?: Record<string, { text: string; at: string; recordedBy?: string }>;
  /** last change, for automatic expiry of imported reviews on shared PCs */
  updatedAt?: number;
  /** the model calls made for this review (where each ran; references, never contents), kept so the
   *  counts survive a reload, offline included */
  ledger?: LedgerEntry[];
}

export interface Entered {
  at: string;
  by?: string;
}

/** Imported reviews hold patient data: on a shared ward PC they are deleted automatically after this. */
export const IMPORT_RETENTION_MS = 12 * 3600_000;

class LanternDb extends Dexie {
  sessions!: Table<SessionData, string>;
  constructor() {
    super('lantern');
    this.version(1).stores({ sessions: 'id, createdAt' });
  }
}

export const db = new LanternDb();

export async function saveSession(s: SessionData): Promise<void> {
  try {
    await db.sessions.put(JSON.parse(JSON.stringify(s)) as SessionData);
  } catch {
    /* storage can be unavailable (private window); the session still works in memory */
  }
}

/** The newest saved review, after deleting imported reviews older than the retention window. */
export async function latestSession(): Promise<SessionData | undefined> {
  try {
    const all = await db.sessions.toArray();
    const expired = all.filter((x) => x.kind === 'import' && Date.now() - (x.updatedAt ?? Date.parse(x.createdAt)) > IMPORT_RETENTION_MS);
    if (expired.length) await db.sessions.bulkDelete(expired.map((x) => x.id));
    return all.filter((x) => !expired.includes(x)).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1);
  } catch {
    return undefined;
  }
}

/** Removes every saved review from this browser (the end-of-case action on a shared PC). Returns how many are left. */
export async function clearAllSessions(): Promise<number> {
  try {
    await db.sessions.clear();
    return await db.sessions.count();
  } catch {
    return -1;
  }
}

export async function deleteSession(id: string): Promise<void> {
  try {
    await db.sessions.delete(id);
  } catch {
    /* ignore */
  }
}
