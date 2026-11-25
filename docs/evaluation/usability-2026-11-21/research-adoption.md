# What would stop a hospital from using Lantern, and how far to trust LLM-simulated usability tests

Research date: 2026-11-21. All sources were fetched on that date. Quotes are exact unless marked
"(search-snippet quote)", meaning the wording came from a search result and the full page was not opened.
Portuguese quotes are left in the original language.
Each section separates **Evidence**, which is what a source says, from **Inference**, which is my reading of it for Lantern.

---

## 1. Chrome built-in AI (Gemini Nano): requirements, languages, admin controls, offline use

### Evidence

**E1.1 Hardware and OS gate.** The desktop OS must be Windows 10/11, macOS 13+, Linux, or ChromeOS (Chromebook Plus). The machine also needs either a GPU with more than 4 GB VRAM, or 16 GB RAM with 4 cores, plus 22 GB free on the profile volume.
- Quotes: "Strictly more than 4 GB of VRAM." · "16 GB of RAM or more and 4 CPU cores or more." · "At least 22 GB of free space on the volume that contains your Chrome profile." · "Built-in models can run with GPU or CPU."
- https://developer.chrome.com/docs/ai/get-started (the same list appears on https://developer.chrome.com/docs/ai/prompt-api)

**E1.2 CPU-only mode exists but is slower.** CPU inference arrived in Chrome 140.
- Quote: "CPU support for Gemini Nano is rolling out in Chrome 140." / "inference speeds are typically faster on devices with capable GPUs"
- https://developer.chrome.com/blog/gemini-nano-cpu-support (published 1 Oct 2025)

**E1.3 Shipping status.** The Prompt API ships on desktop in Chrome 148, which reached stable on 5 May 2026 per chromiumdash. It covers Windows, Mac, Linux and ChromeOS (Chromebook Plus only), and it is not in WebView.
- Quote: "Will ship enabled for all users." · "The initial launch focuses on Windows, Mac, Linux, and ChromeOS"
- https://groups.google.com/a/chromium.org/g/blink-dev/c/iR6R7-nQeHI (Intent to Ship, 2 Apr 2026); https://chromiumdash.appspot.com/fetch_milestone_schedule?mstone=148

**E1.4 Languages: no Portuguese.** The API accepts only en, ja, es, de and fr. If a session declares an unsupported language, it can throw an error.
- Quotes: "The Prompt API accepts "en", "ja", "es", "de", and "fr"." · "Support for additional languages is in development." · developers "may receive a "NotSupportedError" DOMException if the model encounters an unsupported input or output."
- https://developer.chrome.com/docs/ai/prompt-api (last updated 21 Oct 2026)

**E1.5 Model download: 3–4 GB, silent, stored in Chrome's user-data folder.** The download starts on the first `create()` call. The network is needed only for that download, and after that inference runs offline with no data sent to Google.
- Quotes: "This file ranges from 3 to 4GB and has been silently downloaded by Chrome." (Android Authority, 6 May 2026; it puts the file under `...\Chrome\User Data`, folder `OptGuideOnDeviceModel`) · "The initial model download is triggered by the first call to a `*.create()`" · "Subsequent use of the model does not require a network connection." · "No data is sent to Google or any third party when using the model."
- https://www.androidauthority.com/google-chrome-weights-bin-ai-model-download-explained-3664043/ ; https://developer.chrome.com/docs/ai/understand-built-in-model-management (21 Oct 2025); https://developer.chrome.com/docs/ai/get-started

**E1.6 The model can disappear, even in the middle of a session.**
- Quotes: "If the available storage space falls to less than 10 GB after the download, the model is removed from your device." · purged "if a user hasn't met other eligibility criteria for 30 days" · purging can happen "at any time, even mid-session, without regard for running prompts" · "the model is purged if an enterprise policy disables the feature."
- https://developer.chrome.com/docs/ai/understand-built-in-model-management ; https://developer.chrome.com/docs/ai/prompt-api

**E1.7 Admin kill switch #1: `GenAILocalFoundationalModelSettings`.** This is a per-machine policy that applies from Chrome 124. It is on by default, including on managed devices, and the value 1 deletes the model.
- Quote: "When the policy is set to Allowed (0) or not set, the model is downloaded automatically, and used for inference. When the policy is set to Disabled (1), the model will not be downloaded, and the existing model (if already downloaded) will be deleted." · "model downloading can also be disabled by setting ComponentUpdatesEnabled to false." (`per_profile: false`, `default: 0`)
- https://chromium.googlesource.com/chromium/src/+/main/components/policy/resources/templates/policy_definitions/GenerativeAI/GenAILocalFoundationalModelSettings.yaml

**E1.8 Admin kill switch #2: `BuiltInAIAPIsEnabled`.** This one applies from Chrome 137, per profile, and is on by default. It blocks web pages from using the APIs while leaving Chrome's own on-device features alone.
- Quote: "If the policy is enabled or unset, the APIs are enabled to be used. If the policy is disabled, attempting using the APIs will result in an error."
- https://chromium.googlesource.com/chromium/src/+/main/components/policy/resources/templates/policy_definitions/Miscellaneous/BuiltInAIAPIsEnabled.yaml

**E1.9 `GenAiDefaultSettings` is a different policy, and it is cloud-only.** It sets defaults for Chrome's own covered GenAI features, such as Gemini in Chrome and Lens. Its default for enterprise users is 1, which means "allow without model improvement".
- Quote: "1 is the default value for Enterprise users managed by Google Admin console" (`cloud_only: true`)
- https://chromium.googlesource.com/chromium/src/+/main/components/policy/resources/templates/policy_definitions/GenerativeAI/GenAiDefaultSettings.yaml ; https://support.google.com/chrome/a/answer/14443058

**E1.10 A published security baseline turns the local model off.** The DISA STIG for Chrome on Windows (2025-05-15, severity medium) has the rule "GenAI local foundational model must be disabled", and its fix is "Do not download model".
- https://stigviewer.com/stigs/google_chrome_current_windows/2025-05-15/finding/V-275782

**E1.11 Firebase AI Logic hybrid needs Chrome desktop, and the default mode falls back to the cloud.**
- Quote: "the end-user of your app must be running Chrome on Desktop (version 139 or higher)". The docs also list a `chrome://flags` multimodal flag, which may be outdated now that Chrome 148 ships the API. PREFER_ON_DEVICE "falls back to the cloud-hosted model". These features don't work on-device: multi-turn chat, function calling, and PDF/audio input.
- https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference
- Open bug: "AI: ONLY_ON_DEVICE falls back to the cloud when the LanguageModel API is missing", state OPEN, created 2026-11-16. https://github.com/firebase/firebase-js-sdk/issues/10635

### Inference
- **I1.1** A managed Chrome gets Nano by default *unless* IT has applied a hardening baseline. Hospitals are a likely place for such baselines (E1.10), so expect "unavailable" on many hardened ward PCs. Getting Nano enabled requires IT to make an explicit exception, and the request must name both policies (E1.7, E1.8) plus `ComponentUpdatesEnabled`.
- **I1.2** A first-use download of 3–4 GB per PC through a hospital proxy, during or just after an outage, is unrealistic. The model has to be pre-staged before any downtime, and Lantern should surface its availability state on a calm day.
- **I1.3** Lantern's data is Portuguese: names, drug names and free text. Nano cannot be told the input is `pt`, so the app has to declare `en` and receive Portuguese text, and output quality in that setup is unvalidated by Google. Keep the AI's role narrow and verifiable (column mapping, candidate matches) with human confirmation.
- **I1.4** Firebase's PREFER_ON_DEVICE plus issue #10635 means real patient data can reach the cloud silently whenever Nano is missing. For real data the app must check `'LanguageModel' in self` and `availability()` itself, and it must refuse to fall back.

---

## 2. Ward PC reality: specs, VDI/thin clients, shared logins, lockdown

### Evidence

**E2.1 New SNS workstations would meet the CPU path. Their graphics are integrated.** The SPMS preliminary market consultation 15/2024, for PRR-funded replacement of obsolete SNS workstations, covers 10,000 desktops and 5,000 laptops. Minimum spec: "RAM >=32 GB DDR5", "CPU (núcleos) >= 16", ">=512GB Gen4x4 NVMe SSD", "Tipo de placa gráfica Integrada", "Última versão Windows OEM PRO". Stated aim: "modernização e substituição dos equipamentos obsoletos".
- https://spms.min-saude.pt/wp-content/uploads/2024/08/ANEXO_CONSULTA_PRELIMINAR_Postos_de_Trabalho.pdf (Aug 2024; this is a preliminary consultation, not the final award)
- The follow-up 2026 PRR call for "Renovação de Postos de Trabalho do SNS" appears on TED (notice 332759-2026; the PDF was not readable because of HTTP 429): https://ted.europa.eu/en/notice/332759-2026/pdf

**E2.2 The installed base being replaced was old.** This is dated evidence. In 2018, SPMS said many workstations still ran "versões Windows XP e Windows 7". In 2021 the government reported a "grande deterioração do parque informático disponível nas unidades de saúde".
- https://observador.pt/especiais/as-muitas-deficiencias-dos-sistemas-digitais-do-sns-que-o-governo-contou-a-bruxelas-mas-omitiu-na-versao-inicial/ (6 May 2021)

**E2.3 NHS (England).** "35% of trust leaders identified poor wi-fi, computers and other infrastructure problems as a barrier to progress".
- https://thenhsalliance.org/news-blogs/news/digital-transformation-hampered-by-budgets-nhs-pressures-and-poor-it-infrastructure (NHS Providers survey, 15 Oct 2024)

**E2.4 Hospital use of server-based computing and VDI is widespread, but the only figures are old vendor data.** "In EMEA, 84% of the survey participants said they are now using SBC"; "42% are using SHVD".
- https://imprivata.com/uk/node/15571 (Imprivata survey, about 300 hospital IT staff, 28 Oct 2013)
- NHS trusts running Citrix or thin clients include Bolton (IGEL thin clients), Royal Berkshire (Citrix plus badge tap), Salford, Chelsea & Westminster/Royal Marsden (SPHERE, Citrix on Azure). These are vendor case studies, mostly from 2017–2020. Example: https://www.citrix.com/customer-success/royal-berkshire-nhs-foundation-trust.html
- No 2024–2026 figure was found for the share of clinical endpoints that are thin clients. **This is a gap.**

**E2.5 Typical VDI desktops are far below 16 GB.** Knowledge-worker sizing guidance uses 2 vCPU with 4 GB, or a "2 vCPU, 8 GB memory baseline for Windows 10" (search-snippet quote). Lenovo found "4 VCPU is over sized configuration for knowledge worker profile" (search-snippet quote).
- https://www.techtarget.com/enterprise-software/tip/VMware-Horizon-sizing-guide-for-Windows-10-environments ; https://lenovopress.lenovo.com/lp1993.pdf
- No Google document describes Gemini Nano behaviour in VDI or RDS sessions. **This is a gap.**

**E2.6 Shared credentials are common on clinical PCs.** In an Israeli survey of 299 medical staff, "220 participants (73.6%) answered that they have been given the AC [access credentials] of at least one other medical or para-medical staff member". All 45 residents reported it.
- https://synapse.koreamed.org/articles/1075843 (Hassidim et al., Healthc Inform Res 2017)

### Inference
- **I2.1** Whether Lantern runs depends on which ward PC it lands on. A PC from the 2024–26 SPMS replacement wave (32 GB RAM) passes on the CPU path. A legacy 8 GB PC fails. If the browser is published through Citrix or RDS, Chrome runs on a shared VM that usually has no GPU and 4–8 GB of RAM, so Nano will not be eligible. In non-persistent VDI the 3–4 GB model would also be re-downloaded or lost every session. Even when Chrome runs on a VDI host that does meet the bar, inference happens on that server, not on the ward device, so the "on-device" claim changes meaning.
- **I2.2** In many hospitals the EHR is published through Citrix while Chrome runs locally on a "fat" PC. That setup is the realistic target, and Lantern should say so.
- **I2.3** Shared Windows or Chrome logins (E2.6) mean whatever Lantern leaves in the browser is visible to the next person who opens the same profile. This drives the storage design in section 3.

---

## 3. Data protection on a shared PC: IndexedDB, Downloads, GDPR, pilot gates

### Evidence

**E3.1 Browser storage persists by default.** "Best-effort data persists as long as the origin is below its quota, the device has enough storage space, and the user doesn't choose to delete the data via their browser's settings." Also: "data is very rarely deleted by the browser."
- https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria (modified 5 Jan 2026)

**E3.2 Portuguese public-administration rule: no personal data in the browser beyond the session.** The annex to RCM 41/2018 marks this front-end requirement "Obrigatório": "Não guardar informação pessoal no browser, memória ou disco, para além do tempo da sessão e apenas na medida do necessário." It also makes per-user activity logs mandatory: "Deve ser guardado registo de atividade (log) de todas as ações que um utilizador efetue sobre dados pessoais". Scope: mandatory for the direct and indirect State administration. For the "setor empresarial do Estado" the resolution only *recommends* applying it.
- https://www.pt.pt/fotos/editor2/resolucao_cm_41-2018.pdf (DR 1.ª série n.º 62, 28 Mar 2018)

**E3.3 Admin controls exist to wipe local data.**
- `ForceEphemeralProfiles`: "web data like cookies and web databases are not preserved after the browser is closed. However this does not prevent the user from downloading any data to disk manually".
- `BrowsingDataLifetime`: "useful for customers that work with sensitive customer data"; the minimum is 1 hour.
- `ClearBrowsingDataOnExitList` removes "cookies_and_other_site_data" on exit, but "If Chrome does not exit cleanly ... the browsing data will not be cleared".
- https://chromium.googlesource.com/chromium/src/+/main/components/policy/resources/templates/policy_definitions/Miscellaneous/ (ForceEphemeralProfiles.yaml, BrowsingDataLifetime.yaml, ClearBrowsingDataOnExitList.yaml)

**E3.4 GDPR.**
- Art. 35(1): a DPIA is required "prior to the processing" where processing "in particular using new technologies" is "likely to result in a high risk". Art. 35(3)(b) covers "processing on a large scale of special categories of data referred to in Article 9(1)".
- Art. 5(1)(c): "limited to what is necessary". Art. 5(1)(e): "for no longer than is necessary". Art. 5(1)(f): "appropriate security".
- https://gdpr-info.eu/art-35-gdpr/ ; https://gdpr-info.eu/art-5-gdpr/
- The CNPD DPIA list (Regulamento n.º 798/2018) includes "Interconexão ou relacionamento de categorias especiais..." and "Categorias indicadas combinadas com novas tecnologias...". These are quoted from a secondary summary; check the official text. https://www.legiscope.com/blog/lista-cnpd-aipd-triagem-tratamentos.html

**E3.5 NHS gates before a pilot.**
- DTAC was refreshed in February 2026, with "full transition to the updated form by 6 April 2026". https://innovation.nhs.uk/news/updated-nhs-england-digital-technology-assessment-criteria-dtac-form-and-guidance/
- It has sections for clinical safety (C1, a decision tree on DCB0129 vs DCB0160), data protection (C2, "DPIA expectations now align with NHS England's standard template"), security (C3, the Software Security Code of Practice) and usability/accessibility (D1, WCAG 2.2 AA). https://www.burges-salmon.com/articles/102mnjh/new-nhs-digital-technology-assessment-criteria-what-health-tech-suppliers-need-t (20 Mar 2026)
- DCB0129 "sets clinical risk management requirements for Manufacturers of health IT systems"; DCB0160 is for the deploying organisation. "Compliance with DCB0129 and DCB0160 is mandatory under the Health and Social care Act 2012."
- https://digital.nhs.uk/services/clinical-safety/clinical-risk-management-standards (read via the mirror nhsd-proxy.openprescribing.net, last edited 11 Oct 2024)

**E3.6 No public SPMS or CNPD guidance was found on local-only browser tools or on AI pilots in SNS units.** **This is a gap.** RCM 41/2018 (E3.2) is the closest technical rule.

### Inference
- **I3.1** As described, Lantern keeps reconciliation state in IndexedDB on a PC that is likely shared. That conflicts with the spirit of RCM 41/2018, and with its letter wherever the rule is binding. It also conflicts with GDPR storage limitation. Exported CSVs in Downloads outlive any browser wipe (E3.3). Lantern also has no per-user audit log (E3.2), which an SNS security officer will ask about.
- **I3.2** A hospital DPO will almost certainly require a DPIA. The case for one: health data (Art. 9), several sources combined, a new technology (an on-device LLM), and the chance of a cloud fallback. An NHS trust would additionally need DTAC plus a DCB0129 safety case from the supplier and DCB0160 sign-off from its own Clinical Safety Officer.

---

## 4. Language: is an English-only UI a barrier for Portuguese administrative staff?

### Evidence

**E4.1 Many Portuguese adults have no foreign language, and the share is larger for older workers.** Data are from the Eurostat Adult Education Survey 2022, share of persons who know no foreign language:
- PT 25–64: **30.1%** (EU 25.3%)
- PT 55–64: **45.8%** (EU 35.0%)
- PT 25–64 with upper-secondary education: 19.0%
- https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/edat_aes_l22?geo=PT&time=2022 and edat_aes_l23 (no quote; these are dataset values)

**E4.2 Among Portuguese adults who do know a foreign language, a large share rate their best one as only "basic".** Same survey, 2022:
- PT 25–64: **46.4%** basic, 23.4% proficient (EU 40.5% / 27.6%)
- PT 55–64: **60.3%** basic, 13.1% proficient
- https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/edat_aes_l32?geo=PT&time=2022 (the best-known language is not necessarily English)

**E4.3 Language rules for software are national.** For medical devices, member states set the required language. "While the Regulations do not specifically impose language requirements on the GUI," "several member states have national legislation about GUIs."
- https://emergobyul.com/news/eu-update-overview-european-language-requirements-medical-devices (18 Jan 2024)
- The EC per-country table exists, but the Portugal row was not read: https://health.ec.europa.eu/publications/overview-language-requirements-manufacturers-medical-devices_en

**E4.4 No study was found on the English proficiency of SNS non-clinical staff, nor on error rates of clinical software used in a non-native language.** **This is a gap.**

### Inference
- **I4.1** Derived from E4.1 and E4.2: about 62% of Portuguese adults aged 25–64 have no foreign language or only a basic one (30.1% + 69.9% × 46.4%). For ages 55–64 it is about 78%. Administrative ward staff are often mid-career or older. So an English-only UI is a real barrier for a meaningful share of the intended users, and the barrier is worst under time pressure on the morning after an outage. Labels such as "re-entry worklist" or "reconcile" are jargon even in English.
- **I4.2** The UI being in English and the model not supporting Portuguese are separate problems. Localising the UI is cheap. The model's language gap (E1.4) is not something Lantern can fix.

---

## 5. How valid are LLM-simulated users for usability testing?

### Evidence

**E5.1 NN/g (2024): synthetic users are favourable, shallow, and produce no behavioural data.** Quotes: "Synthetic research cannot produce behavioral data." · "Synthetic users seem to care about everything" · A synthetic user claimed "Yes, I completed all the courses I mentioned." (real users often hadn't) · "Real user research is essential."
- https://www.nngroup.com/articles/synthetic-users/ (Rosala & Moran, 21 Jun 2024)

**E5.2 NN/g (2026): the overall conclusion matched, but the long tail of answers was lost (mode collapse).** Quote: "Our synthetic respondents collapsed onto a dozen labels; the humans spread across more than 50."
- https://www.nngroup.com/articles/synthetic-users-vs-human-respondents/ (Banawa, 16 Oct 2026)

**E5.3 An LLM doing heuristic evaluation misses most expert findings and adds false positives.** Quotes: "only 21.2% of the issues identified by human experts were also identified by GPT-4o" · "GPT-4o generated several false positives due to hallucinations and attempts to predict issues" · it "has difficulty identifying issues in heuristics related to flexibility, control, and user efficiency"
- https://arxiv.org/abs/2506.16345 (Guerino et al., INTERACT 2025)

**E5.4 A counter-finding: in another study, multi-model synthetic heuristic evaluation found more issues than 5 experts.** Quotes: it "exceeded the performance of 5 experienced human evaluators (57% and 63%)" but "struggled with recognizing some UI components and design conventions" and with "identifying across screen violations".
- https://arxiv.org/abs/2507.02306 (Zhong, McDonald & Hsieh, Jul 2025; three commercial LLMs)

**E5.5 LLM agents reproduce real users' step-by-step behaviour poorly.** Quote: "prompt-based LLMs […] achieve only 11.86% accuracy in generating human actions"
- https://arxiv.org/abs/2503.20749 (Lu et al.; ACL 2026)

**E5.6 Simulated users are miscalibrated, and their errors differ from real users' errors.** Quotes: results "lacks robustness" (agent success varies by up to 9 points depending on the user LLM) · "systematic miscalibration" · simulated users "introduce conversational artifacts and surface different failure patterns than human users"
- https://arxiv.org/abs/2601.17087 (Seshadri et al., Jan 2026)

**E5.7 The persona prompt matters less than the underlying model.**
- "persona variables explain relatively little variance (<10%)" in subjective annotation datasets (search-snippet quote). https://aclanthology.org/2024.acl-long.554 (Hu & Collier, ACL 2024)
- In multi-model simulations, "the amount of engagement an agent receives depends more on its base model than on its assigned persona". https://arxiv.org/abs/2610.07535 (Roytburg & Ippolito, Oct 2026)

**E5.8 Identity portrayal is flattened and stereotyped.** "LLMs are likely to both misportray and flatten the representations of demographic groups" (search-snippet quote). The authors suggest LLMs may supplement human participants, for example in pilots, rather than replace them.
- https://arxiv.org/abs/2402.01908 (Wang, Morgenstern & Dickerson)

**E5.9 The tools in this field frame themselves as rehearsal before human studies.**
- UXAgent exists to help researchers "before they conduct the real human subject study". https://arxiv.org/abs/2502.12561 (CHI EA 2025)
- Qualitative researchers interviewed about LLM participants found they "produce responses lacking in palpability and contextual depth". https://arxiv.org/abs/2409.19430 (Kapania et al., CHI 2025, honourable mention)

### Inference: what such tests catch and what they miss
- **Catch reasonably well:** navigation dead ends and missing "next" affordances; unlabelled or ambiguous controls; jargon; missing system status or confirmations; inconsistent terms across screens. Per E5.3 and E5.4, the strongest areas are aesthetic and minimalist design and match with the real world. A browser-driven agent also finds concrete failures: buttons it can't reach, uploads that don't register, text it can't read.
- **Miss or distort:** real time pressure and interruptions; domain workarounds (paper, phone calls, asking the nurse); trust and fear of blame; true task-failure and error rates (E5.5, E5.6); severity judgements; issues that span several screens (E5.4); efficiency and expert shortcuts (E5.3); and the variety of real users, because personas collapse toward the base model (E5.2, E5.7, E5.8). Agents are also too persistent and too literate. They read every label, which inflates success and understates the language barrier from section 4.
- **Mitigations supported by the evidence:**
  1. Run each persona on at least two different base models, and report agreement (E5.4, E5.7).
  2. Ask for criticism explicitly: "list every hesitation", "would you give up?" (E5.1 positivity).
  3. Triangulate against a fixed heuristic checklist such as Nielsen's 10 (E5.3, E5.4).
  4. Report task-level metrics from logs (completed or not, commands used, dead ends), not self-rated satisfaction.
  5. Treat findings as hypotheses, and confirm the top ones with a few real users before claiming usability (E5.1, E5.9).

---

## Gaps (no good public evidence found)
- No current figure for the share of SNS (or NHS) clinical endpoints that are thin clients or VDI.
- No Google statement on Gemini Nano in VDI, RDS or Citrix sessions.
- No data on the English proficiency of SNS administrative staff, and no national SNS workforce age breakdown.
- No SPMS or CNPD guidance on browser-only or local-AI tools.
- The Portugal row of the EC MDR language table was not read.
- The UK DCB0129/DCB0160 review is ongoing, so those standards may change.

---

## Implications for Lantern

1. **State the deployment requirements plainly in the README and the submission:**
   - Chrome 148+ desktop on Windows 10/11.
   - 16 GB RAM with 4 cores, or a GPU with more than 4 GB VRAM. SPMS's new 32 GB PRR workstations qualify; legacy 8 GB PCs don't.
   - 22 GB free disk.
   - A one-time 3–4 GB download done *before* any outage.
   - Policies left at default or explicitly allowed: `GenAILocalFoundationalModelSettings` unset or 0, `BuiltInAIAPIsEnabled` unset or true, `ComponentUpdatesEnabled` true.
   - Not supported: thin clients, or Chrome published through Citrix/RDS/VDI.
2. **Ship a pre-flight check page** that IT can open on a calm day. It should show availability, backend, free disk and policy state, so "unavailable" is found weeks before an outage rather than at 08:30 on the morning after one. The model can vanish mid-session (E1.6), so Lantern has to save progress and degrade to a deterministic, no-AI mode instead of failing.
3. **Never let real data fall back to the cloud.** Gate on `'LanguageModel' in self` and `availability()` before calling Firebase. Issue #10635 shows `ONLY_ON_DEVICE` alone is not enough. Keep the cloud for the synthetic drill only, and label it clearly.
4. **Be honest about language.** Nano does not accept Portuguese. Lantern sends Portuguese text under an `en` session, and accuracy is unvalidated. The AI only proposes (column mapping, candidate matches) and a person confirms. The UI should be PT-PT, or the submission should say localisation is the first post-hackathon task. About 62% of Portuguese 25–64-year-olds have no foreign language or only a basic one, rising to about 78% at 55–64.
5. **Make storage session-scoped by default.** That means no `navigator.storage.persist()`, an automatic purge with a visible timer, and a prominent "wipe this PC" action. Export files should carry no patient names in the filename, with a warning that files in Downloads survive a browser wipe. Recommend `BrowsingDataLifetime` or `ForceEphemeralProfiles` to IT. This aligns with RCM 41/2018 ("Não guardar informação pessoal no browser… para além do tempo da sessão") and with GDPR Art. 5(1)(e).
6. **Name the governance gaps instead of hiding them.** Lantern has no per-user audit log (RCM 41/2018 makes one mandatory where it binds) and no authentication of its own. A pilot needs the hospital DPO, a DPIA (Art. 35; CNPD list: combination of special-category data plus new technology), and a clinical-safety hazard log. In the UK that also means DTAC plus DCB0129/0160. Providing a draft DPIA and hazard log in the repo would turn this from a weakness into evidence of maturity.
7. **Claim only what was tested.** Lantern was tested on one development laptop with Nano, plus a cloud-backed drill on fictional data. It has not been tested on a real ward PC, on VDI, or with real staff. It is not a medical device and not clinically validated. The "on-device" claim holds only on eligible fat-client PCs.
8. **Present the simulated study as a "simulated expert walkthrough with LLM personas (formative)", not as a usability test.** Report the issues found and fixed, their severities, and task-completion logs. Do not report satisfaction or SUS scores from agents. List the known blind spots: time pressure, real fluency in English, trust, workarounds, error rates. Show cross-model agreement if more than one model was used.
9. **Commit to the real-user step,** and say so in the submission: 3–5 ward clerks or nurses on a PRR-generation PC, run in PT-PT and timed, before any pilot. Rank the simulated findings as hypotheses for that session.
