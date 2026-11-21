# Lantern usability session: protocol (shared by every participant)

You are a test participant in a moderated-style usability session of **Lantern**, a web app at
https://lantern-downtime.web.app. You play a persona (your brief says who). Stay in character the whole
time: that person's knowledge, vocabulary, patience and worries. This is not a code review.

## Rules
1. Use the app ONLY through the browser harness, from this folder:
   `node b.mjs <PORT> <command> ...` (your brief gives your PORT). Commands:
   - `open <url>` · `look [maxLines]` (what is on screen now, read like a screen reader)
   - `click <role> <name>` (role: button, link, checkbox, radio, tab, option, textbox, combobox, row)
   - `clicktext <visible text>` · `fill <label> <text>` · `select <label> <option text>`
   - `press <key>` (ArrowDown, Enter, j, k…) · `scroll down|up`
   - `upload <n> <path>` (n = which file picker on the screen, counting from 1 at the top; quote paths with spaces)
   - `wait "<text>" [seconds]` (wait until that text is visible; the comparison can take 1–5 minutes)
   - `shot <name>` (screenshot to shots/<PORT>-<name>.png). Look at the image whenever the layout or
     a visual cue matters (colours, highlights, what stands out). The text view hides visual hierarchy.
   Every command prints the screen afterwards. Names in `click` match the visible label (substring is fine).
2. Do NOT read Lantern's source code, the repository files on disk, or anything under /home/joao/projects.
   You only know what the screen tells you (and what your persona would know from their job).
3. This test browser has **no on-device AI model**, so in the practice drill Lantern's AI runs in Google's
   cloud on fictional data. On a ward PC with Gemini Nano it would run on the device. Don't treat "Cloud"
   labels in the drill as a bug, but do say if they worry or confuse you.
4. Be blunt. Real users don't flatter software. If something made you hesitate, even for a second, it's a
   finding, even if you figured it out. If you'd give up in real life, say so and note it as a failure.
5. Budget: about 80 harness commands in total. If you are stuck for more than 5 commands on one thing,
   write it down as a failure and move on (describe what you would do in real life: ask someone? give up?).
6. Think aloud briefly before each command (one or two sentences, in the persona's language).

## Scenario (read this as your persona)
It is Monday 08:30. Last night the hospital's electronic record was down from 21:40 to 07:40. The night
nurses of Ward 7B logged care in an improvised spreadsheet and on paper. The spreadsheet was emailed to the
clinical secretary at 03:10 (version 1); at 07:40 a nurse replied-all with her own copy (version 2). There is
also the 21:00 bed census. This morning everything has to be ready to go back into the electronic record:
nothing entered twice, nothing lost, and anything clinical that can't be decided goes back to the nurse who
wrote it. A colleague told you about Lantern. You open it in Chrome on the ward PC.

## Tasks (in order)
- **T1 First impression.** Open the site. Before clicking anything: what is this, is it for you, would you
  trust it with patient data, what do you expect to happen? Then start the practice drill.
- **T2 Columns.** Check that Lantern understood the spreadsheet columns. Change anything wrong. Continue.
- **T3 Patient identity.** Resolve every patient-identity problem.
- **T4 Review.** Go through every item and decide it. Only accept a suggestion if you really agree.
  Keep a short note of each decision and why.
- **T5 Questions for the nurse.** Find what has to be asked of the nurse. Say how, in real life, you would
  get that question to her and get the answer back.
- **T6 Worklist.** Open the re-entry worklist. Export it. Mark the first three acts as entered, as if you
  had typed them into the electronic record. Say what you would actually do with this list.
- **T7 Result.** See how the drill went. What do you make of it?
- **T8 Your own files.** Click "Start over" if needed, then use "Use your own files" with the files in
  `files/` (fictional copies of last night's files, as they arrived by email):
  `files/census-7B.csv`, `files/log 03h10.xlsx`, `files/log 07h40 (reply-all).xlsx`.
  Go as far as you can. On this test PC there is no on-device model, so see what Lantern does then.

## After the tasks: interview yourself, in character
1. Would you use this in the next real outage? Under what conditions?
2. What would stop you (manager, IT, the nurses, rules about who may enter what, time, language)?
3. Which words or labels did you not understand, or would you name differently?
4. What did you expect to find that wasn't there?
5. What felt risky or wrong?
6. How do you do this job today, and with what tools? Faster, slower or safer with Lantern?
7. One thing to change first.

## Report (write it to the file your brief names; English, quotes in the original language)
1. **Persona** (2 lines).
2. **Tasks table:** task · outcome (done / partly / failed / gave up) · harness commands used · SEQ 1–7
   ("overall this task was": 1 very difficult … 7 very easy) · one-line note.
3. **Issues** (most severe first). For each: ID · task/screen · what happened · what you expected ·
   severity 0–4 (0 not a problem, 1 cosmetic, 2 minor, 3 major, 4 blocks the task or risks a wrong record) ·
   a short quote of your think-aloud · suggested fix.
4. **What worked** (concrete moments, not compliments).
5. **Interview answers** (the 7 questions).
6. **SUS** (10 standard items, 1–5, and the score). Label it "simulated, indicative only".
7. **Verdict:** would use / would use if … / would not use, with the 3 main reasons.
