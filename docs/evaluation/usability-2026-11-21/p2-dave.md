# Lantern usability session: P2, Dave (ward clerk)

Port 9302. 62 harness commands used (budget about 80). Date of session: 2026-11-21.

## 1. Persona
Dave Okafor, 38, ward clerk on an acute medical ward in an English NHS trust for 9 years. He handles ADT, bed state, phones and discharges. He knows Excel and Outlook, has moderate IT confidence, and has lived through a two-day EPR outage. He knows clerks must not enter clinical observations or drug administration on a nurse's behalf. He judges software by one test: does it save time without getting him in trouble?

## 2. Tasks

| Task | Outcome | Cmds | SEQ (1-7) | Note |
|---|---|---|---|---|
| T1 First impression | done | 3 | 6 | Purpose is clear from the headline. It is framed for "Rita, the clinical secretary", not a clerk. There is no owner, IG statement or contact. "Gemini Nano" and "Prepare this device" are jargon to me. |
| T2 Columns | done | 5 | 6 | All 3 files were mapped correctly and I changed nothing. The next button is "Compare the two versions" at the bottom of a long page; I was looking for "Continue". |
| T3 Patient identity | done | 9 | 6 | All 4 identity problems were clear and quick to settle. The transposed-digit hint and "Do not attribute by bed" are excellent. A nameless row still offers "Keep it as written". |
| T4 Review | done (I overrode 4 suggestions) | 16 | 4 | Most rows are fast. "Keep one" never says which row it keeps. The "On this device" badges contradict the header. It suggests I apply controlled-drug and anticoagulant corrections myself. |
| T5 Questions for the nurse | partly | 2 | 2 | Easy to find. But the questions have no patient name, bed or time, ask the wrong thing ("Are these the same act?"), are duplicated, and there is no way to send them or record the answer. |
| T6 Worklist | done | 6 | 4 | Export and ticking work. The CSV puts times out of order across midnight and has no dates. Questions have blank identity columns. The hospital number format is inconsistent. There is no audit of my decisions. |
| T7 Result | done | 2 | 4 | Easy to read, but it marks my safe choices in red as "Acts lost 3", the same as the lazy shortcut. It doesn't say which 3. |
| T8 Own files | partly (stopped at 29/50 on purpose) | 19 | 3 | Upload is simple and "Patient data sent anywhere: none" is reassuring. Without the model, documented corrections are labelled "Typed twice", "Keep one" keeps the uncorrected row, and two morphine doses are paired as one. I stopped trusting it. |

## 3. Issues (most severe first)

**I1. T8 review, no model: documented corrections are labelled "Typed twice", and "Keep one" silently keeps the wrong (earlier) row.**
- **What happened:** with my own files and no on-device model, the "Corrected later" section disappeared. Three corrections were listed under "Typed twice. Same act, worded differently":
  - enoxaparin "given" became "NOT given, pt refused / was logged as given by mistake";
  - oxycodone went from 5mg to "corrected by JM: dose was 10mg";
  - the bed move time was "corr. time: moved at 02:30 not 02:00 (JM)".
- There was no "Apply the correction" button. I tested "Same act: keep one" on Henry Walsh. Lantern said "Decided: earlier row kept, later row marked as a copy", so the bed move goes in at 02:00 and JM's correction is thrown away. The same button would keep "Enoxaparin given" and "Oxycodone 5mg".
- In the drill, a rule caught these ("Rule Lantern overrides this: the later row documents a correction"), but it did not fire here.
- **Expected:** the correction markers ("corr.", "corrected by", "NOT given", "by mistake") are plain text, so they should be caught without any AI. Under no circumstances should it say "typed twice".
- **Severity 4.**
- **Quote:** "Heading says 'Typed twice' for 'given' versus 'NOT given, pt refused'. If I'm rushing and press keep one, that's the wrong record for a blood thinner."
- **Fix:**
  - Run the correction rules without the model and keep a "Corrected later" section.
  - When unsure, title it neutrally ("Two rows at the same time: decide").
  - Make "Keep one" ask which row to keep, or show "Keeps: earlier row (02:00)" on the button.

**I2. T8 review, no model: two different morphine doses paired as one, and the real duplicate suggested as a new dose.**
- **What happened:** Fatima Rahman's 22:30 morphine (earlier file) was paired with the 01:45 morphine (later file, "pain still 6/10") under "Typed twice", although they are 3h15 apart. The real re-typed copy of the 22:30 dose ("morphine 2 mg s/c", no time, "pain 7/10, PRN") sat alone under "Only in the newer file. Logged after the first email" with "Keep it (suggested)". Following the layout loses one controlled-drug dose and adds a phantom one.
- **Expected:**
  - Rows with explicit different times are never "typed twice" for medicines.
  - A row with no time is matched to the closest wording.
  - A timeless controlled-drug row is never "suggested" to keep.
- **Severity 4.**
- **Quote:** "Three and a quarter hours apart and it calls them typed twice. And 'logged after the first email' when there's no time at all? It's guessing."
- **Fix:** add time-distance and blank-time handling to the rule-only pairing. Never pre-suggest "Keep" on a medication row that has no time.

**I3. T5/T6 worklist and CSV: questions for the nurse carry no patient identity.**
- **What happened:** each question shows only the act text, "documenting clinician (JM): …" and "version 1 row 19". The CSV has blank Hospital number, Patient, Bed and Time columns on every "Open question" row.
- **Expected:** patient name, hospital number, bed, time, and both versions' text, so the nurse can answer without the spreadsheet.
- **Severity 4:** the nurse cannot answer safely, and an answer can easily get attached to the wrong patient.
- **Quote:** "A nurse gets 'Enoxaparin 40mg SC, are these the same act, version 1 row 21'. She'll say 'which patient?'"
- **Fix:** carry the full patient identity and both row texts into every question, on screen, in print and in the CSV.

**I4. T5: question wording is generic, duplicated, and has no way back.**
- **What happened:**
  - I sent the oxycodone and enoxaparin pairs to the nurse because of the dose and the given/not-given conflict. The question generated was "Are these the same act?", listed twice (once per row), so 7 questions for 5 problems.
  - I could not type my own question.
  - There is no "send to JM" and no place to record the nurse's answer or who answered. JM and KS are night staff and have gone home.
- **Expected:**
  - One question per problem, specific: "Earlier says 5mg, later says 10mg (corrected by JM). Which dose was given?"
  - An editable note.
  - An "answer received" field with name and time.
- **Severity 3.**
- **Quote:** "That's not my question! I wanted 'was it 5 or 10mg?'"
- **Fix:** merge the paired questions, generate specific wording from the difference, add a free-text note, and add answer capture.

**I5. T6 worklist: "in time order per patient" is wrong across midnight, and there are no dates.**
- **What happened:** the order puts the night upside down:
  - George Mills: 05:30 BM 6.2 is listed before 22:45 BM 3.1 and 23:05.
  - Thomas Hale: 02:50 before 22:10.
  - Ana Ribeiro: 03:00 before 21:55.
- No column says Sunday or Monday. Late entries in the EPR need the date.
- **Expected:** chronological order through the night, with the date on every row.
- **Severity 3:** an act typed with the wrong date or in the wrong order is a wrong record.
- **Quote:** "If I typed these top to bottom, the hypo would go in after the recovery."
- **Fix:** derive dates from the outage window (21:40 Sun to 07:40 Mon), sort by date and time, and show "Sun 22:45" / "Mon 05:30" in the screen and the CSV.

**I6. T4/T6/T7: role boundary. It expects the clerk to apply clinical corrections, and scores safe deferral as failure.**
- **What happened:**
  - "Apply the correction (suggested)" was offered to me for a controlled-drug dose change (oxycodone 5→10mg) and an anticoagulant given→not given.
  - The worklist asks me to tick clinical acts (fall, neuro obs, furosemide) as "entered" as if I typed them.
  - The result screen showed my column in red: "Acts lost 3" (same as "Use the latest file") and "Documented corrections applied 1/3", because I sent those rows to the nurse. It never says which 3 were "lost".
- **Expected:**
  - Lantern asks who I am.
  - It splits the output: ADT, bed moves and admissions for the clerk; late clinical entries for each nurse.
  - It counts "sent to nurse" as pending, not lost.
- **Severity 3.**
- **Quote:** "I didn't lose anything. I sent them to the nurse, on purpose, because a clerk doesn't change a controlled-drug dose."
- **Fix:**
  - Add a role choice at the start, and split the worklist by who may enter what.
  - Score "asked the nurse" on a clinical correction as correct.
  - List the "lost" acts by name.

**I7. T4: "Same act: keep one" never tells you which row's wording survives.**
- **What happened:** three times (ceftriaxone, morphine, Mei Chen's oxygen) I wanted to know which version would be kept. For Mei Chen only version 1 had "RR 24". I only found out from the worklist that the earlier row was kept. Only identical pairs say "earlier row kept" after deciding.
- **Expected:** shown before I click, with a choice.
- **Severity 3.**
- **Quote:** "Keep WHICH one? This is the third time I've wanted to pick the version."
- **Fix:** label the button "Keep version 1 wording", with a link to "keep version 2 instead", or show a merged preview.

**I8. T4: the AI-location labels contradict each other.**
- **What happened:**
  - Item cards showed a green "On this device: Gemini Nano reads these as the same act" and "(on-device)".
  - The header said "0 comparisons on this device, 10 synthetic rows sent to the cloud", and the result said "On this device 0 calls, Cloud 13 calls".
  - Other cards in the same session said "no on-device model was available".
- **Expected:** one truthful label. This is the label IG will ask about.
- **Severity 3:** it undermines trust in the privacy promise.
- **Quote:** "The badge says 'On this device', the top bar says 0 on this device. Which is it?"
- **Fix:** render the badge from where the call actually ran ("Cloud, synthetic drill" / "This PC" / "Rules only").

**I9. T6/T7: no visible or exportable audit trail.**
- **What happened:**
  - The CSV doesn't record my identity fixes (Grace Owusu H-209921 → H-209912, "Anna" → "Ana"), who decided, or when.
  - The result screen says "The full audit trail has 24 entries and stays in this browser", but I could not find it. It is on a shared ward PC, and 24 doesn't match my 50 decisions.
- **Expected:** a printable or exportable log of decisions with reviewer name, time and original value.
- **Severity 3.**
- **Quote:** "If anyone asks later why the number changed, there's no trace of who decided what."
- **Fix:** add "Download audit log", ask for the reviewer's name at the start, and put the original value in the Correction column.

**I10. T6 CSV: hospital number format changes between screen and export.**
- **What happened:** Joan Pike was "H-212950" on screen and "H212950" in the CSV.
- **Expected:** consistent, and flagged if the source was written differently.
- **Severity 2.**
- **Quote:** "Which is it? I'd have to check before searching the EPR."
- **Fix:** normalise consistently and flag non-standard formats as an identity question.

**I11. T3/T6: admissions and bed moves aren't flagged as ADT work.**
- **What happened:** Joan Pike's ED admission at 03:40 and Henry Walsh's move to bed 6 appear only as ordinary acts.
- **Expected:** a "Bed state / ADT to do" list. That is literally my job after an outage.
- **Severity 2.**
- **Quote:** "I hope the worklist tells me 'admission to book', not just 'obs'."
- **Fix:** tag admit, transfer and discharge rows and show them as a separate clerk list.

**I12. T4: "Logged after the first email" is factually wrong.**
- **What happened:** the label appeared on Fatima Rahman's 01:45 morphine, which is before the 03:10 email, and on a row with no time.
- **Expected:** "Not in the 03:10 file".
- **Severity 2.**
- **Quote:** "It's timed 01:45. The first email went at 03:10."
- **Fix:** reword to a fact, not a guess.

**I13. T3/T4: "Keep it as written" is offered on unsafe rows.**
- **What happened:** the button appears on the bed-5 row with no name or number, and on "MS 10mg given", one click from entering an act against nobody or an ambiguous drug.
- **Severity 2.**
- **Quote:** "What would that even do, enter obs against nobody?"
- **Fix:** disable it for unidentified patients and error-prone abbreviations, or require a reason.

**I14. T4: the "Ask the cloud" banner stays, and the preview breaks its own promise.**
- **What happened:**
  - "6 comparisons are disputed… Ask the cloud" stayed at the top after all 50 rows were decided.
  - The promise says "no names, hospital numbers or beds", but the preview includes "Moved to bed 6 (side room)" and nurse initials.
- **Severity 2.**
- **Quote:** "That's a bed, after it promised 'no beds'. IG would pick up on that."
- **Fix:** hide the banner once rows are decided, and scrub bed references or reword the promise.

**I15. T1: nothing tells me who stands behind it.**
- **What happened:**
  - No owner, organisation, IG/DPIA note or support contact.
  - "Gemini Nano" and "Prepare this device" mean nothing to me, and our ward PCs are locked down.
  - The story casts the user as the clinical secretary.
- **Severity 2.**
- **Quote:** "Who made this? No trust name, no IG statement. I'd want IT to say it's OK first."
- **Fix:** add a "Who made this / data protection" link, use plain words ("AI that runs on this PC"), and say "ask IT to prepare this PC".

**I16. T6: CSV of patient names dropped into Downloads on a shared PC, with no warning.**
- **Severity 2.**
- **Fix:** warn about where it is saved, or offer Print as the main route.

**I17. T2: small navigation and wording friction on the column screen.**
- **What happened:** the button to proceed is at the very bottom ("Compare the two versions", not "Continue"). "Read from the values" and "Header and values agree" are unexplained.
- **Severity 1.**
- **Fix:** add a sticky action button and a one-line legend.

**I18. Cosmetic: "Lost when the sheet was edited?." has stray punctuation.**
- **Severity 1.**

## 4. What worked
- Grace Owusu: "row says H-209921, census says H-209912 (looks like transposed digits)" with a one-click "Use the census". This is exactly the check I do by eye, only faster.
- The bed-5 row with no name: "Do not attribute by bed." Correct, and it only let me ask the nurse.
- "MS 10mg" flagged as an "Error-prone abbreviation: Lantern never interprets these".
- It caught the fall at 23:40, the neuro obs, and the family phone call that were lost when the reply-all copy was sorted. That alone would justify opening it.
- Both versions side by side with cell references (E10, row 25), so I could find the original in the spreadsheet.
- Henry Walsh's later act showed bed 6, so it followed the move. The worklist showed the time correction as struck-through 02:00 → 02:30.
- "Keep one of each identical pair (12)" saved 12 clicks.
- In own-files mode the banner read "Patient data sent anywhere: none". That's the sentence I want on every screen.
- The worklist refused to pretend: "21 rows still have no decision, so this list is not complete."
- The column mapping was right first time, even with "Hosp no" and "Time given". Upload was simple, with file names shown on the buttons.
- The whole drill took 6 minutes. The comparison wait was about 1 minute.

## 5. Interview answers (in character)
1. **Would you use it in the next real outage?** For the admin side, yes: checking who's who against the census, finding duplicate rows and rows that vanished. I'd use it only if the "Typed twice" mistakes without the AI are fixed (our PCs won't have Gemini anything), the questions carry patient names, and IT and IG have signed it off. I would not let it near medication rows as it is.
2. **What would stop you?** IG and IT first: "is this approved, who made it, where does the data go?" Then the matron: clerks don't enter clinical entries, and the tool should know that. The nurses won't answer a question that says "version 1 row 19". Time isn't the problem; the trust in the result is.
3. **Words you didn't understand or would rename:**
   - "Gemini Nano" and "Prepare this device": I'd say "AI on this PC" and "set up by IT".
   - "Ask the cloud": too vague, I'd say "Ask Google's AI".
   - "Acts": I'd say "entries".
   - "Documenting clinician": I'd say "nurse who wrote it".
   - "Disputed": I'd say "needs a person to decide".
   - "Read from the values" versus "Header and values agree": I'd drop both.
   - "Corrected later" is good. "Typed twice" is good only when it's true.
4. **What did you expect that wasn't there?**
   - A list of admissions, transfers and bed moves for me (ADT).
   - Dates.
   - A way to send a question to a named nurse and record her answer.
   - A choice of which version to keep.
   - An audit log with my name on it.
   - A "who made this / data protection" page.
   - A reminder that a fall needs a Datix.
5. **What felt risky or wrong?**
   - Without the AI, "given" and "NOT given" were offered as "typed twice", and keep-one kept "given".
   - Two morphine doses three hours apart were paired as one.
   - The app suggested I apply a controlled-drug dose change.
   - The scoring called my caution "acts lost".
   - The "On this device" badge was untrue.
6. **How do you do this today?** Paper downtime pack, a printed census, highlighters, and the two spreadsheets open side by side in Excel. I do the ADT and bed moves; each nurse back-documents her own entries as late entries. It takes most of a morning after a long outage. With Lantern the identity checks and duplicate-finding are clearly faster, and it found lost rows I could have missed. For medication corrections it is currently less safe than my highlighter, because a wrong label nudges you to the wrong button.
7. **One thing to change first:** make the correction detection work without the AI, and make "keep one" show which row it keeps. Never present a correction as "typed twice".

## 6. SUS (simulated, indicative only)
| # | Item | Score (1-5) |
|---|---|---|
| 1 | I think that I would like to use this system frequently | 3 |
| 2 | I found the system unnecessarily complex | 2 |
| 3 | I thought the system was easy to use | 4 |
| 4 | I think that I would need the support of a technical person to be able to use this system | 3 |
| 5 | I found the various functions in this system were well integrated | 3 |
| 6 | I thought there was too much inconsistency in this system | 4 |
| 7 | I would imagine that most people would learn to use this system very quickly | 4 |
| 8 | I found the system very cumbersome to use | 2 |
| 9 | I felt very confident using the system | 2 |
| 10 | I needed to learn a lot of things before I could get going with this system | 2 |

Score: odd items (2+3+2+3+1 = 11) plus even items (3+2+1+3+3 = 12) = 23 × 2.5 = **57.5** (below the usual 68 average). It is easy to drive and hard to trust.

## 7. Verdict
**Would use if…** the no-model mode stops labelling corrections as "Typed twice", "keep one" shows or asks which row it keeps, questions carry patient identity and can be answered, and IT/IG have approved it.

The 3 main reasons:
1. **It saves real time on my part of the job.** The identity checks against the census, the rows lost when the sheet was sorted, and the bulk handling of identical pairs are faster and more thorough than me with two Excel windows.
2. **On a real ward PC (no on-device AI) it steers toward wrong medication records.** "Given" versus "NOT given" and 5mg versus 10mg sit under "Typed twice", keep-one silently keeps the uncorrected row, and two morphine doses are paired as one.
3. **The output isn't usable as handed over.** The questions have no patient names, times are out of order with no dates, there's no audit of decisions, and the worklist assumes the clerk enters clinical acts.
