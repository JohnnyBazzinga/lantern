# P3 – Inês Carvalho (nurse in charge, night team, Ward 7B)

## 1. Persona
Inês Carvalho, 41, registered nurse with 17 years on Ward 7B and nurse in charge of the night team. She wrote about half of last night's downtime sheet. She sat next to the clinical secretary to check her work at the end of a 10-hour night shift, with about 10 minutes before going home. Her first filter is clinical safety: double doses, lost corrections, "not given" recorded as given, error-prone abbreviations, wrong patient.

Session: port 9303, 65 harness commands, drill (cloud model on synthetic rows) and then own files (no model).

## 2. Tasks

| Task | Outcome | Cmds | SEQ (1–7) | Note |
|---|---|---|---|---|
| T1 First impression | done | 3 | 6 | Clear purpose. "Does not diagnose, dose or triage" and "data stays on this device" reassure. The page is framed for the secretary ("Rita"), not the nurse. No Portuguese. |
| T2 Columns | done | 3 | 6 | All mappings correct, nothing to change. v1 "Time" and v2 "Time given" are merged into one meaning without comment. |
| T3 Patient identity | done | 8 | 5 | 4/4 caught: transposed digits, spelling, new admission, and bed-only row ("Do not attribute by bed", excellent). The source excerpt doesn't show the Patient, Hosp no or Bed cells, so I can't see where the wrong value was written. |
| T4 Review | done (2 suggestions overridden) | 20 | 4 | The rules caught the important things. But an opioid dose change and a given→not-given change look like a time correction, and the dangerous "keep both" sits next to them. I rejected 2 suggestions (see decision log). |
| T5 Questions for the nurse | partly | 2 | 3 | Found easily. Questions lack patient, bed and time. The enoxaparin question appears twice and asks the wrong thing. No way to send or receive answers. |
| T6 Worklist | done | 6 | 4 | Export and ticking are easy. No date. Time order is wrong across midnight. No split between nurse and secretary items. Nothing records who ticked or when. |
| T7 Result | done | 3 | 4 | Clear comparison table, but it scores my deliberate "ask the nurse" decisions as "acts lost" in red, without saying which ones. |
| T8 Own files | partly (stopped at 4/50 decided) | 20 | 2 | Loads fine and shows "Patient data sent anywhere: none". **Without the model, documented corrections become "Typed twice". "Keep one" put "Enoxaparin 40mg SC" (given) on the worklist and silently dropped "NOT given, pt refused".** |

### T4 decision log (drill)
| Row | Lantern suggested | My decision | Why |
|---|---|---|---|
| Grace Owusu, identity | Use census H-209912 | Agreed | Name and bed match. Transposed digits. |
| Grace Owusu, ceftriaxone 00:20 | Same act, keep one | Agreed | Same time, nurse, drug and dose. |
| Ana Ribeiro, identity | Use census | Agreed | Same number and bed, "Anna" is a typo. |
| Ana Ribeiro, paracetamol/PCM 21:55 | Same act | Agreed | PCM = paracetamol, same time, same JM. |
| Joan Pike | New admission, keep | Agreed | I remember the 03:40 ED admission. Her number still needs checking against admissions. |
| Bed 5, 05:00 obs, no name | Ask the nurse | Agreed | Henry Walsh left bed 5 at 02:30 and Joan Pike came in at 03:40. Attributing by bed is exactly the trap. |
| F. Rahman, "MS 10mg given" 04:20 | Ask the nurse | Agreed | MS could be morphine or magnesium sulfate. If it is morphine, 10mg is 5× her 2mg PRN dose. |
| Henry Walsh, move time 02:00→02:30 | Apply correction | Agreed | Correction made and signed by the author (JM). |
| Ines Duarte, oxycodone 5→10mg | Apply correction | Agreed, with reservation | The author documented it. In real life I would check it against the controlled-drug register first. |
| Omar Haddad, enoxaparin → "NOT given, pt refused", "per KS 06:00" | Apply correction | **Overrode → Ask the nurse (KS)** | "Per KS" means someone else relayed it. A given/not-given change on an anticoagulant must be confirmed by KS. |
| Fatima Rahman, morphine 22:30 vs v2 row with blank time | Same act | Agreed | "Pain 7/10" and JM anchor it to 22:30 (01:45 was 6/10). Lantern never mentioned the missing time. |
| Rui Costa, Ana Ribeiro 03:00, Mei Chen | Same act | Agreed | Re-typed. I checked that the kept text still has RR 24 (it does). |
| Peter Novak fall 23:40 + GCS 23:55, Henry family call | Keep | Agreed | These were lost when the sheet was sorted. The fall also needs an incident report. |
| Fatima Rahman, morphine 01:45, only in v2 | Keep it | **Overrode → Ask the nurse (JM)** | Timed before the 03:10 email but missing from it. It is her 3rd opioid entry of the night. Lantern's reason, "Logged after the first email", is misleading. |
| George Mills BM 6.2 05:30 | Keep | Agreed | Timed after the email, plausible. |
| 12 identical pairs | Keep one of each (bulk) | Agreed after reading all 12 | No U/IU/QD, insulin and heparin units written out in full. |

## 3. Issues (most severe first)

**ISS-01 · T8 / review card without on-device model · Severity 4**
- **What happened:** with my own files and no model, the enoxaparin pair ("Enoxaparin 40mg SC" vs "Enoxaparin 40mg SC - NOT given, pt refused", comment "per KS 06:00: was logged as given by mistake") is filed under **"Typed twice. Same act, worded differently."** The only options are "Same act: keep one", "Two different acts: keep both" and "Ask the nurse". I clicked "keep one". The worklist then showed **"Enoxaparin 40mg SC · 02:40 · KS" ready for re-entry**: the NOT given, the refusal and the correction were dropped without a trace. The oxycodone 5mg→10mg correction is handled the same way. "Keep one" keeps 5mg (wrong dose) and "keep both" records 15mg. There is no "Apply the correction" option at all. In the drill, with the model, the same rows were correctly shown as "Corrected later".
- **Expected:** words like "NOT given", "refused", "corrected", "corr.", "by mistake", or a dose that differs between the two rows, should be caught by rules without any AI. At minimum, the card should say which row "keep one" keeps.
- **Think-aloud:** "Isto é perigoso. A refused anticoagulant goes into the record as GIVEN. That's exactly my nightmare."
- **Fix:** run correction and negation detection as a rule independent of the model. When the two rows differ in dose, route or given/not-given status, never offer a plain "keep one". Make the user pick which row is correct, show "will keep: version X row N" on every merge button, and require nurse sign-off for medication rows.

**ISS-02 · T4 / correction and abbreviation cards · Severity 3**
- **What happened:** "Two different acts: keep both" sits right next to "Apply the correction" on an opioid dose correction and on the enoxaparin given→not-given change. One wrong click records 5mg + 10mg of oxycodone, or enoxaparin both given and refused. "Keep it as written" is offered for "MS 10mg given" (flagged as an error-prone abbreviation) and for the bed-5 row with no patient at all.
- **Expected:** for medication rows where the dose or given status differs, "keep both" should need a deliberate confirmation. "Keep as written" should not exist for unidentified patients or error-prone abbreviations, at least not for the secretary.
- **Think-aloud:** "One wrong click and 15mg of oxycodone is recorded… Kept as written onto whom?"
- **Fix:** hide or guard these options. Add a "high-alert medication" visual state (opioids, anticoagulants, insulin, heparin) so a dose change doesn't look like a time change.

**ISS-03 · T6 / worklist and CSV · Severity 3**
- **What happened:** the CSV has no date column, and the worklist sorts by clock time as text. George Mills shows 05:30 before 22:45, Thomas Hale 02:50 before 22:10, Ana Ribeiro 03:00 before 21:55, even though the list says "in time order per patient". The night crosses midnight.
- **Expected:** a date and time on every act, sorted chronologically.
- **Think-aloud:** "That's not time order, the night crosses midnight… Onde está a data?"
- **Fix:** derive the date from the outage window (21:40 Sun → 07:40 Mon), show it, sort by datetime, and export it.

**ISS-04 · T5 / "Questions for the ward" · Severity 3**
- **What happened:** questions show only the act text and "version 2 row 4". There is no patient name, hospital number, bed or time, even though Lantern knows them (the MS row is Fatima Rahman, bed 3, 04:20). The enoxaparin pair produces two questions, both "Are these the same act?", when the real question is "Was it given or refused, and did you write that correction?". The bed-5 question reads "Bed 5 only: no name or hospital number. Do not attribute by bed.", which is an instruction to the secretary, not a question to JM. The 01:45 morphine just says "Please confirm this entry" with no reason. There is no way to send the questions or record the answer, and the CSV's open questions also have empty patient fields.
- **Expected:** one question per issue, each with patient, bed, date and time, the original text, a specific question, a space for the answer and the nurse's signature, and a way to record the answer back in Lantern.
- **Think-aloud:** "JM doesn't have version 2 row numbers in her head."
- **Fix:** add a printable "questions for JM" and "questions for KS" sheet per nurse, with an answer field, and an "answer received" state that unblocks the item.

**ISS-05 · T4 / correction logic · Severity 3**
- **What happened:** "per KS 06:00: was logged as given by mistake" (a correction relayed by someone else, in JM's reply-all copy) is treated exactly like JM's own signed corrections and suggested as "Apply the correction". The drill's answer key also treats it as authoritative.
- **Expected:** a correction made by the author is different from one reported on their behalf. Given→not-given changes on high-alert drugs need the author's confirmation.
- **Think-aloud:** "A relayed correction is not the author's correction. I won't sign that."
- **Fix:** detect "per X", "as per", "told by" and route those corrections to X by default. Flag given/not-given reversals.

**ISS-06 · T6 / worklist · Severity 3**
- **What happened:** the list mixes medication administrations (opioids, enoxaparin, insulin, heparin rate, IV antibiotics), nursing assessments and events (fall, GCS, NEWS/O2, BM, urine output, NG tube), and admin items (bed move, admission, family call) with no category. Nothing says who may enter what. There is no late-entry marker or template, and nothing records who ticked "Entered" or when. I ticked the fall, the GCS and the furosemide, and nothing shows it was me.
- **Expected:** a category column, a "to be entered by" column (the documenting nurse for MAR and nursing notes), a late-entry wording to copy, and a tick audit with user and time.
- **Think-aloud:** "Ticked by whom, at what time? If the secretary ticks it and I tick it, nobody can tell."
- **Fix:** add these columns and filters ("my items: JM", "secretary can enter").

**ISS-07 · T7 / result · Severity 3**
- **What happened:** my two deliberate "Ask the nurse" decisions are counted as "Acts lost: 2" and "Corrections applied 2/3", in the same red as the shortcuts that really lose a fall. It doesn't say which 2 acts.
- **Expected:** "pending with nurse" counted separately from "lost", plus an itemised list so I can learn or disagree.
- **Think-aloud:** "The scoring punishes asking. A secretary seeing this will learn to click Apply."
- **Fix:** add a "sent to the nurse" outcome that isn't counted as a loss, and per-item feedback.

**ISS-08 · T4 / "Only in the newer file" · Severity 2**
- **What happened:** morphine 2mg at **01:45** is explained as "Logged after the first email" (03:10), which is false for its time. It is suggested "Keep it" even though it is an opioid missing from the earlier version. The card also doesn't show the patient's other doses of the same drug that night (Fatima: 22:30, 01:45, "MS 10mg" 04:20).
- **Fix:** say "Timed before the 03:10 version but missing from it (re-typed from notes?)". For controlled drugs, suggest the nurse checks the CD register. Show a per-patient strip of same-drug doses that night.

**ISS-09 · T4 / "Typed twice" · Severity 2**
- **What happened:** the v2 morphine row has a blank time, and Lantern's reasoning doesn't mention it. "Keep one" never says which row and which wording will survive. I only learned in the worklist that it kept v1 (with 22:30, and RR 24 for Mei Chen).
- **Fix:** label the button "Keep version 1 row 4" and highlight fields that are blank or missing on one side.

**ISS-10 · T2–T4 / AI location labels · Severity 2**
- **What happened:** the status said "Comparing rows on this device" while the list showed "Cloud" and one "error". The banner said "0 comparisons on this device" while the cards said "On this device Gemini Nano reads these as…". Other cards said "no on-device model was available". The error was never explained. "Disputed: the numbers in the two rows differ" appeared on ceftriaxone, where the dose and time are identical.
- **Think-aloud:** "Qual é? …Error em quê? That makes me nervous."
- **Fix:** use one consistent label of where the AI ran, explain errors in plain words, and name the numbers that differ.

**ISS-11 · T8 / CSV export · Severity 2**
- **What happened:** with 46 of 50 rows undecided, "Download as CSV" exports silently. The file has no "INCOMPLETE" marker and the same filename pattern as the drill export (`re-entry-worklist-2026-11-21.csv`), so a fictional drill list and a real list can't be told apart. The file is patient-identifiable and lands in Downloads on a shared ward PC.
- **Fix:** put "INCOMPLETE – n undecided" in the file and its name, include "DRILL" in drill filenames, and warn about where the file goes.

**ISS-12 · T3 / identity card · Severity 2**
- **What happened:** the source excerpt shows only Time, What was done, Comments and By. I can't see the Patient, Hosp no or Bed cells, so I can't tell where "H-209921" or "Anna" was written, or in which version.
- **Fix:** show the identity cells with their cell references on identity cards.

**ISS-13 · T6 / identifiers · Severity 2**
- **What happened:** Joan Pike appears as "H212950" (no hyphen) in the worklist and CSV, and as H-212950 on the card. This isn't flagged, and it's a new admission, so the census can't be used to verify it. Henry Walsh is shown in bed 5 in one place and bed 6 in another, with no explanation.
- **Fix:** flag malformed numbers, show "bed at time of act", and note "verify number with admissions (ADT)" for new admissions.

**ISS-14 · general · Severity 1**
- **What happened:** the interface is English only, and UK jargon (BM, NP, specs) is passed through. There is a typo, "Lost when the sheet was edited?.". The result says "The full audit trail has 24 entries", but there is nowhere to view it.
- **Fix:** add a Portuguese UI, fix the typo, and add an audit trail viewer and export.

## 4. What worked
- **Bed-5 row:** "Bed 5 only: no name or hospital number. Do not attribute by bed." This is exactly right. Henry Walsh left bed 5 and Joan Pike was admitted to it in the same night.
- **"MS 10mg given":** flagged as an "Error-prone abbreviation: Lantern never interprets these", and the question names both readings (morphine or magnesium sulfate).
- **Fall at 23:40 and GCS at 23:55:** recovered from the sorted copy that lost them, and suggested "Keep".
- **Correction trail in the worklist and CSV:** "Oxycodone 5mg … → 10mg (corrected by JM…)" and "time: 02:00 → 02:30". The original is never lost, which is what a late correction needs.
- **Merges kept the more complete wording:** v1 with 22:30 and RR 24, not the shortened v2.
- **Traceability:** every act shows its file, row and cell (E14, "version 1 row 19 + version 2 row 14").
- **Identity checks:** transposed digits, spelling and the not-on-census admission were all caught, and identity has to be settled before the act can be decided.
- **"Ready is not entered":** the tick-as-you-type model is right.
- **Incomplete worklist warning:** "46 rows still have no decision, so this list is not complete."
- **Own files:** "Patient data sent anywhere: none". The drill told me it took 6 minutes.

## 5. Interview (in character)
1. **Would you use it in the next real outage?** As a checker, yes: to find duplicates, lost rows and identity problems, and to build the question list. But only on a PC where the on-device model actually works, or after ISS-01 is fixed. Without the model it showed me a refused enoxaparin as given. "Sem isso corrigido, não."
2. **What would stop you?** The rules on who may enter what. In our record, I and the nurse who gave it enter medication administrations and nursing notes, not the secretary. Also IT and the DPO (patient CSV in Downloads, Chrome flags), the enfermeira-chefe approving it as a procedure, Portuguese, and time: at 08:30 after a night nobody has 10 free minutes unless it's planned into the handover.
3. **Words I'd rename:** "Typed twice" → "Escrito duas vezes / mesmo ato". "Disputed" means nothing to me; say "Lantern não tem a certeza porque…". "Documenting clinician" → the nurse's name or initials. "Keep as written" → "Manter sem alterar (não recomendado)". "Not a real act: leave out" sounds like an accusation; use "Não registar (motivo: …)". "Questions for the ward" → "Perguntas para a enfermeira JM".
4. **Missing:** dates; a medication/nursing/admin category; "to be entered by"; a late-entry template ("Registo diferido – período de contingência 21:40–07:40, ato realizado às 23:40 por JM"); a per-patient view of all doses of a drug that night; an answer field for questions; a printable sheet per nurse; who ticked and when; incident-report reminder for the fall; and a check of opioid entries against the controlled-drug register.
5. **What felt risky:** (a) "not given" recorded as given in no-model mode; (b) "keep both" one click away from a double opioid dose; (c) a relayed correction treated as the author's; (d) times without dates; (e) the result screen teaching people that asking = losing.
6. **How I do it today:** the printed sheet and a highlighter. I read both versions side by side and tick each line as I enter it in the record, and the secretary does admissions and bed moves. Whatever is unclear goes on a post-it to the colleague, or I phone her the next day. With Lantern, finding duplicates and the lost fall is clearly **faster and safer**. Deciding medication corrections is **not safer yet**, because the safe action depends on the AI being present and on me spotting the dangerous button.
7. **One thing to change first:** detect corrections and "NOT given/refused" with rules, without the model, and never offer "keep one" or "keep both" on a medication pair whose dose or given status differs.

## 6. SUS (simulated, indicative only)
| # | Item | Score |
|---|---|---|
| 1 | I think I would like to use this system frequently | 3 |
| 2 | I found the system unnecessarily complex | 2 |
| 3 | I thought the system was easy to use | 4 |
| 4 | I would need the support of a technical person to use it | 3 |
| 5 | The various functions were well integrated | 3 |
| 6 | There was too much inconsistency in this system | 4 |
| 7 | Most people would learn to use it very quickly | 4 |
| 8 | I found the system very cumbersome to use | 2 |
| 9 | I felt very confident using the system | 2 |
| 10 | I needed to learn a lot before I could get going | 2 |

Score: (2+3+2+3+1) + (3+2+1+3+3) = 23 × 2.5 = **57.5** (simulated, indicative only).

## 7. Verdict
**Would use if…** the corrections, "not given" and dose-difference checks work without the on-device model, and the worklist separates what the nurse must enter herself (with dates and who ticked) from what the secretary may enter.

Three main reasons:
1. **Clinically unsafe in no-model mode:** "NOT given, pt refused" was silently dropped and enoxaparin was listed as given. The oxycodone correction can only become 5mg or 15mg. With the model, the same rows were handled correctly, so safety depends on whether the AI is present.
2. **The rules are good where they exist:** bed-only rows, MS, identity problems, the lost fall and the correction trails are exactly what I check by hand. They saved real time and caught real traps.
3. **The hand-off isn't ready for a ward:** there are no dates, questions without patient/time and no answer loop, no nurse/secretary split or tick audit, and a result screen that scores asking the nurse as losing an act.
