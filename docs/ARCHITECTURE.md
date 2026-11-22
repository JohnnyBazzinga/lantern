# Architecture

Lantern is a static web app: React, Vite, a service worker for offline reload, and IndexedDB for sessions. It has no backend of its own. The only server-side pieces are Firebase services: Hosting, AI Logic (with App Check enforced) and Remote Config. All decisions are made in the browser, and the models are advisers inside a deterministic pipeline.

## Pipeline

```
 files (CSV/XLSX)                                  census (optional)
      │                                                  │
 parse ── profile values ── map columns ── build acts ── resolve identity
                              (Nano + rules)                 │
                                                  find candidate pairs
                                                             │
                     exact copy? ──yes──────────────────────►│
                         │no                                 │
                 "same act?" (Nano, or cloud fallback)       │
                         │                                   │
                  deterministic guard ── escalate? ── cloud second opinion
                         │                 (drill only)      │
                         └──────────► proposals ◄────────────┘
                                          │
                               review (Rita decides) ── worklist (CSV / print)
```

| Step | Code | What happens |
|---|---|---|
| Parse | `src/core/parse.ts` | SheetJS with `raw: true`, so "0005" and "22:15" stay as typed. Each value keeps its cell reference. The file's SHA-256 is computed from its bytes. |
| Profile | `src/core/profile.ts` | For each column, the share of values that look like a hospital ID, name + ID, person name, clock time, initials, yes/no, bed number or free text. A shape at ≥ 0.7 suggests a field. For free text, a small header lexicon decides between `act` and `notes`. |
| Map columns | `src/app/pipeline.ts` `mapFile`, `src/core/mapping.ts` | Adaptive: one whole-table prompt, then a per-column prompt only for columns where the model and the value shapes disagree. Reconciliation rules: agreement is accepted; a shape ≥ 0.9 overrides the header reading but is flagged; a name-only column read as "patient" becomes `patient_name`; a unique field (bed, patient, time, documented by) keeps its best-supported column. Without a model, clear shapes are used and the rest is left for the reviewer. |
| Build acts | `src/core/acts.ts` | Deterministic. Values stay as written, each with its cell as evidence. Night times are put in order across midnight. |
| Identity | `src/core/identity.ts` | Checked against the census before any model sees a row. Kinds: `name-variant`, `id-mismatch` (with a transposed-digits hint), `id-name-conflict`, `not-in-census` and `no-identity` (bed only). Lantern never attributes an act by bed number alone. |
| Candidates | `src/core/candidates.ts` | Exact copies are matched by resolved patient + time + normalised text. Other pairs are only formed within the same resolved patient, by text similarity (≥ 0.12, or the same time), with a time bonus or penalty and at most 2 per row. |
| Pair judgment | `src/ai/prompts/v1/sameEvent.ts` (v3) | A narrow question: are both rows the same clinical act, written twice? The answer is `yes`/`no`/`unsure` plus evidence of at most 12 words. Only the clinical text is sent, never times, because time is handled by the guard. |
| Guard | `src/core/reconcile.ts` `guard` | Applied to every verdict, local or cloud (see below). |
| Escalation | `src/core/reconcile.ts` `escalations` | Triggered by observable conditions, never by the model's self-reported confidence: `abstained`, `competing-match`, `numbers-differ`, `local-unavailable` and `rule-override`. |
| Second opinion | `src/ai/prompts/v1/secondOpinion.ts` | Cloud, drill only. It gets the pair plus the patient's other rows in both versions, and is not told what Nano concluded. |
| Proposals | `src/core/reconcile.ts` `propose` | Every row gets a disposition (`approved`, `corrected`, `duplicate`, `unresolved` with an owner, or `excluded`) and a reason in plain words. What changed in a correction is computed from the cells, not taken from the model. |
| Review and worklist | `src/app/review.ts`, `src/core/worklist.ts` | The review groups are identity, open, changed, likely-same, only-earlier, only-later and copies. The worklist lists each act once, gives corrections with old value, new value and basis, and lists the open questions with their owners. "Ready for re-entry" is not "entered": Lantern never writes to a record system. |

## Hybrid contract

| Executor | Jobs |
|---|---|
| Deterministic code | Parsing, value profiles, exact copies, patient identity, candidate pairs, guard rules, error-prone abbreviations, dispositions, audit trail, scoring, export. |
| Gemini Nano (Chrome Prompt API via AI Logic) | Column mapping (whole table, then disputed columns) and "same act?" pair judgments. The Lab also measures field extraction with a verbatim-source check, but the product does not use it. |
| Cloud Gemini (AI Logic, Gemini Developer API) | An independent second opinion on escalated pairs of the synthetic drill, and the automatic fallback for the drill on machines without Gemini Nano. |

The routes are fixed by `routeFor()` in `src/app/pipeline.ts`. If every file is a registered bundled fixture, the route is `drill-hybrid` (`PREFER_ON_DEVICE`). Otherwise it is `user-local` (`ONLY_ON_DEVICE`). The second opinion always uses `cloud` (`ONLY_IN_CLOUD`) and calls `assertCloudAllowed()` first. `runTask()` refuses a `cloud` call whose data origin is `user-import`, as a second check.

### Known SDK issue and the capability guard

In firebase 13.4.0, when `LanguageModel` is undefined, the SDK creates no Chrome adapter, and an `ONLY_ON_DEVICE` request goes to the cloud (firebase-js-sdk issue #10635). For imported data that would be a silent leak. Before every `user-local` call, Lantern therefore runs `assertLocalReady()` (`src/ai/capability.ts`): the Prompt API must exist and `LanguageModel.availability()` must return `available`, with the same core options the sessions use (text, English). If not, the call is recorded as `blocked` in the ledger and nothing is sent.

On-device sessions ignore `inCloudParams`, so each task's system prompt travels in `onDeviceParams.createOptions.initialPrompts`. The JSON schema is used twice: as Chrome's `responseConstraint` and as the cloud `responseJsonSchema`.

## Guard rules (`src/core/reconcile.ts`)

| Rule | Condition | Result |
|---|---|---|
| Documented correction | The verdict is `separate` or `insufficient`, but the later row has a correction note, was recorded within 30 min, and has text similarity ≥ 0.3 | `amendment` |
| Repeated act | The verdict is `same` or `amendment`, but the rows were recorded more than 30 min apart and there is no correction note | `separate` (for example, a second PRN dose) |
| Undocumented "correction" | The verdict is `amendment`, with no correction note | `same` (a re-typed copy) |
| Correction under "same" | The verdict is `same`, and the later row has a correction note | `amendment` |

A correction note is a word such as "corrected", "corr.", "amended", "error", "mistake", "wrong", "not given", "was not", "instead of", "should be", "actually" or "by mistake", or its Portuguese equivalent ("corrigido", "correção", "por engano", "não administrada", "em vez de", "deve ler-se", "afinal", "anulado"). Exact copies must match in patient, time, act **and comments**, so a correction written only in the comments column is never taken for a copy. Error-prone abbreviations (an ISMP subset: `MS`, `MSO4`, `MgSO4`, `U` for units, `IU`, `QD`/`QOD`, trailing zero, naked decimal) always become open questions for the documenting clinician, whatever any model says.

**Same medicine, same patient** (`src/core/drugs.ts`). A lexicon of common ward medicines, in English and Portuguese with brand names, lets the review show every row that names the same medicine for the same patient, across both files, earliest first, with each row's current decision. A row written with an error-prone abbreviation (`MS 10mg`) appears next to each medicine it may stand for, marked as uncertain and never interpreted. For opioids kept in a controlled-drug register, the review and the worklist remind whoever enters the dose to check it against the ward register first.

## Retries and timeouts (`src/ai/models.ts`)

- **Cloud:** each request times out after 45 s (the SDK default is 180 s).
  - A 429 or 5xx error, or a quota or overload message, is retried once on the same model after 1.5 s. The next try uses `cloud_fallback_model` from Remote Config.
  - After a timeout, the remaining tries on that model are skipped.
- **A network that drops Google's requests** (some hospital firewalls do) must not leave the drill waiting forever. Found with a test that never answers any Google request: the drill used to stop at "Reading the columns" indefinitely; it now reaches the review in about 16 s on its rules.
  - The Remote Config fetch, Firebase Installations included, is bounded at 5 s; past that the last activated configuration applies (`src/firebase/remoteConfig.ts`).
  - Before the first call of a page that will go to the cloud, Lantern asks App Check for a token, bounded at 10 s. The SDK's request timeout does not cover the reCAPTCHA step before it.
  - Every attempt that may reach the cloud has a hard deadline of 50 s.
  - Once the cloud is found unreachable, it is not tried again for 2 minutes: the remaining calls fail at once, each with its own ledger entry, and Lantern's rules decide. A failed second opinion can be retried from the review.
- **On device:** each call gets its own 45 s deadline. The SDK keeps the `onDeviceParams` object Lantern passes in and hands `promptOptions` to Chrome's `session.prompt()` on every call, so Lantern sets `promptOptions.signal` just before each call.
  - A stalled call, or an answer that fails schema validation, is retried once on a fresh session.
  - The reason: in two drill runs, constrained decoding looped inside an unbounded free-text field for about 6 minutes (see [EVALUATION.md](EVALUATION.md)).
- Every failed attempt is its own ledger entry, and a successful retry carries a note ("after 1 failed attempt").

When a pair still gets no verdict, nothing is lost. It is escalated as `local-unavailable` and shown to the reviewer side by side, with no suggested option.

## State, offline, configuration

- **Sessions:** Dexie database `lantern` (`src/app/store.ts`). Files, acts, candidates, proposals, decisions and the audit trail stay in this browser and are never synced.
- **Offline:** vite-plugin-pwa precaches the app shell, the bundled fonts and the drill fixtures. When a new service worker takes over, the page reloads once, so nobody keeps running an old build.
- **App Check:** `ReCaptchaEnterpriseProvider` with `isTokenAutoRefreshEnabled: false` and `useLimitedUseAppCheckTokens: true`. A token is fetched per cloud call, never for on-device work.
- **Remote Config:** fetched once per page load, with a 10-minute minimum interval and a 4 s timeout. The last activated values come from IndexedDB, and the in-code defaults apply when nothing has been fetched yet.
- **Network watcher** (`src/ai/netwatch.ts`): a `fetch` wrapper plus a Resource Timing observer. It records requests to Google endpoints during each call, so the ledger reports the measured number of inference requests rather than a claim.

## Languages (`src/i18n/`, `src/core/i18n.ts`)

- The interface language is plain module state (`getLang()`), chosen by `?lang=`, then the saved choice, then the browser language. Screens subscribe with `useT()`; core modules read the language when they write a sentence.
- Every message set is a pair `msgs(en, pt)`. The Portuguese set must have the same shape as the English one, so a missing translation is a type error.
- Clinical wording (questions for the nurse, late-entry notes, rule reasons, identity problems, column readings, the CSV) lives in one file, `src/core/i18n.ts`, so the same term is used on screen, on paper and in the CSV.
- Text derived from data is rebuilt in the current language rather than stored: proposals are recomputed from candidates and identity checks, identity problems keep their facts (`IdentityIssue.facts`), and column readings keep their reason as data (`FinalColumn.why`). Decisions, questions already asked and the audit trail keep the words used at the time, as a record should.
- Rows, prompts and model evidence are never translated.
