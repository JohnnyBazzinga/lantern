# Lantern

**Re-entry after hospital IT downtime: from several emailed versions of an improvised spreadsheet to one validated worklist, on the device.**

When a hospital's electronic record goes down, wards keep caring for patients and write it down wherever they can: on paper, and in a spreadsheet on a ward PC that gets emailed around and edited in parallel. When the systems come back, someone, often a clinical secretary like our persona **Rita**, has to type all of it back into the record. She does it from several conflicting copies: rows re-typed in different words, corrections, acts that exist in only one copy, and patients identified by bed only. Lantern helps her do that reconciliation. It reads the files in the browser and works out what each improvised column means. It compares the versions with Gemini Nano on the device, checks every model verdict against deterministic rules, and ends with a re-entry worklist where every row has a decision, every act links back to its source cell, and anything ambiguous is sent back to the clinician who wrote it.

Built for Google's **#BuildHybridAI 2026** hackathon with **Firebase AI Logic hybrid inference** (Gemini Nano in Chrome, Gemini in the cloud).

> Lantern is a documentation aid, not a medical device. It does not diagnose, dose or triage, and it never writes into any record system. All data in this repository is synthetic: fictional hospital, patients and staff.

## The problem, briefly

- During the 2021 HSE ransomware attack, a paediatric ED in Dublin ran on an Excel census for 23 days. Record errors rose to **19.7% from 4.7%**, and 175 return visits carried another patient's ID number ([Leonard et al., 2023](https://www.cambridge.org/core/product/1B36FA7C5C1A8C924F7C88E63FCD8467/core-reader)).
- 96% of 50 large US health systems had at least one unplanned downtime in three years ([Sittig et al., 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC3986310/)).
- The ONC SAFER Guide asks for "a process… to ensure… information recorded on paper… gets entered and reconciled into the EHR" ([SAFER Guide 2025](https://healthit.gov/wp-content/uploads/2025/06/SAFER-Guide-2.-Contingency-Planning-Final.pdf)).
- In Portugal, the Ordem dos Médicos says acts recorded during an outage must be incorporated into the electronic record "as soon as possible" afterwards. It gives no method for doing so ([Parecer 05.2024](https://ordemdosmedicos.pt/files/pdfs/3e14-S2024_13551.pdf)).

## Try it

**https://lantern-downtime.web.app**

1. **Start the Ward 7B drill.** It is a synthetic night shift: a census plus two emailed versions of the downtime log, with the traps real logs have.
2. Check what Lantern read each column as. Choose **Compare the two versions**.
3. Review the queue. It is ordered patient identity first, then questions for the nurse, corrections, rows typed twice, rows missing from the newer file, new rows, and identical rows. The original cells are shown side by side, with differences highlighted.
4. Open the **re-entry worklist**: export it as CSV or print it, and tick each act off as it is entered. **See how the drill went** compares your result with the answer key and with two common shortcuts.

The experience depends on the browser:
- **Desktop Chrome with Gemini Nano:** everything runs on the device and works offline once loaded.
- **Any other browser:** the drill still works through the SDK's automatic cloud fallback, and every call says where it ran.
- **Your own files** ("Use your own files") never leave the browser. Without Gemini Nano they are compared by hand, with identical rows and identity problems still found by code.
- **`#/lab`:** diagnostics and the benchmark runner (spikes S1–S5).

## How Lantern uses Firebase AI Logic hybrid inference

One SDK (`firebase/ai`, `GoogleAIBackend`), three deliberate routes (`src/ai/models.ts`):

| Route | Inference mode | Data | Used for |
|---|---|---|---|
| `user-local` | `ONLY_ON_DEVICE`, behind Lantern's own availability guard | files the user imported | column mapping, "same act?" pair judgments |
| `drill-hybrid` | `PREFER_ON_DEVICE` | the bundled synthetic drill | the same tasks; without Gemini Nano the SDK falls back to the cloud |
| `cloud` | `ONLY_IN_CLOUD` | bundled synthetic drill only | an independent second opinion on disputed pairs, with the patient's other rows as context |

- **Guard against the SDK sending local data to the cloud.** In firebase 13.4.0, `ONLY_ON_DEVICE` is sent to the cloud when `LanguageModel` is missing (issue #10635). Lantern therefore checks `LanguageModel.availability()` itself and refuses user-data prompts unless the result is `available` (`src/ai/capability.ts`).
- **Cloud payload guard.** A file may contribute to a cloud prompt only if it is a bundled drill file recognised by the SHA-256 of its bytes (`src/ai/cloudPayload.ts`). An imported file can never pass, whatever its name.
- **App Check** with reCAPTCHA Enterprise and limited-use tokens. A token is requested only when a call actually goes to the cloud, so on-device work needs no network. AI Logic is set to require App Check.
- **Remote Config** (`remoteconfig.template.json`) sets four values: `cloud_model` (`gemini-3.5-flash-lite`), `cloud_fallback_model` (`gemini-3.6-flash`), `cloud_second_opinion_enabled`, and the reserved `prompt_set_version` and `local_batch_rows`. Values are frozen per page load and fall back to in-code defaults offline.
- **Provenance ledger** (`src/ai/ledger.ts`). It records one entry per call: task, prompt version, mode, `inferenceSource`, model, latency, cold start, references (never contents) of what was sent, and the number of requests a network watcher saw reach a Gemini endpoint during the call. It is shown live while Lantern works and in the margin of each review item.
- **Models do the language, code does the rest.** Parsing, exact copies, patient identity, candidate pairs, the time and correction rules, dispositions and the worklist are deterministic (`src/core/`). Error-prone abbreviations (an ISMP subset, e.g. "MS") are never interpreted. They become open questions. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Results so far

These come from a **synthetic drill on the developer's laptop**: n = 1 machine, no usability study. Full detail is in [docs/EVALUATION.md](docs/EVALUATION.md).

| Method (Ward 7B drill, 21 same-act pairs) | Same-act recall | False merges | Corrections found | Open questions kept | Ready for re-entry (expected 27) |
|---|---|---|---|---|---|
| Take the latest file only | 0/21 | 0 | 0/3 | 0/2 | 26 (3 acts lost) |
| Merge identical rows only | 12/21 | 0 | 0/3 | 2/2 | 36 (9 acts entered twice) |
| Lantern, Gemini Nano only (runs 4–5) | 21/21 | 0 | 3/3 | 2/2 | 27 |
| Lantern, no Nano, cloud fallback + second opinion | 21/21 | 0 | 3/3 | 2/2 | 27 |

- With Gemini Nano, the whole comparison took about 21 s, plus 12.7–15.1 s of column mapping, with no cloud call.
- Nano alone got 7 of 11 pair relations right. Lantern's rules brought that to 11/11: three documented corrections were promoted to amendments, and one genuine repeat dose was separated by time.

### Simulated usability study

Four LLM-simulated participants on two model families worked through the product: a clinical secretary, an NHS ward clerk, a nurse in charge and a hospital security lead. Two desk reviews covered who re-enters what after downtime, and the adoption constraints. All four found the same severity-4 problem: with no on-device model, a documented refusal could reach the list as given. It is fixed, along with 16 other findings. The study also changed the workflow: Rita now prepares the re-entry, enters admissions and transfers herself, and hands each nurse a list of their own late entries, as published downtime procedures and the Ordem dos Enfermeiros require. These are hypotheses from simulated users, not usability evidence. See [docs/evaluation/usability-simulated-2026-11-21.md](docs/evaluation/usability-simulated-2026-11-21.md).

## Where it can run

On-device inference needs desktop Chrome (148 or later) on Windows 10/11, macOS or Linux. The machine needs more than 4 GB of VRAM, or 16 GB RAM and 4 CPU cores, plus 22 GB of free disk and a one-time model download of about 4 GB, done before an outage. The SPMS 2024 workstation specification (32 GB RAM, 16+ cores) qualifies; older 8 GB PCs, thin clients and Chrome published through Citrix/VDI do not. Hardened Chrome baselines disable the model (`GenAILocalFoundationalModelSettings`), so IT must allow it. Without the model, Lantern still runs: its rules find copies, corrections, repeated doses and identity problems, and the reviewer decides the rest.

## Privacy

- Imported files are parsed in the browser and stay in its IndexedDB. Nothing about them is uploaded or synced.
- Prompts built from imported files run only on Gemini Nano. If the device has no ready model, Lantern blocks the call and makes no request (measured, Lab S2).
- The cloud only ever sees the bundled synthetic drill, enforced by content hash. The reviewer can preview the exact second-opinion request before sending it. It carries no patient name, hospital number or bed field.
- Every model call is in the ledger with the measured number of requests that reached a Gemini endpoint. Details are in [docs/PRIVACY.md](docs/PRIVACY.md).

## Run it locally

```bash
npm install
cp .env.example .env.local   # your Firebase web config + reCAPTCHA Enterprise site key
npm run dev                  # http://localhost:5173  (#/lab for diagnostics)
npm test                     # Vitest: parsing, mapping, cloud guard, the drill end to end
npm run build                # type-check + production build (PWA, precaches the drill)
npx firebase deploy --only hosting,remoteconfig
```

To set up a Firebase project:
1. Enable AI Logic with the Gemini Developer API.
2. Register a web app.
3. Create a score-based reCAPTCHA Enterprise key for your hosting domains and register it in App Check.
4. For local development, set `VITE_APPCHECK_DEBUG=true` and register the printed debug token. Never commit it.

On-device inference needs desktop Chrome with Gemini Nano ([hardware requirements](https://developer.chrome.com/docs/ai/get-started)). Gemini Nano supports English, Spanish, Japanese, German and French, so the drill and prompts are in English.

### Languages

The interface is in English and European Portuguese, switched with the EN/PT button on every screen (or `?lang=pt` in the address; the default follows the browser). The switch changes the words, never the decisions: a test runs the same sheet in both languages and compares every proposal (`tests/core/i18n.test.ts`).

- **What is translated:** every screen, the questions for the nurse, the late-entry note to paste into the record ("Registo diferido, após indisponibilidade do sistema. Hora original: …"), the reasons behind each suggestion, and the CSV. In Portuguese the CSV uses semicolons and a UTF-8 byte-order mark, which is what Excel expects in Portugal.
- **What is not:** rows are always shown exactly as typed. The drill's rows, the prompts and the model's quoted evidence stay in English, because Gemini Nano does not accept Portuguese. The Lab page for IT is English only.
- **Portuguese sheets:** the deterministic rules read Portuguese ward shorthand as well as English (corrections such as "NÃO administrada", "por engano", "corrigido"; admissions and transfers; high-alert medicines such as morfina, enoxaparina, insulina; "segundo enf. KS"; falls). Columns such as Cama, Doente, N.º processo, Hora, Intervenção, Observações and Enf. are recognised without a model. CSV files are read as UTF-8 or as Windows-1252, the encoding of Excel's plain CSV in Portugal. Gemini Nano is not validated on Portuguese text, so on those sheets the rules carry the safety and the model only proposes.

## Project layout

```
src/ai/          model routes, capability guard, cloud payload guard, network watcher, ledger, prompts/v1
src/core/        deterministic pipeline: parse, profile, mapping, acts, identity, candidates, reconcile, worklist, score; drugs.ts (same-medicine rows); i18n.ts (clinical wording, EN/PT)
src/i18n/        interface language: state, EN/PT switch
src/app/         pipeline orchestration, review items, session state (Dexie/IndexedDB)
src/screens/     Start, Sources (columns), Review, Worklist, Result, Working overlay, Lab
src/firebase/    Firebase init + App Check, Remote Config
scripts/         build-drill.mjs: generates the synthetic drill and its answer key
public/fixtures/ drill/ (frozen benchmark) and dev/ (tuning sheets)
tests/core/      Vitest suites
docs/            ARCHITECTURE, PRIVACY, EVALUATION, evaluation/ (dated raw logs)
```

## Built during the hackathon

The repository was created on 2026-11-21, and all code in it was written from that date on, for this hackathon. No pre-existing project code was reused.

Third-party libraries:
- Firebase JS SDK 13.4.0 (AI Logic, App Check, Remote Config)
- React 19
- Dexie 4
- SheetJS Community Edition 0.20.3
- lucide-react
- Tailwind CSS 4
- Vite 8 with vite-plugin-pwa
- Vitest
- TypeScript

Fonts are Atkinson Hyperlegible Next and Mono, and Literata for large titles, bundled with the app (`@fontsource-variable`), so they are available offline.

## Licence

[Apache-2.0](LICENSE)
