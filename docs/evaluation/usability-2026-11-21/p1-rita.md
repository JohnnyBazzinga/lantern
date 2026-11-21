# P1 · Rita Matos · Lantern usability session

## Persona

I am Rita Matos, 52, a clinical secretary with 22 years on an internal medicine ward in a Portuguese public hospital. I handle admissions, transfers, discharge paperwork, Excel lists, Outlook and the phone on a shared ward PC.  
After the last outage I spent nearly a week chasing missing and duplicate entries. I can check a hospital number and trace a row. The nurse who documented care has to settle clinical questions.

## Tasks

SEQ runs from 1 (very difficult) to 7 (very easy). The command numbers follow the session in order. I used 64 browser-harness commands on port 9301.

| Task | Outcome | Harness commands used | SEQ | My note |
|---|---|---|---:|---|
| T1 · First impression | done | 1–3 · open, shot, click | 5 | Before clicking, I recognised the two emails and expected to compare them before typing. The fictional-patient note explained “drill.” For real names I would need IT approval. |
| T2 · Columns | done | 4–9 · look ×2, click Compare, look, wait, shot | 5 | I checked all three sets of headers against their examples, including the separate comments in the newer file. All mappings fit. During comparison I saw two errors, waited and reached review. |
| T3 · Patient identity | done | 10–16 · 7 clicks across the four cases | 4 | I used the census spelling for Ana, kept Joan's documented new admission and referred Grace's number and the unnamed bed 5 to their authors. Two identities still needed an answer on the ward. |
| T4 · Review | done | 17–45 · 29 clicks, including reopening Ana and checking each identical pair | 4 | Reached 50/50 source rows decided. I referred a missing time, a dose change, a refusal and incomplete clinical detail. |
| T5 · Questions for the nurse | done | 46–47 · open worklist, shot | 3 | I found 12 question cards for seven concerns. I would have to reconstruct several questions and contact JM or KS myself. |
| T6 · Re-entry worklist | done | 48–51 · download, tick three checkboxes | 6 | The CSV downloaded. The first three ticks moved the counter from 0 to 3 of 22. |
| T7 · Result | done | 52 · click See how the drill went | 4 | I could read the comparison. “22 entered” contradicted my three ticks, and the score gave me no way to trace the five reported losses. |
| T8 · Own files | partly | 53–64 · open, upload ×3, open files, look, compare, open Omar, shot, refer, open Fatima, refer | 2 | Imported all three files and reached manual review. I stopped at 4/50 after referring two pairs. I would need the night nurse and her paper sheet to continue safely. |

## Issues, most severe first

| ID | Task and screen | What happened | What I expected | Severity (0–4) | My words during the session | Suggested fix |
|---|---|---|---|---:|---|---|
| P1-01 | T8 · Imported files, Omar | The heading said “Typed twice. Same act, worded differently.” The earlier row said enoxaparin 40 mg and the later row explicitly said “NOT given” and that the original entry was a mistake. Below them, the app said no on-device model was available. My choices were keep one, keep both or ask the nurse. | The refusal and its author should be the first things I see. The wording should leave the administration status open for KS. | 4 | “Uma linha diz «NOT given» e em cima leio «Same act, worded differently».” | Put conflicting administration status in a nurse-review group with both sources. Show the exact text that would reach the record before allowing a merge. |
| P1-02 | T8 · Imported files, Fatima | The manual review paired 22:30, pain 7/10, with 01:45, pain 6/10, under “Typed twice.” The untimed line appeared under “Only in the newer file.” Keeping one could suppress a distinct dose. I referred the pair. | I need all three candidate rows together, with the different or missing times prominent. | 4 | “22h30 e 01h45, com valores de dor diferentes, em «Typed twice».” | Show the three rows together as a question for JM. Require explicit confirmation before collapsing entries with different documented times. |
| P1-03 | T3–T5 · Identity and handoff | For Grace, the article header already showed the census number. Asking about the conflicting number showed “Settled: sent to the nurse,” yet the act could still be merged. After I referred the act too, both handoff cards asked only whether it was the same act. Neither showed the two numbers. The unnamed bed 5 also offered “Keep it as written” after referral. I did not try either risky choice. | A pending identity should travel with the act and prevent re-entry until someone verifies the patient. | 4 | “A da Grace perdeu os dois números e a da recusa só pergunta se é o mesmo ato.” | Keep unresolved identity visible on every related row. Carry both identifiers and the precise question into a single handoff. Require the nurse's recorded answer before release. |
| P1-04 | T5 · Questions for the ward | Five referred pairs became ten separate cards. Each card asked about “these” acts but showed just one row, without patient or time. The oxycodone and refusal questions both became “Are these the same act?” I found initials and row references, but no place on this screen to record the answer. | I need one question I can put to the right nurse, with its reason, both pieces of evidence and a place for her answer. | 3 | “Há doze perguntas para sete assuntos.” | Group by author and case. Carry through both source rows and the reason for referral. Provide pending, answered and signed states and distinguish a prepared question from a delivered one. |
| P1-05 | T6 · Overnight order | George's 05:30 reading appeared above 22:45 and 23:05 from the preceding evening. Thomas's 02:50 entry also preceded 22:10. The worklist promised time order per patient. | I follow the shift from the previous evening into the morning when checking what happened next. | 3 | “No George, as 05h30 aparecem antes das 22h45 da véspera.” | Show the date or shift day with the time and sort on both. |
| P1-06 | T7 · Result | The result counted 22 acts as “entered” after I ticked three. It also reported five “lost” and two of two questions returned. The worklist showed 12 pending cards. I could not tell my manager which five were missing or how many were safely awaiting confirmation. | I need separate totals for ready, actually entered, pending with a named person and genuinely missing, with the rows behind each count. | 3 | “Diz que lancei 22, mas só marquei três.” | Label the answer-key comparison as a projected result. Keep the actual entry count visible and link each difference to the review decision. |
| P1-07 | T4 · Keeping one of a pair | For Mei, the later row lacked “RR 24.” The pre-decision button said only “keep one.” I hesitated over which wording survived and referred her pair. A completed identical pair later explained that the earlier row was kept. | I want to see exactly which text and comments survive before I agree. | 3 | “Não sei que texto fica quando carrego em guardar um.” | Preview the retained row and flag details found only in the other copy. |
| P1-08 | T2–T4, T7 · Comparison status | The wait showed local comparison errors. In review, several explanations said “On this device” and named Gemini Nano, while the header said zero local comparisons. The result reported zero local calls and 13 cloud calls on fictional rows. I understood that the exercise could use the cloud. I could not reconcile the labels for the same run. | A clear, consistent statement of how each suggestion was reached and whether I need to do anything about an error. | 2 | “Diz que está a comparar e já vejo «error» duas vezes.” | Display the method actually used for each pair and explain recoverable errors in ward language. |
| P1-09 | T1, T8 · Language and the shared PC | “Drill,” “census” and “worklist” slowed me down. Reopening the site showed “Resume your last review.” I could not tell who could reopen it on this shared PC. This was a concern, not an observed disclosure. | Familiar Portuguese labels and a clear explanation of who can resume a session and how to close it at handover. | 2 | “Quem se sentar a seguir verá o mesmo botão?” | Use Portuguese ward vocabulary. Explain session access and provide an explicit handover or close-session action. |

## What worked

- The 21:40, 03:10, 07:40 and 08:30 timeline described the problem in the same order I knew it from Outlook. The dark start button and the fictional-patient sentence were visible together.
- Seeing sample values next to each proposed column let me recognise a hospital number and the nurses' initials myself. The email times distinguished the two versions.
- Ana's spelling warning gave me the shared hospital number. Joan's row included the ED admission and time. The unnamed observation explicitly warned against assigning it by bed.
- The side-by-side file names, row numbers, initials and yellow highlights helped me catch Omar's refusal even when the group title misled me. Henry's signed time correction retained a link to each version on the worklist.
- The older-only group recovered both Peter's fall and his follow-up observation. They were the first two entries on my worklist.
- The CSV download completed. The checkbox counter gave me a simple place to resume after the phone rang.

## My decision notes

### Drill review

I reviewed 29 items covering 50 source rows. “Keep” here means put an act on the appropriate person's re-entry list. These choices did not write into a hospital record.

| Item | Decision and reason |
|---|---|
| Ana Ribeiro, 21:55 | Used the census spelling because the number matched. Kept one act after comparing time, initials, 1 g IV and temperature across the two descriptions. |
| Grace Owusu, 00:20 | Asked KS about H-209921 versus H-209912, then referred the paired act as well. A plausible digit swap is insufficient identification. |
| Joan Pike, 03:40 | Kept identity as written and retained the act. The named, numbered ED admission explicitly occurred after the 21:00 census. |
| Bed 5, 05:00 | Referred to JM. Blood pressure and bed alone cannot identify the patient. |
| F. Rahman, 04:20 | Asked JM to spell out “MS 10mg given.” I would copy her signed clarification. |
| Henry Walsh, 02:00/02:30 | Applied the documented administrative correction. JM explicitly identified 02:30 as the transfer time. |
| Ines Duarte, 02:20 | Asked JM to validate and record the signed change from 5 to 10 mg. I saw the correction and would leave clinical sign-off with her. |
| Omar Haddad, 02:40 | Referred to KS to record the refusal and correct the earlier entry. I would not enter an administration. |
| Fatima Rahman, 22:30/untimed | Asked JM if the untimed 2 mg entry belonged here. Another timed dose existed that night. |
| Rui Costa, 00:50 | Kept one. Time, author, drug text and the new cannula in the left arm matched. |
| Ana Ribeiro, 03:00 | Kept one. Same time, initials, 37.4 and “settled” across the two columns. |
| Mei Chen, 01:10 | Referred to JM. The oxygen details overlapped, but only the earlier row included RR 24 and I could not see which text would be retained. |
| Peter Novak, 23:40 | Retained the older fall and doctor-review note. It had an author and was absent from the later sheet. |
| Peter Novak, 23:55 | Retained the later observation of GCS 15 from the older sheet as a separate timed act. |
| Henry Walsh, 03:05 | Retained the documented family phone call missing from the reply-all copy. |
| Fatima Rahman, 01:45 | Retained the separate timed morphine line with pain 6/10. Left the untimed line for JM. |
| George Mills, 05:30 | Retained the newer-only BM 6.2. Its time was after the first email. |

I checked each of the following 12 pairs individually and kept one of each. For every pair the displayed time, author and act text matched in both files.

| Patient and time | Detail I checked |
|---|---|
| Ellen Brooks, 01:00 | Furosemide 40 mg IV, JM |
| Lucia Moreno, 23:15 | NaCl 0.9%, 1 L IV, JM |
| Sofia Lind, 02:15 | 30 ml in two hours and catheter flush, KS |
| Thomas Hale, 02:50 | 500 ml bolus and subsequent BP 104/66, KS |
| Thomas Hale, 22:10 | BP 92/58, HR 104 and Dr Silva informed, KS. Kept separately from 02:50. |
| Dmitri Petrov, 00:35 | Novorapid 4 units and BM 14.2, KS |
| Nora Quinn, 02:45 | Paracetamol 1 g PO and 37.9, KS |
| George Mills, 22:45 | BM 3.1 and glucose gel, KS |
| George Mills, 23:05 | BM recheck 4.8, KS. Kept separately from 22:45. |
| Kwame Asante, 01:40 | Tube reinserted and position checked, KS |
| Liam Burke, 02:30 | Heparin rate and APTT text, KS |
| Ravi Patel, 01:25 | Metoclopramide and “vomited x2,” KS |

### Handoff and worklist

I would phone the ward extension, use the rota to identify JM and KS, and go through the original rows and paper notes with each author. I would ask JM about the untimed morphine, the incomplete oxygen observation, the oxycodone correction, the meaning of MS and the identity for bed 5. I would ask KS about Grace's two numbers and Omar's refusal. I would have each nurse date and sign the answer on the ward's downtime sheet and enter the clinical correction under her own login. I would then reopen the review, update the decision and check off the administrative follow-up. No nurse received a message or supplied an answer during this exercise.

I downloaded `9301-re-entry-worklist-2026-11-21.csv` before ticking anything. I verified the download through the browser harness. In the drill I marked Peter's fall, Peter's neurological observation and Ellen's furosemide, in that order. In the ward I would reconcile by hospital number, check whether the act was already in the record, and tick only after the responsible person confirmed it was saved. I would use a controlled ward copy so the early CSV and the live ticks could not become competing lists.

### What the result meant to me

The drill reported eight minutes, 22 of 27 expected acts, five lost, zero entered twice, zero unclear entries entered as certain, one of three corrections applied, zero repeated doses wrongly merged, two of two expected questions and four of four identity problems caught. Its latest-file example lost three acts. Its identical-row shortcut entered nine twice. Seeing the fall and its follow-up made the risk of using the last attachment concrete. I would want to trace the five apparent losses and distinguish outstanding referrals before giving those figures to my manager.

### Where I stopped with my own files

The screen read `census-7B.csv` (20 rows), `log 03h10.xlsx` (24) and `log 07h40 (reply-all).xlsx` (26). It mapped the columns, found 12 identical pairs and surfaced four identity cases. Its header said “Patient data sent anywhere: none.” Omar's detail said no on-device model was available and asked me to decide manually. Those are screen statements. I did not verify network activity. I referred Omar's conflicting pair and Fatima's two differently timed doses. At 4/50 I would hand the originals to the night nurse. I did not produce an imported-file worklist for re-entry.

## Interview

1. **Would I use it next outage?** I would use it alongside the shift lead to find missing rows and exact copies, once IT had approved the shared-PC setup and we had agreed who signs each decision. I would want to rehearse with our own column headings first.
2. **What would stop me?** At 08:30 the phone is ringing and the night nurse may already be leaving. English slows me down. My manager would need to authorise the workflow and nursing would need time to answer under their own names. I would stop at a dose change or uncertain patient number if I could not get that answer.
3. **Which labels would I change?** For “drill” I would use *exercício com doentes fictícios*. “Census” is *mapa de camas das 21h*. “Worklist” is *lista para lançar no processo*. “Settled: sent to the nurse” reads like a completed handoff. I would call that *aguarda confirmação da enfermeira* and show who still has to deliver the question.
4. **What did I expect to find?** One pending question per problem, both source rows, the patient or unresolved identifiers, a named owner and a dated answer. Before keeping one copy I also wanted a preview of the surviving text.
5. **What felt risky?** A refusal looked like a duplicate and two different morphine times were paired on my own files. A number conflict vanished from the questions. On a shared PC I would also want to know who could resume the saved review.
6. **How do I do this today?** I keep both Outlook attachments, open the sheets side by side, filter by hospital number and time, pull the paper notes and call whoever signed. I keep a tick list while the authorised person enters each act. Lantern made finding Peter's missing rows and checking exact copies quicker for me. Reconstructing the nurse questions cost time. I have no timed comparison with my usual process.
7. **One change first?** Put conflicting clinical entries into a nurse-confirmation queue before they can become “typed twice.” On Omar's card the nurse should see both lines, the refusal and the question she needs to sign.

## SUS · simulated, indicative only

Responses use 1 for strongly disagree and 5 for strongly agree.

| # | Standard item | Response |
|---:|---|---:|
| 1 | I think that I would like to use this system frequently. | 2 |
| 2 | I found the system unnecessarily complex. | 4 |
| 3 | I thought the system was easy to use. | 3 |
| 4 | I think that I would need the support of a technical person to be able to use this system. | 4 |
| 5 | I found the various functions in this system were well integrated. | 3 |
| 6 | I thought there was too much inconsistency in this system. | 4 |
| 7 | I would imagine that most people would learn to use this system very quickly. | 3 |
| 8 | I found the system very cumbersome to use. | 4 |
| 9 | I felt very confident using the system. | 2 |
| 10 | I needed to learn a lot of things before I could get going with this system. | 4 |

**SUS score: 32.5/100.** The five odd-item contributions total 8 and the five even-item contributions total 5. The adjusted sum of 13 is multiplied by 2.5.

## Verdict

**Would use if the ward approves it and a nurse owns the unresolved clinical cases.** My three main reasons are:

1. The source rows let me recover documentation that the last email had lost and account for why it belongs on the list.
2. The own-file review put a refusal and differently timed doses under “Typed twice.” I would need a reliable clinical handoff before using that list for re-entry.
3. I need to tell my manager what is ready, what is actually in the record and who still owes an answer. The ticks helped me count three entries, but the result called 22 entered.
