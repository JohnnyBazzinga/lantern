# Simulated usability study and role research (2026-11-21)

**What this is:** a formative walkthrough with **LLM-simulated participants**, run before any real user could be
recruited, plus two desk-research reviews. It produces hypotheses and a defect list, not usability evidence.
Synthetic users "cannot produce behavioral data" ([NN/g](https://www.nngroup.com/articles/synthetic-users/)), tend
to be favourable and vague, and in published comparisons found a fraction of what experts or real users find
([arXiv 2506.16345](https://arxiv.org/abs/2506.16345), [arXiv 2601.17087](https://arxiv.org/abs/2601.17087)). The
mitigations used here: two different model families, task-based logs instead of opinions, an instruction to be
blunt, independent research to check every claim, and fixes only where findings converge. The next step is 3–5 real
clinical secretaries and nurses.

## Method

- **Product under test:** https://lantern-downtime.web.app, build `109ef16`, in a headless Chromium at 1366×768 (a
  typical shared ward PC). The test browser had no Gemini Nano, so the drill's AI ran in the cloud on fictional data,
  and the "own files" task ran with no model at all. That is the likeliest situation on many real ward PCs.
- **Harness:** each participant drove its own browser through a small command-line tool that acts on the page and
  prints its accessibility tree ([harness-b.mjs](usability-2026-11-21/harness-b.mjs)). Every action was logged with a
  timestamp. Participants were forbidden to read the source code.
- **Protocol:** one scenario and eight tasks, from the first impression to "your own files", then a self-interview, SEQ
  per task, SUS and a verdict ([PROTOCOL.md](usability-2026-11-21/PROTOCOL.md)).

| ID | Persona | Model | Actions | Report |
|---|---|---|---|---|
| P1 | Rita, 52, clinical secretary in a Portuguese SNS hospital, basic Excel, prefers Portuguese | Codex (`gpt-6.2-astra`, high) | 64 | [p1-rita.md](usability-2026-11-21/p1-rita.md) |
| P2 | Dave, 38, ward clerk in an NHS trust, has lived a 2-day EPR outage | Claude agent | 62 | [p2-dave.md](usability-2026-11-21/p2-dave.md) |
| P3 | Inês, 41, nurse in charge of the night team, checking the secretary's work | Claude agent | 65 | [p3-ines.md](usability-2026-11-21/p3-ines.md) |
| P4 | Miguel, 45, head of information security, decides what runs on ward PCs | Codex (`gpt-6.2-astra`, high) | 88 | [p4-miguel.md](usability-2026-11-21/p4-miguel.md) |
| R1 | Desk research: who re-enters what after downtime (PT, UK, US) | Claude agent | — | [research-roles.md](usability-2026-11-21/research-roles.md) |
| R2 | Desk research: adoption constraints, and the validity of simulated users | Claude agent | — | [research-adoption.md](usability-2026-11-21/research-adoption.md) |

## Results before the fixes

| | P1 Rita | P2 Dave | P3 Inês | P4 Miguel |
|---|---|---|---|---|
| Drill (T1–T7) | all done | all done, 4 suggestions overridden | all done, 2 overridden | all done |
| Own files, no model (T8) | stopped at 4/50 | stopped at 29/50 ("no longer trusted it") | stopped at 4/50 | rejected |
| SUS (simulated, indicative only) | 32.5 | 57.5 | 57.5 | 42.5 |
| Verdict | would use if… | would use if… | would use if… | would not use; reject the pilot |

What all four valued: rows lost when the sheet was sorted are recovered (the fall and the GCS that followed),
transposed hospital numbers are caught, "do not attribute by bed", "MS" is never interpreted, and every act links
back to its cell.

## Findings, consolidated

Severity is the highest any participant gave (0–4). "Found by" counts independent reports.

| # | Finding | Found by | Sev. | Status |
|---|---|---|---|---|
| F1 | With no model, documented corrections ("NOT given, pt refused", "corr.") were filed as "typed twice", and "keep one" kept the uncorrected row. A refused anticoagulant reached the list as given. | P1 P2 P3 P4 | 4 | **Fixed:** the rules decide on their own (`ruleVerdict`); test added |
| F2 | With no model, two morphine doses 3 h 15 apart were offered as "typed twice" | P1 P2 | 4 | **Fixed:** separated by the time rule without a model |
| F3 | "Start over" deleted only the current review: an earlier imported review could be resumed by the next user of the browser profile | P4 | 4 | **Fixed:** clear deletes every review; imported reviews expire 12 h after the last change; "Finish and clear this PC" |
| F4 | A patient-identity question did not block the act, and the identity conflict was missing from the question | P1 P4 | 4 | **Fixed:** the rows wait for the answer, with the patient question |
| F5 | Questions for the nurse had no patient, bed or time, came once per row (not per problem), asked the wrong thing, and had no way to record the answer | P1 P2 P3 P4 | 4 | **Fixed:** one question per problem, with patient, date and time, both rows, a specific question and an answer field (audited) |
| F6 | Worklist time order broke across midnight, and no row had a date | P1 P2 P3 P4 | 4 | **Fixed:** night-of date, calendar date per act, chronological order |
| F7 | Nothing said who may enter what. The list expected the secretary to apply clinical corrections. | P2 P3 (+R1) | 3 | **Fixed:** split into admissions/transfers for the secretary and late entries per documenting nurse, with late-entry wording |
| F8 | The result counted "ask the nurse" as "acts lost" and called ready acts "entered" | P1 P2 P3 P4 | 3 | **Fixed:** "waiting for a nurse" is separate from "lost"; item-by-item differences; ticks reported separately |
| F9 | "Keep one" did not say which row survives or what it drops (e.g. "RR 24") | P1 P2 P3 | 3 | **Fixed:** buttons name the row; dropped details are shown |
| F10 | "Keep both" sat one click from a double opioid dose. "Keep as written" was offered for "MS 10mg" and for a row with no patient. | P2 P3 | 3 | **Fixed:** confirmation step; those options removed |
| F11 | AI-location labels contradicted each other ("On this device" notes, a header that said 0 on device, unexplained "error") | P1 P2 P3 P4 | 3 | **Fixed:** each note is labelled by where it actually ran; failed and blocked calls are explained |
| F12 | No visible audit trail; ticks did not record who or when | P2 P3 P4 | 3 | **Fixed:** audit trail viewer and export; ticks record time and initials |
| F13 | A patient CSV lands in Downloads silently, with no DRILL/INCOMPLETE marker | P2 P3 P4 | 3 | **Fixed:** marked file names and a warning; `allow_export` switch for IT in Remote Config |
| F14 | A correction relayed "per X" is treated as the author's own | P3 | 3 | **Fixed:** detected when the initials differ from the row's author; X must confirm |
| F15 | "Logged after the first email" was false for an act timed before it | P2 P3 | 2 | **Fixed:** factual wording |
| F16 | The second-opinion preview promised "no beds", but free text said "moved to bed 6" | P2 P4 | 2 | **Fixed:** the promise now describes what is sent |
| F17 | Nothing said who made the app or where the data-protection statement is | P2 | 2 | **Fixed:** footer links; "not approved for real patients" |
| F18 | An English-only interface for Portuguese staff | P1 P3 (+R2) | 2 | **Fixed** (UI, questions, late-entry notes, CSV in pt-PT; Portuguese lexicons for the rules). Gemini Nano on Portuguese text is still unvalidated |
| F19 | No per-user authentication on a shared PC | P4 | — | **Out of scope:** deploy on individual managed accounts (documented) |
| F20 | A per-patient strip of same-drug doses that night; a reminder to check the controlled-drug register | P3 | 2 | **Fixed (2026-11-22):** every row for the same patient and medicine, across both files, with its status; error-prone abbreviations shown as "may be", never interpreted; a controlled-drug register reminder in the review and on the worklist |
| F21 | The Lab's S2 should say whether it saw a successful block or a successful local inference | P4 | 2 | **Fixed (2026-11-22):** S2 states which one it observed |

After the fixes, the same drill on the hosted site gives 27/27 acts ready, 0 lost, 0 entered twice, 3/3 corrections,
2/2 questions and 4/4 identity problems with the cloud model. With **no model at all** (local build, App Check
blocking the cloud) it gives 0 lost, 0 entered twice, 3/3 corrections and 0 repeated doses merged; the 6 re-typings no
rule can decide go to the nurse as questions instead of becoming duplicates.

## What the research changed

**Who re-enters what (R1).** Every published downtime procedure found has the person who performed the act enter it
afterwards: the nurse for medication given and observations. Clerks handle admissions, transfers, discharges and bed
state. Sources: Milton Keynes University Hospital (UK): "the responsibility of the staff group who would do the
original action"; Stony Brook (US); the Ordem dos Enfermeiros (a record must identify "quem o elabora"); NMC 10.1;
CMS on late entries. Lantern's persona does not change, but her job does: Rita **prepares** the re-entry, enters the
administrative part herself, and hands each nurse a list of late entries with the original time. No public SNS
procedure says who re-enters after an outage. The Ordem dos Médicos asked for "procedimentos seguros de registo e
validação posterior" after the 12 June 2026 outage.

**Adoption constraints (R2):**
- **Hardware.** Gemini Nano needs desktop Chrome with more than 4 GB VRAM, or 16 GB RAM and 4 cores, and 22 GB free disk.
  The SPMS 2024 workstation specification (32 GB, 16+ cores) qualifies; older 8 GB PCs and thin clients (Citrix/VDI) do
  not.
- **Chrome policy.** Hardened Chrome baselines (DISA STIG) disable the on-device model
  (`GenAILocalFoundationalModelSettings`), so IT has to allow it explicitly.
- **Language.** The Prompt API does not accept Portuguese (en, es, ja, de, fr). An estimated 62% of Portuguese adults aged
  25–64 have no foreign language or only a basic one (derived from Eurostat AES 2022).
- **Storage.** Resolução do Conselho de Ministros 41/2018 asks not to keep personal data in the browser beyond the
  session. That is why imported reviews now expire and can be wiped, and why IT can turn persistence off.

## Found while adding the Portuguese interface (2026-11-21)

Running a small Portuguese sheet through the no-model path, as a test, found two defects that also affect English sheets:

- **A correction written only in the comments column passed as an identical copy.** Exact copies were matched on patient,
  time and act text, ignoring comments. "Enoxaparina 40 mg SC" with "NÃO administrada, doente recusou" in the later
  copy's comments was therefore "identical in both files", and "keep one" would have entered the refused dose as given.
  The drill did not catch it because its corrections are written in the act column. **Fixed:** the comments are part of
  an exact copy; a comment-only correction becomes a correction, and its text travels with the act on the worklist.
- **UTF-8 CSV files without a byte-order mark were read as Latin-1** ("João" became "JoÃ£o"), which broke column
  recognition and census matching. **Fixed:** valid UTF-8 is read as UTF-8, anything else as Windows-1252 (Excel's plain
  CSV in Portugal), and semicolon-separated files are read too. Both have tests (`tests/core/i18n.test.ts`,
  `tests/core/parse.test.ts`).

## Still open, in order

1. **Real users.** 3–5 clinical secretaries and nurses, with the same protocol and the same task logs.
2. **Gemini Nano on Portuguese sheets**, which the Prompt API does not officially support. The interface and the rules are
   in Portuguese; until Nano is validated on Portuguese text, it only proposes and the rules carry the safety.
3. A pre-flight page for IT (model availability, disk, policies), extending the Lab.
4. A draft DPIA and a clinical-safety hazard log, for a hospital pilot.
