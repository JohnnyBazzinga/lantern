import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cloudAllowed } from '../ai/cloudPayload';
import { checkLocalAvailability, type LocalAvailability } from '../ai/capability';
import { loadConfig, type LanternConfig } from '../firebase/remoteConfig';
import { escalations, propose, type EscalationReason, type ReviewGroup } from '../core/reconcile';
import type { CanonicalField } from '../core/fields';
import type { Act, AuditEvent, Disposition, SourceFile } from '../core/types';
import { loadDrillFiles, importUserFile } from './files';
import { askSecondOpinion, mapFile, reconcileFiles, secondOpinionPreview, type Progress } from './pipeline';
import { buildItems, isDecided, suggested, type ReviewItem } from './review';
import { deleteSession, latestSession, saveSession, type SessionData } from './store';

type Busy = { stage: string; done: number; total: number } | null;

interface SessionApi {
  session: SessionData | null;
  config: LanternConfig | null;
  local: LocalAvailability | 'checking';
  busy: Busy;
  error: string | null;
  items: ReviewItem[];
  actsById: Map<string, Act>;
  decidedCount: number;
  escalated: Map<string, EscalationReason[]>;
  cloudEligible: boolean;
  resumable: SessionData | null;
  refreshLocal: () => Promise<void>;
  startDrill: () => Promise<void>;
  startImport: (files: { census?: File; earlier: File; later: File }) => Promise<void>;
  resume: () => void;
  setField: (fileId: string, col: number, field: CanonicalField) => void;
  compare: () => Promise<void>;
  previewCloud: () => { candidateId: string; reasons: string[]; prompt: string }[];
  askCloud: () => Promise<void>;
  decide: (item: ReviewItem, d: Record<string, Disposition>, action: string) => void;
  decideIdentity: (issueId: string, choice: 'census' | 'as-written' | 'ask') => void;
  acceptGroup: (group: ReviewGroup) => void;
  toggleEntered: (actId: string) => void;
  finish: () => void;
  reset: () => Promise<void>;
}

const Ctx = createContext<SessionApi | null>(null);

export function useSession(): SessionApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}

const now = () => new Date().toISOString();

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [resumable, setResumable] = useState<SessionData | null>(null);
  const [config, setConfig] = useState<LanternConfig | null>(null);
  const [local, setLocal] = useState<LocalAvailability | 'checking'>('checking');
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const refreshLocal = useCallback(async () => setLocal(await checkLocalAvailability()), []);

  useEffect(() => {
    void refreshLocal();
    void loadConfig().then(setConfig);
    void latestSession().then((s) => setResumable(s && s.acts.length ? s : null));
  }, [refreshLocal]);

  // persist every change
  useEffect(() => {
    if (session) void saveSession(session);
  }, [session]);

  const progress: Progress = useCallback((p) => setBusy(p), []);
  const cloudModel = config?.cloudModel ?? 'gemini-3.8-flash';

  const audit = (s: SessionData, action: string, targetIds: string[], extra: Partial<AuditEvent> = {}): AuditEvent[] => [
    ...s.audit,
    { seq: ++seq.current, at: now(), actor: 'reviewer', action, targetIds, ...extra },
  ];

  const begin = async (kind: SessionData['kind'], files: SourceFile[]) => {
    setError(null);
    const mapped: SourceFile[] = [];
    for (const f of files) mapped.push({ ...f, mapping: await mapFile(f, cloudModel, progress) });
    setBusy(null);
    setSession({
      id: crypto.randomUUID(),
      kind,
      title: kind === 'drill' ? 'Ward 7B drill' : 'Imported files',
      createdAt: now(),
      startedAt: Date.now(),
      files: mapped,
      acts: [],
      earlierIds: [],
      laterIds: [],
      candidates: [],
      escalated: [],
      identity: [],
      proposals: [],
      decisions: {},
      identityDecisions: {},
      audit: [{ seq: ++seq.current, at: now(), actor: 'lantern', action: `opened ${files.map((f) => f.name).join(', ')}`, targetIds: [] }],
      cloudAsked: false,
      entered: {},
    });
  };

  const startDrill = async () => {
    try {
      setBusy({ stage: 'Opening the Ward 7B drill', done: 0, total: 1 });
      await begin('drill', await loadDrillFiles());
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const startImport = async (f: { census?: File; earlier: File; later: File }) => {
    try {
      setBusy({ stage: 'Reading your files on this device', done: 0, total: 1 });
      const files = [
        ...(f.census ? [await importUserFile(f.census, 'census', 'census')] : []),
        await importUserFile(f.earlier, 'v1', 'log'),
        await importUserFile(f.later, 'v2', 'log'),
      ];
      await begin('import', files);
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const setField = (fileId: string, col: number, field: CanonicalField) =>
    setSession((s) =>
      s && {
        ...s,
        files: s.files.map((f) =>
          f.id !== fileId ? f : { ...f, mapping: f.mapping.map((c) => (c.index === col ? { ...c, field, needsReview: false, basis: 'rule' as const, reason: 'set by reviewer' } : c)) },
        ),
        audit: audit(s, `mapped column ${col + 1} of ${fileId} to ${field}`, [fileId]),
      },
    );

  const compare = async () => {
    if (!session) return;
    try {
      setError(null);
      const census = session.files.find((f) => f.role === 'census') ?? null;
      const [earlier, later] = session.files.filter((f) => f.role === 'log');
      if (!earlier || !later) throw new Error('Two versions of the log are needed.');
      const r = await reconcileFiles({ census, earlier, later, cloudModel, secondOpinion: false, onProgress: progress });
      setBusy(null);
      setSession({
        ...session,
        acts: r.acts,
        earlierIds: r.earlier.map((a) => a.id),
        laterIds: r.later.map((a) => a.id),
        candidates: r.candidates,
        escalated: [...r.escalated.entries()],
        identity: r.identity,
        proposals: r.proposals,
        startedAt: Date.now(),
        audit: [...session.audit, { seq: ++seq.current, at: now(), actor: 'lantern', action: `compared ${r.acts.length} rows on this device`, targetIds: [] }],
      });
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const actsById = useMemo(() => new Map((session?.acts ?? []).map((a) => [a.id, a])), [session?.acts]);
  const escalated = useMemo(() => new Map(session?.escalated ?? []) as Map<string, EscalationReason[]>, [session?.escalated]);
  const cloudEligible = !!session && session.files.every(cloudAllowed) && (config?.cloudSecondOpinionEnabled ?? true);

  const previewCloud = () => (session ? secondOpinionPreview(session.acts, session.candidates, escalated) : []);

  const askCloud = async () => {
    if (!session || !cloudEligible) return;
    try {
      setError(null);
      const candidates = session.candidates.map((c) => ({ ...c }));
      const n = await askSecondOpinion({ files: session.files, acts: session.acts, candidates, escalated, cloudModel, onProgress: progress });
      setBusy(null);
      const earlier = session.acts.filter((a) => session.earlierIds.includes(a.id));
      const later = session.acts.filter((a) => session.laterIds.includes(a.id));
      const proposals = propose({ earlier, later, candidates, identity: session.identity });
      setSession({
        ...session,
        candidates,
        proposals,
        escalated: [...escalations(candidates, actsById).entries()],
        cloudAsked: true,
        audit: [...session.audit, { seq: ++seq.current, at: now(), actor: 'lantern', action: `cloud second opinion on ${n} disputed pairs (synthetic drill data)`, targetIds: [] }],
      });
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const items = useMemo(() => (session ? buildItems(session.acts, session.proposals, session.identity) : []), [session]);

  const decide = (item: ReviewItem, d: Record<string, Disposition>, action: string) =>
    setSession((s) => s && { ...s, decisions: { ...s.decisions, ...d }, audit: audit(s, action, item.actIds, { after: d }) });

  const decideIdentity = (issueId: string, choice: 'census' | 'as-written' | 'ask') =>
    setSession((s) => {
      if (!s) return s;
      const issue = s.identity.find((i) => i.id === issueId);
      const decisions = { ...s.decisions };
      if (choice === 'ask' && issue)
        for (const id of issue.actIds) {
          const act = s.acts.find((a) => a.id === id);
          decisions[id] = { kind: 'unresolved', owner: act?.documentedBy ? `documenting clinician (${act.documentedBy})` : 'nurse in charge', question: issue.detail };
        }
      return { ...s, decisions, identityDecisions: { ...s.identityDecisions, [issueId]: choice }, audit: audit(s, `identity ${choice}: ${issue?.detail ?? issueId}`, issue?.actIds ?? []) };
    });

  const acceptGroup = (group: ReviewGroup) =>
    setSession((s) => {
      if (!s) return s;
      const todo = items.filter((i) => i.group === group && !isDecided(i, s.decisions));
      const d = Object.assign({}, ...todo.map(suggested)) as Record<string, Disposition>;
      return { ...s, decisions: { ...s.decisions, ...d }, audit: audit(s, `accepted Lantern's suggestion for ${todo.length} items in “${group}”`, todo.flatMap((i) => i.actIds)) };
    });

  const toggleEntered = (actId: string) => setSession((s) => s && { ...s, entered: { ...s.entered, [actId]: !s.entered[actId] } });
  const finish = () => setSession((s) => s && { ...s, finishedAt: s.finishedAt ?? Date.now(), audit: audit(s, 'prepared the re-entry worklist', []) });
  const resume = () => {
    if (resumable) setSession(resumable);
  };
  const reset = async () => {
    if (session) await deleteSession(session.id);
    setSession(null);
    setResumable(null);
  };

  const decidedCount = session ? session.acts.filter((a) => session.decisions[a.id]).length : 0;

  const api: SessionApi = {
    session,
    config,
    local,
    busy,
    error,
    items,
    actsById,
    decidedCount,
    escalated,
    cloudEligible,
    resumable,
    refreshLocal,
    startDrill,
    startImport,
    resume,
    setField,
    compare,
    previewCloud,
    askCloud,
    decide,
    decideIdentity,
    acceptGroup,
    toggleEntered,
    finish,
    reset,
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
