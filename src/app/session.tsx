import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cloudAllowed } from '../ai/cloudPayload';
import { checkLocalAvailability, type LocalAvailability } from '../ai/capability';
import { loadConfig, RC_DEFAULTS, type LanternConfig } from '../firebase/remoteConfig';
import { escalations, propose, type EscalationReason, type ReviewGroup } from '../core/reconcile';
import type { CanonicalField } from '../core/fields';
import type { Act, AuditEvent, Disposition, SourceFile } from '../core/types';
import { loadDrillFiles, importUserFile } from './files';
import { askSecondOpinion, mapFile, reconcileFiles, secondOpinionPreview, type Progress } from './pipeline';
import { buildItems, groupCopy, isDecided, suggested, type ReviewItem } from './review';
import { clearAllSessions, latestSession, saveSession, type SessionData } from './store';
import { ownerOf } from '../core/clinical';
import { identityQuestion } from '../core/questions';
import { ct } from '../core/i18n';
import { defaultNightOf } from '../core/worklist';
import { identityDetail } from '../core/identity';
import { msgs, tr } from '../i18n/lang';
import { useLang } from '../i18n/react';

/** Progress stages, errors and audit-trail wording. The audit trail is written in the language in use at the time. */
const M = msgs(
  {
    drillTitle: 'Ward 7B drill',
    importTitle: 'Imported files',
    openingDrill: 'Opening the Ward 7B drill',
    readingFiles: 'Reading your files on this device',
    twoVersions: 'Two versions of the log are needed.',
    opened: (names: string) => `opened ${names}`,
    mapped: (col: number, file: string, field: string) => `mapped column ${col} of ${file} to ${field}`,
    compared: (n: number) => `compared ${n} rows on this device`,
    cloud: (n: number) => `cloud second opinion on ${n} disputed pairs (synthetic drill data)`,
    identity: { census: 'use the census identity', 'as-written': 'keep as written', ask: 'ask the nurse' } as Record<'census' | 'as-written' | 'ask', string>,
    identityAction: (choice: string, detail: string) => `patient identity, ${choice}: ${detail}`,
    accepted: (n: number, group: string) => `accepted Lantern's suggestion for ${n} items in “${group}”`,
    ticked: 'ticked as entered in the record',
    unticked: 'unticked',
    answer: (text: string) => `recorded the nurse's answer: ${text}`,
    night: (date: string) => `set the night of the outage to ${date}`,
    prepared: 'prepared the re-entry worklist',
  },
  {
    drillTitle: 'Simulacro da enfermaria 7B',
    importTitle: 'Ficheiros importados',
    openingDrill: 'A abrir o simulacro da enfermaria 7B',
    readingFiles: 'A ler os seus ficheiros neste computador',
    twoVersions: 'São precisas duas versões da folha.',
    opened: (names) => `abriu ${names}`,
    mapped: (col, file, field) => `associou a coluna ${col} de ${file} a “${field}”`,
    compared: (n) => `comparou ${n} linhas neste computador`,
    cloud: (n) => `segunda opinião na nuvem sobre ${n} comparações em dúvida (dados fictícios do simulacro)`,
    identity: { census: 'usar a identidade da lista de doentes', 'as-written': 'manter como está escrito', ask: 'perguntar à enfermagem' },
    identityAction: (choice, detail) => `identidade do doente, ${choice}: ${detail}`,
    accepted: (n, group) => `aceitou a sugestão do Lantern para ${n} itens em “${group}”`,
    ticked: 'marcou como registado no sistema',
    unticked: 'desmarcou',
    answer: (text) => `registou a resposta da enfermagem: ${text}`,
    night: (date) => `definiu a noite da falha: ${date}`,
    prepared: 'preparou a lista para registo',
  },
);

/** The session's name for people, in the current interface language. */
export const sessionTitle = (kind: SessionData['kind']) => (kind === 'drill' ? tr(M).drillTitle : tr(M).importTitle);

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
  recordAnswer: (ref: string, text: string) => void;
  setNightOf: (date: string) => void;
  setReviewer: (initials: string) => void;
  finish: () => void;
  /** deletes every saved review in this browser; resolves to how many remain (0 = verified) */
  reset: () => Promise<number>;
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
  const lang = useLang();

  const refreshLocal = useCallback(async () => setLocal(await checkLocalAvailability()), []);

  useEffect(() => {
    void refreshLocal();
    void loadConfig().then(setConfig);
    void latestSession().then((s) => setResumable(s && s.acts.length ? s : null));
  }, [refreshLocal]);

  // persist every change, unless hospital IT has turned off saving imported (patient) reviews to disk
  useEffect(() => {
    if (!session) return;
    if (session.kind === 'import' && config && !config.persistImportedReviews) return;
    void saveSession({ ...session, updatedAt: Date.now() });
  }, [session, config]);

  const progress: Progress = useCallback((p) => setBusy(p), []);
  const cloudModel = config?.cloudModel ?? RC_DEFAULTS.cloud_model;

  const audit = (s: SessionData, action: string, targetIds: string[], extra: Partial<AuditEvent> = {}): AuditEvent[] => [
    ...s.audit,
    { seq: ++seq.current, at: now(), actor: s.reviewer ? `reviewer ${s.reviewer}` : 'reviewer', action, targetIds, ...extra },
  ];

  const begin = async (kind: SessionData['kind'], files: SourceFile[]) => {
    setError(null);
    const mapped: SourceFile[] = [];
    for (const f of files) mapped.push({ ...f, mapping: await mapFile(f, cloudModel, progress) });
    setBusy(null);
    setSession({
      id: crypto.randomUUID(),
      kind,
      title: sessionTitle(kind),
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
      audit: [{ seq: ++seq.current, at: now(), actor: 'lantern', action: tr(M).opened(files.map((f) => f.name).join(', ')), targetIds: [] }],
      cloudAsked: false,
      entered: {},
      nightOf: defaultNightOf(Date.now()),
      answers: {},
    });
  };

  const startDrill = async () => {
    try {
      setBusy({ stage: tr(M).openingDrill, done: 0, total: 1 });
      await begin('drill', await loadDrillFiles());
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const startImport = async (f: { census?: File; earlier: File; later: File }) => {
    try {
      setBusy({ stage: tr(M).readingFiles, done: 0, total: 1 });
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
          f.id !== fileId
            ? f
            : { ...f, mapping: f.mapping.map((c) => (c.index === col ? { ...c, field, needsReview: false, basis: 'rule' as const, why: { k: 'reviewer' as const }, reason: ct().mapping.byReviewer } : c)) },
        ),
        audit: audit(s, tr(M).mapped(col + 1, s.files.find((f) => f.id === fileId)?.name ?? fileId, ct().fieldLabel[field]), [fileId]),
      },
    );

  const compare = async () => {
    if (!session) return;
    try {
      setError(null);
      const census = session.files.find((f) => f.role === 'census') ?? null;
      const [earlier, later] = session.files.filter((f) => f.role === 'log');
      if (!earlier || !later) throw new Error(tr(M).twoVersions);
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
        audit: [...session.audit, { seq: ++seq.current, at: now(), actor: 'lantern', action: tr(M).compared(r.acts.length), targetIds: [] }],
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
        audit: [...session.audit, { seq: ++seq.current, at: now(), actor: 'lantern', action: tr(M).cloud(n), targetIds: [] }],
      });
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // Proposals are a pure function of the rows, the judgments and the identity checks, so they are rebuilt
  // here rather than read from storage: their reasons and questions then follow the interface language.
  const proposals = useMemo(() => {
    if (!session?.acts.length) return [];
    const earlier = new Set(session.earlierIds);
    const later = new Set(session.laterIds);
    return propose({
      earlier: session.acts.filter((a) => earlier.has(a.id)),
      later: session.acts.filter((a) => later.has(a.id)),
      candidates: session.candidates,
      identity: session.identity,
    });
    // `lang` is a dependency on purpose: it changes the wording, not the decisions
  }, [session?.acts, session?.candidates, session?.identity, session?.earlierIds, session?.laterIds, lang]);
  const items = useMemo(() => (session ? buildItems(session.acts, proposals, session.identity) : []), [session, proposals]);

  const decide = (item: ReviewItem, d: Record<string, Disposition>, action: string) =>
    setSession((s) => s && { ...s, decisions: { ...s.decisions, ...d }, audit: audit(s, action, item.actIds, { after: d }) });

  const decideIdentity = (issueId: string, choice: 'census' | 'as-written' | 'ask') =>
    setSession((s) => {
      if (!s) return s;
      const issue = s.identity.find((i) => i.id === issueId);
      const decisions = { ...s.decisions };
      // settling the identity releases the rows that were waiting for it: they go back to the reviewer
      if (choice !== 'ask')
        for (const [id, d] of Object.entries(decisions)) if (d.kind === 'unresolved' && d.ref === `identity:${issueId}`) delete decisions[id];
      // the identity question travels with every row of the issue, and blocks them until it is answered
      if (choice === 'ask' && issue)
        for (const id of issue.actIds) {
          const act = s.acts.find((a) => a.id === id);
          if (act) decisions[id] = { kind: 'unresolved', owner: ownerOf(act), question: identityQuestion(issue, act), ref: `identity:${issue.id}` };
        }
      return {
        ...s,
        decisions,
        identityDecisions: { ...s.identityDecisions, [issueId]: choice },
        audit: audit(s, tr(M).identityAction(tr(M).identity[choice], issue ? identityDetail(issue) : issueId), issue?.actIds ?? []),
      };
    });

  const acceptGroup = (group: ReviewGroup) =>
    setSession((s) => {
      if (!s) return s;
      const todo = items.filter((i) => i.group === group && !isDecided(i, s.decisions));
      const d = Object.assign({}, ...todo.map(suggested)) as Record<string, Disposition>;
      return { ...s, decisions: { ...s.decisions, ...d }, audit: audit(s, tr(M).accepted(todo.length, groupCopy(group).title), todo.flatMap((i) => i.actIds)) };
    });

  const toggleEntered = (actId: string) =>
    setSession((s) => {
      if (!s) return s;
      const entered = { ...s.entered };
      if (entered[actId]) delete entered[actId];
      else entered[actId] = { at: now(), ...(s.reviewer && { by: s.reviewer }) };
      return { ...s, entered, audit: audit(s, entered[actId] ? tr(M).ticked : tr(M).unticked, [actId]) };
    });
  const recordAnswer = (ref: string, text: string) =>
    setSession((s) => s && { ...s, answers: { ...s.answers, [ref]: { text, at: now(), ...(s.reviewer && { recordedBy: s.reviewer }) } }, audit: audit(s, tr(M).answer(text), [ref]) });
  const setNightOf = (date: string) => setSession((s) => s && { ...s, nightOf: date, audit: audit(s, tr(M).night(date), []) });
  const setReviewer = (initials: string) => setSession((s) => s && { ...s, reviewer: initials.trim().toUpperCase().slice(0, 6) || undefined });
  const finish = () => setSession((s) => s && { ...s, finishedAt: s.finishedAt ?? Date.now(), audit: audit(s, tr(M).prepared, []) });
  const resume = () => {
    if (resumable) setSession(resumable);
  };
  const reset = async () => {
    setSession(null);
    setResumable(null);
    return clearAllSessions();
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
    recordAnswer,
    setNightOf,
    setReviewer,
    finish,
    reset,
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
