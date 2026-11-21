import Dexie, { type Table } from 'dexie';
import type { Proposal } from '../core/reconcile';
import type { Act, AuditEvent, Disposition, IdentityIssue, MatchCandidate, SourceFile } from '../core/types';

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
  /** re-entry progress on the worklist (ticked by the reviewer as items are typed into the EHR) */
  entered: Record<string, boolean>;
}

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

export async function latestSession(): Promise<SessionData | undefined> {
  try {
    return await db.sessions.orderBy('createdAt').last();
  } catch {
    return undefined;
  }
}

export async function deleteSession(id: string): Promise<void> {
  try {
    await db.sessions.delete(id);
  } catch {
    /* ignore */
  }
}
