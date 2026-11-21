# P4 · Lantern usability and governance session

## Persona

I am Miguel Antunes, 45, head of information security at a Portuguese public hospital. I sit on the patient-safety committee and work with our data protection officer (DPO).  
I decide what can run on shared ward PCs. Nursing staff own clinical clarification and authorised staff enter the record. My decisions below were made on fictional data.

## Governance verdict

**Reject a real-patient pilot on our current ward PCs.** Another user of the same browser profile could reopen my imported review after I used **Start over**. On the same machine, a documented refusal of enoxaparin appeared under **Typed twice** with an option to keep one copy. Both S2 checks passed, but both model calls were blocked. I would permit an isolated exercise with fictional data while IT, nursing and the DPO work through the conditions below.

## Tasks

SEQ runs from 1 (very difficult) to 7 (very easy). Command counts include screen reads and waits. I charged each command to one task, even where the same screen answered two questions. The working screens sometimes finished before a wait expired because the heading used different words.

| Task | Outcome | Harness commands used | SEQ | Session note |
|---|---|---|---:|---|
| T1 · First impression | done | 2 · open, click | 6 | I expected source-linked reconciliation for a secretary and nurse, followed by manual re-entry. I trusted it with fiction. For patient files I needed evidence. |
| T2 · Columns and comparison | done | 8 · 4 look, 3 wait, 1 click | 6 | Census, both versions, comments, time and author mapped correctly. I accepted all mappings. The comparison continued while its button was disabled. |
| T3 · Identity | done | 8 · look, 7 clicks | 5 | I used the census spelling once, retained a documented admission, and referred two identities. All four were caught in the result. |
| T4 · Review | done | 18 clicks, including the identical-pair batch | 4 | I reached 50/50 source rows decided. Several pairs needed clinical confirmation. |
| T5 · Questions | done | 1 click to open the worklist | 3 | I found eight question rows for five uncertainties. The list lost the reason for some referrals. |
| T6 · Worklist | done | 4 clicks · CSV and three checkboxes | 6 | The CSV downloaded. I saw the counter progress from 0 to 3 of 24. |
| T7 · Result | done | 1 click | 4 | The answer key showed 24 acts “entered” although only three had been ticked. |
| T8 · Own files | partly | 10 · restart, 3 uploads, open files, 2 looks, compare, select Omar, refer | 4 | All three files opened. I reached manual review and its worklist. I stopped clinical review at the refusal hazard, with 2/50 rows decided. |
| G1 · Privacy claims and S2 | done | 7 · Diagnostics, 2 checkbox clicks, 2 Tab, 2 Enter | 5 | Both runs passed with zero reported user-data cloud requests. Neither completed local inference. |
| G2 · Public documents and terms | done | 8 · 4 open, 4 look | 5 | I read the rendered README, privacy document and provider terms. The project describes its routing and the limits of the evidence. |
| G3 · Shared-PC residue | done | 16 · screenshot, navigation, resume, worklist, reimport, reset and file-picker check | 3 | After reset and a fresh visit, the previous imported review resumed. The exported CSV was still selectable. |
| G4 · Deployment assessment | done | 4 · 2 open, 2 look, plus the evidence already collected | 4 | I checked Chrome hardware and enterprise policy information. No managed Windows ward PC was tested. |

## Decisions and handover

### T3 and T4 · What I decided

| Source item | My decision and reason |
|---|---|
| Ana Ribeiro, 21:55 | Used census spelling. “Anna” and “Ana” shared H-204811. Kept one act because time, author, dose, route and temperature agreed. |
| Grace Owusu, 00:20 | Referred identity and both rows to KS. H-209921 and H-209912 are different identifiers. A plausible transposition still needs an authoritative check. |
| Joan Pike, 03:40 | Kept the named, numbered admission from ED. The signed note explains her absence from the 21:00 census. On the ward, verify against the admissions record. |
| Bed 5, 05:00 | Referred to JM. The BP entry has no name or hospital number. Neither Joan's admission nor Henry's bed move establishes whose BP it was. |
| F. Rahman, 04:20 | Referred “MS 10mg given” to JM for the full drug name and original administration record. |
| Henry Walsh, move | Applied the correction to 02:30. JM explicitly identified and replaced the earlier 02:00 time. |
| Ines Duarte, 02:20 | Referred the 5 mg / 10 mg oxycodone correction to JM for clinical confirmation. The dose doubled, the author supplied a correction and the screen flagged disagreement. |
| Omar Haddad, 02:40 | In the drill I applied KS's explicit correction to preserve the refusal. In the own-files run the correction action was missing, so I referred both rows. |
| Fatima Rahman, 22:30 and untimed copy | Referred the pair. Same author, drug, dose and pain score, but there was also another dose that night. I needed JM to place the untimed row. |
| Rui Costa, 00:50 | Kept one. Both entries recorded the same antibiotic, time, dose, route, author and new left-arm cannula. |
| Ana Ribeiro, 03:00 | Kept one. Both entries gave 37.4, same time and author, with “settled” recorded. |
| Mei Chen, 01:10 | Kept one. Timing, author, oxygen, NEWS and saturation agreed. I verified that RR 24 from the fuller row survived in the worklist. |
| Peter Novak, 23:40 and 23:55 | Kept each as a separate act. Being found on the floor and the later neurological observations are independently timed, authored records. |
| Henry Walsh, 03:05 | Kept the family call. An authored original remained and there was no documented cancellation. |
| Fatima Rahman, 01:45 | Kept this separately timed morphine entry, with pain 6/10, pending clarification of the other untimed row. |
| George Mills, 05:30 | Kept the later BM 6.2. The time falls after the first email. |
| Twelve exact pairs | Used “Keep one of each identical pair” after checking Ellen's matching cells and the displayed rule for patient, time and text. One each for Ellen 01:00, Lucia 23:15, Sofia 02:15, Thomas 02:50 and 22:10, Dmitri 00:35, Nora 02:45, George 22:45 and 23:05, Kwame 01:40, Liam 02:30 and Ravi 01:25. Distinct observations for the same patient remained separate. |

### T5–T7 · What the ward would receive

The worklist showed **24 ready acts and eight question rows**. Three referred pairs each produced two questions. For Grace, “Are these the same act?” omitted the discrepant hospital numbers. For Ines it omitted the need to confirm the changed dose. The two single questions retained the ambiguity of “MS” and the lack of identity for bed 5. I saw author initials and source row references, with no delivery receipt or place to record a signed answer.

In a real outage the nurse in charge would identify JM and KS from the roster, reach them by the internal extension or approved secure clinical channel, and show both source cells together. The documenting clinician would confirm the patient and clarify the entry against the original paper or administration record. An authorised reviewer would record who answered, what they confirmed, when and which source rows it concerned. The item would remain pending until then. A reply-all email would create another uncontrolled copy.

I exported the drill worklist before ticking Peter's fall, Peter's neurological observations and Ellen's furosemide. In practice an authorised user would verify the patient in the EHR, check for an existing entry, transcribe with its original time and author, and then tick it. A second reviewer would reconcile the completed list and outstanding questions at handover. The earlier CSV is a snapshot and its ticks cannot track subsequent progress.

The result reported **7 minutes, 24/27 expected acts, 3 lost, 0 duplicates, 0 uncertain entries entered as certain, 2/3 corrections, 0 repeated doses wrongly merged, 2/2 expected questions and 4/4 identity problems**. It showed 26 acts and 3 lost for using the latest file, and 36 acts with 9 duplicates for merging exact rows alone. I can use that to teach why both versions matter. Counting a deliberate hold as a loss, calling all 24 ready acts “entered”, and displaying 2/2 beside a worklist containing eight questions would give the nurse in charge the wrong picture of what remains.

## Governance evidence

### G1 and G2 · Data flows and scope of the evidence

The start page says patient data stays on this device. The import panel says files are read in the browser. On the imported review I could see **“Patient data sent anywhere: none”** at the top right while names and hospital numbers were visible in the same window. The result screen separately reported **0 on-device and 13 cloud calls**, with a 24-entry audit trail in this browser. The cloud calls were expected for the fictional drill. I did not request a cloud second opinion. [Imported review screenshot](../shots/9304-p4-imported-review.png)

On the drill review, the top bar said zero local comparisons and ten synthetic rows sent to the cloud. Yet Ana's item credited its explanation to Gemini Nano on this device. Earlier, the progress display counted two local calls alongside two errors. The result covers the whole drill, including column mapping, so I would not equate its 13 with the review header's 10. The individual item's local attribution still conflicts with the final zero. I need to distinguish attempted calls, successful inference and fallback for the **specific suggestion** I am reviewing.

| Lab S2 on Chrome 150, build 109ef16, network online | Result on screen | What I could conclude |
|---|---|---|
| Simulation checked | Pass. LanguageModel hidden. Ledger showed user-import, only_on_device, blocked, 0 Gemini requests. | The missing-API test reached the block and reported zero cloud requests for that prompt. |
| Simulation unchecked | Pass. Prompt API present, Nano downloadable, blocked because the model was unready. Again 0 Gemini requests. Cumulative ledger showed 2 blocks, 0 local calls, 0 cloud calls. | This machine exercised a second failure mode. It did not establish that an available model works offline. |

The public README describes a synthetic benchmark on one developer machine, and the privacy document describes an availability check before imported prompts and an origin-plus-content-hash check for cloud-eligible bundled files. Drill mapping can include headers and up to three sample rows. The optional second opinion can include clinical text, times, comments, staff initials and other rows for context, excluding structured name, hospital-number and bed fields. “Clinical text only” is too broad a summary of all 13 calls. The documentation says inputs and derivatives, decisions, audit and worklist are kept in IndexedDB. Those are project claims. My session directly tested the visible resume behaviour and blocked cases. [Project README](https://github.com/JohnnyBazzinga/lantern#readme) · [Project privacy document](https://github.com/JohnnyBazzinga/lantern/blob/main/docs/PRIVACY.md)

The documented watcher counts requests to three Gemini-related endpoints during a model call. The same document identifies other traffic from hosting, Remote Config, Firebase Installations, Google Fonts and, for cloud calls, App Check/reCAPTCHA Enterprise. App Check authenticates an app request. It does not identify the nurse at a shared keyboard. I regard S2 as convincing evidence that the **two tested calls were reported as blocked**. A self-reported counter cannot certify every destination, the whole import/export lifecycle, browser extensions, crash reporting or a future build. I did not independently observe network traffic or perform the S1 offline cold restart. [Project privacy document](https://github.com/JohnnyBazzinga/lantern/blob/main/docs/PRIVACY.md)

### G3 · What the next shift can recover

1. I imported census-7B.csv, log 03h10.xlsx and log 07h40 (reply-all).xlsx. I referred Omar's pair. The header said **2 of 50**. Revisiting the start URL in the same profile offered **Resume your last review**. One click restored the review, with Ana's name, hospital number and bed. Opening the worklist showed both of Omar's source rows and 48 undecided rows. There was no individual sign-in challenge.
2. I could find **Start over** on the column screen. I could not find it on the resumed review or worklist. I reimported the same three fictional files and clicked **Start over** from columns. The pickers cleared and Resume disappeared. On a fresh visit, Resume returned. It reopened the **earlier 2/50 imported review**, including Ana and the 03h10 source. This demonstrates recovery of the earlier saved review after reset. It does not establish which records, if any, the reset deleted from the new column-mapping session.
3. The harness confirmed the drill download as 9304-re-entry-worklist-2026-11-21.csv. Browser download history was unavailable in this harness. After reset I could still select that exact exported file in Lantern's file picker. I did not import it again. The original attachments also remained selectable. On our wards the same Windows login can access its Downloads folder, and a copy on a network share is exposed to everyone its permissions admit.
4. I did not print. Printouts would require collection at the printer, custody at handover and confidential destruction. Print queues, saved PDFs, mailboxes, shares and backups have their own retention and access policies. Closing the tab or restarting the task cannot recall those copies. I revisited the URL in the same profile and saw recovery directly. I did not test an OS reboot, a separate Windows account or forensic recovery.

### G4 · Deployment conditions to reconsider the decision

| Owner | Evidence I would require before a real-patient pilot |
|---|---|
| Desktop engineering | Inventory representative ward machines. Chrome lists Windows 10/11, at least 22 GB free on the Chrome-profile volume, and either strictly more than 4 GB VRAM or at least 16 GB RAM and four CPU cores. An 8 GB integrated-graphics PC misses the CPU route and needs verified GPU eligibility. A 16 GB PC is a candidate if cores, storage and actual readiness pass. Preload on an unmetered link. Monitor disk space because Chrome documents model removal below 10 GB free. [Chrome hardware and download requirements](https://developer.chrome.com/docs/ai/get-started#required_hardware) |
| Chrome administrators | Verify the effective GenAILocalFoundationalModelSettings and BuiltInAIAPIsEnabled policies on a dedicated pilot group, the supported desktop Chrome build, extension allowlist, managed profile, cache and storage settings. Prepare the model and application before an outage. Confirm “available”, disconnect the network, close Chrome, reopen, and complete import, review and recovery after restart. Repeat with the model missing and after updates. Set bounds on time and memory on a busy ward PC. [Chrome enterprise policy catalogue](https://chromeenterprise.google/policies/#GenAILocalFoundationalModelSettings) |
| Security and DPO | Complete a DPIA and map purpose, legal basis, access, flows, retention, backups, deletion and incident response. Use individual managed accounts, automatic locking, encrypted endpoints, restricted storage and print release. Require an explicit end-of-case action and verify erasure/isolation as the next user. Specify separately who keeps the authoritative audit record and when copies and exports expire. |
| Security engineering and service owner | Use dummy sentinel records and independent hospital network observation across import, both model states, errors, review, export and restart. Test a restricted network with the cloud path disabled, control app builds and configuration, review changes, and repeat acceptance tests after updates. Document recovery, fallback to paper, support ownership and rollback. |
| Procurement and legal | Confirm which terms govern each local SDK/model and hosted service for this intended use. Google's published Gemini API terms require paid services for API clients made available in the EEA and prohibit use of the Services in clinical practice. A billing-linked Firebase project addresses the project's stated billing concern only. Obtain written clearance on the actual architecture and use, contracts, processing roles, any transfers and metadata. I did not verify the demo's billing status or establish that the API terms also govern the local Chrome model. [Gemini API terms](https://aistudio.google.com/docs/terms) · [Project privacy document](https://github.com/JohnnyBazzinga/lantern/blob/main/docs/PRIVACY.md#provider-terms) |
| Patient-safety committee and nursing | Conduct a clinical risk assessment using local Portuguese headers, abbreviations, transfers, night-shift dates, repeat doses, refusals and corrections, with and without a ready model. Require explicit handling of contradictory rows and an accountable closed loop for identity and medication questions. Train in European Portuguese. Define who may reconcile, clarify, sign and type. Keep the approved downtime procedure available. |
| Records and audit leads | Demonstrate attributable, access-controlled logging of reviewer, source references, reason, changes, nurse response, export and EHR completion. Set retention with the DPO. Limit clinical text in technical logs and test how investigators reconstruct a correction after a workstation is replaced. A browser call ledger and a tick on a shared login cannot establish who entered a record. |

## Issues

Severity runs from 0 (no problem) to 4 (blocks the task or risks a wrong record). Quotes are from my think-aloud.

| ID | Task / screen | What happened | What I expected | Severity | My words | Suggested fix |
|---|---|---|---|---:|---|---|
| P4-01 | T8 / manual review | Omar's original administration and explicit “NOT given, pt refused” were labelled “Same act, worded differently”. The options offered one copy, both or referral. Ines's dose change and Henry's time correction also moved to Typed twice. | A contradiction must stay visible and unresolved until a qualified reviewer confirms which version documents the event. | 4 | “Não deixaria continuar a transcrição com esta escolha.” | Flag conflicting disposition, dose or time in manual mode. Show the correction comment and require documented confirmation before releasing a row. |
| P4-02 | G3 / shared profile | The previous imported case could be resumed after Start over and a new visit. No individual authentication intervened. | Staff should be able to finish a case, understand retention, verify closure and prevent the next login from seeing it. | 4 | “O botão voltou.” | Provide end-of-case controls on review and worklist, bind resume to individual access and explain precisely which data and exports remain. Test against a previously saved review. |
| P4-03 | T3–T5 / referral | After referring Grace's mismatched identifier the app said “Settled” and offered to merge the pair. The bed-only case offered “Keep it as written”. Grace's worklist questions asked about duplication, omitting the identity conflict. | Hold both rows against the specific identity question until the author supplies verified identifiers. | 4 | “Dois algarismos trocados continuam a ser outro número de processo.” | Carry the reason and both source references into one pending question, and block release while identity is unresolved. |
| P4-04 | T6 / night-shift order | George's 05:30 BM appeared before 22:45 and 23:05, despite the claim of time order. Thomas's 02:50 also preceded 22:10. | Follow the actual overnight sequence so staff can reconstruct repeated observations and interventions. | 4 | “Guardo este valor com a hora e a autora.” | Show dates or shift-relative day labels and sort by full timestamps. Flag ambiguous dates for confirmation. |
| P4-05 | G1 / review provenance | Ana's margin credited on-device Nano during a drill whose final count was zero local calls. Error attempts looked local in progress. | A reviewer should be able to trace each suggestion to the successful route and distinguish a failed attempt. | 3 | “Vejo duas comparações com «error» e um contador de duas chamadas locais.” | Generate each label from the completed call's provenance. Use separate counts for attempts, successful calls, and source rows. |
| P4-06 | T5 / ward questions | Eight row-level questions represented five uncertainties. Some lacked the disputed value or counterpart. “Sent” appeared without evidence of delivery, acknowledgement or a signed answer. | A nurse should receive one actionable question per uncertainty and the next shift should see who owns it. | 3 | “As oito perguntas não explicam à KS que o número de processo diverge.” | Pair the sources, preserve the reviewer's reason and provide accountable handover and resolution states. |
| P4-07 | T6–T7 / completion | The result counted 24 as entered when the worklist had 3/24 ticked. Deliberate referrals appeared as losses against the key. | Separate eligible, transcribed, awaiting clarification and unmatched against the drill key. | 3 | “O resultado chama «entered» a 24 atos quando só marquei três.” | Label the scoring denominator and show the actual tick count and pending decisions alongside it. |
| P4-08 | T6 / G3 / export | A normal CSV remained selectable after reset. I saw no indication of its destination or lifetime in the app. | Before creating another clinical copy I need to know who can access it and how it will be disposed of. | 3 | “O CSV continua selecionável.” | Allow administrators to restrict export and print, identify the destination and snapshot time, and state retention and collection responsibilities. |
| P4-09 | G1 / start and Lab | The start said Nano “can run”. S2 passed twice on a machine where Nano was downloadable and neither call could execute. | Distinguish eligible, installed, tested offline and currently using manual comparison. | 2 | “Se voltar a bloquear, continuo sem ter observado uma inferência local bem-sucedida.” | Show model readiness before file selection, and label the S2 outcome as a successful block or a successful local inference. |

## What worked

- The census match showed the precise name variation for Ana. The empty identity on bed 5 was visible before I had to choose an act disposition.
- I could read the file, row, cell, time and author for both versions of an act. I recovered Peter's fall and follow-up separately and verified that Mei's full observation reached the worklist.
- Both model-unavailable S2 cases gave a distinct reason and a ledger entry. Imported files still opened for manual comparison. The import banner and absence of a cloud second-opinion button made the two workflows distinguishable.
- The worklist distinguished ready from entered during re-entry, and each checkbox changed the counter immediately. In the partial imported worklist, a warning specified exactly 48 undecided rows.

## Interview

1. **Would I use this in the next outage?** I would use the established hospital downtime procedure. I would use Lantern for a fictional training exercise and reconsider live use after the conditions above are demonstrated.
2. **What would stop me?** Shared logins, residual copies, contract uncertainty, mixed hardware, and lack of a named owner for returned questions. The secretary cannot sign a clinical clarification. English-only instructions and unvalidated Portuguese notes also matter at 08:30.
3. **Which labels would I change?** “Settled” or “sent” should say “Awaiting confirmation from JM/KS” until receipt is recorded. “Typed twice” should say “Possible match — compare both entries” for an unverified pair. In Portuguese I would use “Pronto a transcrever” and “Transcrição confirmada” for the two worklist states.
4. **What was missing?** A finish-and-clear control with a retention statement, a named reviewer and answer log, an explicit offline-readiness check, and a complete question that can be handed to the nurse.
5. **What felt risky?** A refusal appearing under duplicates, a question about identity turning into a question about the act, and identifiable content reopening after an apparent reset. A second shift could start from the wrong record or disclose the first shift's work.
6. **How do we do this today?** The ward retains numbered paper forms, the census and timestamped spreadsheets on restricted storage. Nursing verifies identity, medication and amendments against the signed originals. Authorised staff transcribe into the EHR and check off a controlled list. Lantern made exact pairs and missing rows quicker to find in this drill. I did not measure a time saving against our process, and I would retain the manual controls.
7. **First change?** Make an unresolved contradiction impossible to release as a duplicate. Use the imported enoxaparin refusal on a no-model workstation as the acceptance case. The separate confidentiality gate is the next-user resume test.

## SUS · simulated, indicative only

Scores run from 1 (strongly disagree) to 5 (strongly agree), from my perspective as the hospital approver.

| # | Standard item | Rating |
|---|---|---:|
| 1 | I think that I would like to use this system frequently. | 2 |
| 2 | I found the system unnecessarily complex. | 4 |
| 3 | I thought the system was easy to use. | 4 |
| 4 | I think that I would need the support of a technical person to be able to use this system. | 3 |
| 5 | I found the various functions in this system were well integrated. | 3 |
| 6 | I thought there was too much inconsistency in this system. | 4 |
| 7 | I would imagine that most people would learn to use this system very quickly. | 4 |
| 8 | I found the system very cumbersome to use. | 3 |
| 9 | I felt very confident using the system. | 2 |
| 10 | I needed to learn a lot of things before I could get going with this system. | 4 |

**SUS score 42.5/100** (adjusted item total 17 × 2.5).

## Use verdict

**Would not use for the next real outage.** My three reasons are the recoverable patient review on a shared profile, the risk of turning a documented refusal into an administration during manual comparison, and the absence of an attributable, closed clinical handover from a flagged source row to a signed EHR entry.
