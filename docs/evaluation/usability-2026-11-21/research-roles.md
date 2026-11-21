# Research: who re-enters what after an EHR outage, and is "Rita the secretary" the right person?

Researched 2026-11-21. Scope: Portugal first, then UK/Ireland, then US (plus one Canadian procedure).
No patient data used.

**Labels**
- **[E]** = evidence. I read the quote in the source text myself, from a fetched page or PDF.
- **[S]** = snippet only. The quote appeared in search-engine extracts, but the page blocked fetching (403, CAPTCHA, dead link). Re-check before citing it publicly.
- **[I]** = my inference, not a source claim.

---

## 0. Bottom line

1. Everywhere we looked, the published rule is the same: **whoever did the clinical act enters it afterwards** (nurse: administrations, observations; prescriber: orders). Administrative staff do **ADT (admissions/transfers/discharges), registration, bed census, charges, and filing or scanning of paper**. [E: MKUH, Stony Brook, Toledo, CHFT, NMC, OE]
2. A non-author entering clinical data is tolerated in a few places, but only with an explicit attribution note (for example "entered by X on behalf of Y because of downtime"). [E: ASPR TRACIE SME; Stony Brook nurse proxy]
3. **Scanning the paper originals is the standard partner of, or alternative to, re-keying.** The paper is often declared the legal record, and US policies switch from re-entry to scanning once an outage runs past about 8 hours. [E: Stony Brook, Toledo, MKUH, CHUSJ]
4. In Portugal no public SNS procedure says who re-enters data after an outage. The Ordens say records must identify their author, and that nursing judgement and registration cannot be delegated to people who are not functionally dependent on the nurse. [E: OE, OM]
5. Recovery pain points are well documented: missing ADT, census validated by phone, entry date used instead of service date, wrong-patient charges, a 161,560-report backlog, transcription and misidentification risk. [E: Nebraska Medicine, SLaM/Synnovis]

---

## 1. Roles and rules

### Portugal

| # | Claim | Short exact quote | Source | Label |
|---|---|---|---|---|
| PT-1 | Nursing records are information produced by the nurse. Paper and electronic records are equivalent, and every record must identify who wrote it. | "conjunto de informação produzida pelo enfermeiro na prática clínica" / "qualquer registo deve permitir a identificação pessoal de quem o elabora" | OE, Parecer CJ 196/2014 — https://ordemenfermeiros.pt/documentosoficiais/conteudos/parecer-sobre-registo-de-penso-e-evolução-da-ferida | [E] |
| PT-2 | Nurses work under a "who performs, records" principle, and the author of care must be correctly identified in both paper and electronic records. | "de acordo com o princípio de quem realiza/regista" / "identificação correcta do autor dos cuidados nos registos de Enfermagem, quer em suporte documental quer em suporte informático" | OE, Parecer CJ 2/2008 — https://ordemenfermeiros.pt/documentosoficiais/conteudos/parecer-sobre-mobilidade-interna-e-sistema-de-registos-informatizados-e-sua-validação | [E] (the first phrase is the member's question; the second is the CJ's answer) |
| PT-3 | Nurses may delegate tasks only to staff who are functionally dependent on them. Data collection, diagnosis, planning, evaluation and clinical judgement cannot be delegated at all. | "só podem delegar tarefas em pessoal deles funcionalmente dependente" / "o processo de cuidados (colheita de dados, diagnóstico de Enfermagem, planeamento e avaliação) e juízo clínico de Enfermagem não podem ser delegados" | OE, Tomada de posição sobre delegação (Parecer 136/2007, citing REPE art. 10) — https://ordemenfermeiros.pt/documentosoficiais/conteudos/tomada-de-posição-sobre-delegação | [E] |
| PT-3b | The duty to record is in the statute: the nurse must "assegurar a continuidade dos cuidados, registando fielmente as observações e intervenções realizadas". | (same quote) | Cited in PT-1, as EOE art. 83 d) (2009 numbering) | [E] for the quote. That the current article number is 104 after Lei 156/2015 is [I], not verified. |
| PT-4 | The OM General Practice college's opinion on IT failure: the **secretariado clínico** pre-fills patient identity on the paper sheets, and clinical records go on paper and are incorporated into the electronic record later. It does **not** say who does the incorporation. Responsibility sits with "the institution and the doctor". | "Folhas de registo em papel … com os dados pessoais preenchidos pelo secretariado clínico na admissão" / "Posteriormente devem ser incorporadas, assim que possível, no processo clínico eletrónico" / "Cabe à instituição de saúde e ao médico…" | Ordem dos Médicos, Colégio MGF, Parecer Doc 05.2024 (23 Feb 2024) — https://ordemdosmedicos.pt/files/pdfs/3e14-S2024_13551.pdf | [E] |
| PT-5 | Doctors' union FNAM (during the SESARAM/Madeira cyberattack, Aug 2023): the **doctor** defers their own electronic record and must do it in their own working hours. | "pode o médico realizar a consulta diferindo o registo informático" / "este registo deve ser efetuado dentro do horário do médico" | DNoticias, 22 Aug 2023 — https://www.dnoticias.pt/2023/8/22/372429-medicos-impedidos-de-consultar-processos-dos-doentes-devem-pedir-excusa-de-responsabilidade/ | [E] |
| PT-6 | OM good practice separates the **author of the record** from the **person responsible for the information**, and requires dated entries. | "inequívoca identificação do utente, do processo clínico, do autor do registo, do responsável pela informação" | OM, Conselho Nacional de Auditoria e Qualidade, Boas Práticas de Registos Clínicos em Cirurgia (2016) — https://ordemdosmedicos.pt/files/pdfs/e3jB-CM_20160217_Registos_cli769nicos_em_cirurgia_v3F.pdf | [E] |
| PT-7 | National outage of 12 Jun 2026: the OM estimates >150,000 acts went unrecorded in real time, and demands safe procedures for recording and validating them afterwards. | "mais de 150.000 consultas e atos clínicos programados tenham ficado sem registo informático em tempo real" / "procedimentos seguros de registo e validação posterior dos atos realizados" | ECO, 15 Jun 2026 — https://eco.sapo.pt/2026/06/15/ordem-dos-medicos-exige-esclarecimentos-urgentes-sobre-falha-de-energia-que-afetou-sns/ | [E] |
| PT-8 | Clinical secretary tasks in a ward: organising files, admitting patients, requesting transport. These are administrative and ADT tasks. | "destaco a organização de processos, o internamento dos doentes e a requisição de transporte" | IPG Guarda internship report (CET Secretariado Clínico) — https://bdigital.ipg.pt/dspace/bitstream/10314/1770/1/Daniela%20Figueiredo_1011074.pdf (link now redirects) | [S] |
| PT-9 | ULS Amadora/Sintra 2025 risk report confirms a total datacenter blackout. Separately, it lists "production recorded without the act being performed" as a high risk and audits production records against the clinical record. | "Foi verificado apagão total no Datacenter devido a falha eletrica" / "Produção registada sem execução do respetivo ato" / "auditorias entre os Sistemas de Informação e o processo clínico do utente" | https://hff.min-saude.pt/wp-content/uploads/Relatorio-Avaliacao-Riscos-Elevados-2025-1.pdf | [E] |
| PT-10 | Amadora-Sintra, June 2025: medical and nursing records were on paper only for several days, from Saturday until about Thursday. | "os registos médicos e de enfermagem têm estado a ser feitos só em papel" | DN, 25 Jun 2025 — https://www.dn.pt/sociedade/quebra-total-do-sistema-informático-suspende-temporariamente-urgências-no-amadora-sintra | [E] |
| PT-11 | SNS hospitals already scan paper into a repository linked to the electronic clinical record (CHUSJ), with plans to replicate it to other hospitals. Scanning is a realistic alternative to re-keying in Portugal. | "desmaterialização dos registos clínicos em papel" / "de forma integrada com o processo clínico eletrónico" | Governo, 9 Jun 2021 — https://portugal.gov.pt/gc22/comunicacao/comunicados/projeto-inovador-de-digitalizacao-da-informacao-clinica-vai-ser-replicado-em-varios-hospitais | [E] |
| PT-gap | I found **no public SNS, SPMS or ULS document** that assigns post-outage re-entry to anyone. The founder's account (secretaries re-entered the data, it was wrong, and a week was spent fixing it) is the only data point for that practice. | — | — | [I] |

### UK and Ireland

| # | Claim | Short exact quote | Source | Label |
|---|---|---|---|---|
| UK-1 | NMC Code: records are made at the time or as soon as possible afterwards, and a late entry must say it is late. Entries are attributed to their author, dated and timed. Delegation needs supervision and a check of the outcome. | 10.1 "recording if the notes are written some time after the event"; 10.4 "attribute any entries you make in any paper or electronic records to yourself"; 11.3 "confirm that the outcome of any task you have delegated … meets the required standard" | https://www.nmc.org.uk/standards/code/read-the-code-online/ | [E] |
| UK-2 | Milton Keynes University Hospital eCARE downtime plan: the staff group that did the original action enters it, with a fixed late-entry comment. Annotated paper is kept and scanned. | "responsibility of the staff group who would do the original action to transcribe the actions into the system (e.g. nurse records administration, prescriber orders…)" / "Entered post downtime. Refer to paper copy for original record" / "retained for data entry and scanning" | https://digital.mkuh.nhs.uk/wp-content/uploads/2019/01/Ref-150-eCARE-724-Step-by-step-guide.pdf | [E] |
| UK-3 | Calderdale & Huddersfield (planned downtime, Jul 2024): prescriptions, administrations and observations are entered retrospectively, and the paper drug chart is kept for scanning. | "retrospectively enter the prescription and/or the drug administration" / "save the paper drug chart for scanning" | https://chft-news.cht.nhs.uk/issue/chft-news-issue-75-8-july-2024/article/epr-downtime-this-coming-thursday-11-july-between-03-00-and-05-00-71569ad06a05 | [E] |
| UK-4 | Sandwell & West Birmingham (Unity business continuity): during recovery paper is transcribed into the EPR. For patients already discharged, the trust decides whether to transcribe or to scan. | "the paper records will need to be transcribed into the EPR" | https://myconnect.swbh.nhs.uk/uncategorized/unity-business-continuity/ (page now suspended) | [S] |
| UK-5 | NHS ward clerk (Band 2) job description: clerical, admin and IT support. Keeps ADT demographics and bed state up to date in PAS. Other tasks are done "as requested by nursing staff". No clinical documentation is listed. | "Ensuring demographics of admitted, transferred and discharged patients are up date electronically and manually" / "To maintain and update PAS" | Shrewsbury & Telford — https://www.jobs.sath.nhs.uk/cd-content/uploads/files/223-WCL-808_Job%20Description.pdf | [E] |
| UK-5b | Other ward clerk adverts list ADT on Epic or Cerner "in real time", one of them within 30 minutes of the patient moving. | "process patients' admissions, transfers, discharges on EPIC" | Frimley Health — https://www.jobs.nhs.uk/candidate/jobadvert/C9151-25-1074 | [S] |
| UK-6 | Synnovis aftermath at South London & Maudsley: results arrive by phone, paper or PDF and are uploaded by hand. 161,560 pathology reports were waiting to be entered (Jan 2026), with 122 safety incidents. | "manually uploaded into patient records" / "transcription errors and the potential for patient misidentification" | The Record, 17 Apr 2026 — https://therecord.media/ransomware-nhs-cyberattack-disruption | [E] |
| UK-7 | Barts Health poster: many nurses did not know the downtime policy, and they lacked information on downtime documentation and recovery. | "lacked information regarding downtime documentation and recovery" | https://www.baccn.org/media/resources/P28.pdf | [S] |
| IE-1 | HSE ransomware attack (2021): hospitals went back to paper. A parliamentary question flagged problems with back entry and lost records. | "Hospitals and healthcare providers mostly reverted back to paper records" / "a challenge in back entering data and indeed loss of records" | NCSC Ireland deck — https://enisa.europa.eu/sites/default/files/all_files/10.%20A%20major%20incident%20-%20the%20recovery%2C%20impact%20and%20aftermath_IR.pdf [E]; Oireachtas PQ, 13 Jul 2021 — https://www.oireachtas.ie/en/debates/question/2021-07-13/64/ [S] | [E]/[S] |

### US (and Canada)

| # | Claim | Short exact quote | Source | Label |
|---|---|---|---|---|
| US-1 | CMS Conditions of Participation: every entry is dated, timed and authenticated by the person who provided or evaluated the service. | "authenticated in written or electronic form by the person responsible for providing or evaluating the service provided" | 42 CFR 482.24(c)(1) — https://www.law.cornell.edu/cfr/text/42/482.24 | [E] |
| US-2 | CMS Program Integrity Manual §3.3.2.5: delayed entries are allowed, but the date and author must be identifiable and the entry permanently marked as late. | "The date and author of any amendment, correction or delayed entry should be identifiable" | https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/downloads/pim83c03.pdf | [E] |
| US-3 | Stony Brook downtime procedure, a clear role split. **Patient Access** enters admissions and registrations. **Unit clerks** update transfers and discharges. **Bed Control** reconciles. **Nursing** enters medications given, last vital signs and I&O (intake and output). If the shift has ended, the **next nurse enters in proxy with a comment**. Paper is the legal record and is scanned by Medical Records. A system-wide note records the downtime window. | "Patients that were transferred or discharged during downtime will be updated in the system by unit clerks" / "Nursing will enter all medication administered during downtime" / "the nurse on the next shift will enter the data in proxy and comment that the proxy entry is required due to a downtime" / "serves as the legal record" | https://extranet.stonybrookmedicine.edu/sites/default/files/DowntimeProcedure.pdf (rev. Oct 2017) | [E] |
| US-4 | University of Toledo Medical Center (effective Jan 2026): recovery depends on how long the outage lasted. Under 4 h, enter all discrete data. Over 8 h, scan the paper MAR (medication administration record). Multi-day, scan everything. A core set is always recovered. The admissions department reconciles ADT. | "after 8 hours of downtime, scan MAR paper documentation" / "Documentation that is not back-entered … should be scanned back into Epic" / "Height, weight, and allergies … Problem list … PTA medications … Lines/drains/airways … Charges" / "The admission department will reconcile any new admits, discharges and transfers" | https://www.utoledo.edu/policies/utmc/nursing/guidelines/general/pdfs/Guideline%20General%20-%20Computer%20downtime%20-%20nursing%20services.pdf | [E] |
| US-5 | US federal (ASPR TRACIE) expert advice. One facility requires 100% entry with no scanning, allows twice the outage length, and does the sickest patients first. Others call in extra people to enter data, adding a note when the person entering is not the one who collected it. There is an intense catch-up on ADT, medication reconciliation and billing. | "scanning is not an acceptable form of data entry" / "We allow twice the time that our EHR was down" / "specific language that will be included as a note if someone other than the data collector enters that information" / "intense catchup period to correct … ADT updates, medication reconciliations, and billing" | https://files.asprtracie.hhs.gov/documents/aspr-tracie-ta-paper-based-hospital-records-073117-508.pdf | [E] |
| US-6 | Nebraska Medicine cyber incident, lessons learned (2020): census checked by phoning each unit, ADT missing, charges posted with the entry date instead of the service date, wrong-account charges posted to deceased patients, providers hard to identify from paper, clinics sending clinical papers to admin staff who only needed registration items. | "Validating inpatient census by calling each unit" / "Some ADT information was missing" / "entry date being used in lieu of service date" / "incorrect CSN's causing charges to post to deceased" / "Access only needs registration items" | https://files.asprtracie.hhs.gov/documents/nebraska-cyberincident-lessons-learned-20201026-finance-section.pdf | [E] |
| US-7 | After a ransomware outage, the downtime paper records were incomplete and fragmented (peer-reviewed). | "the archived paper records are significantly fragmented" | Larsen et al., Appl Clin Inform 2019 — https://pmc.ncbi.nlm.nih.gov/articles/PMC6620179 | [E] |
| US-8 | Ascension ransomware attack (2024): clinicians improvised with spreadsheets. | "basic computer spreadsheets … many devised on the fly by doctors and nurses" | KFF Health News via MDedge — https://community.the-hospitalist.org/content/us-hospitals-prone-cyberattacks-one-impacted-patient-care-ascension-experts-say | [E] |
| US-9 | Health unit coordinator: clerical and support work, helps with ADT. Minimum qualification is high school plus one year's experience. | "Assist with patient admissions, discharges and transfers" | Univ. of Washington HR — https://hr.uw.edu/comp/classified-staff/health-unit-coordinator/ | [E] |
| US-10 | Joint Commission allows unlicensed "documentation assistants/scribes", provided they meet the same competency and training standards (an analogue for "secretary prepares, clinician authenticates"). | "the organization should ensure the scribe meets all of the same competency and training" | https://jointcommission.org/standards/standard-faqs/ambulatory/record-of-care-treatment-and-services-rc/000002210 | [S] |
| CA-1 | Health Sciences Centre Winnipeg: unit staff enter a defined list after downtime. Backdated vital signs are **not required** (clinical judgement applies). Do not link infants during recovery, to avoid duplicate registrations. | "although backdated entries are not required, use clinical judgement" / "This may lead to duplicate registrations and incorrect documentation" | https://healthproviders.sharedhealthmb.ca/files/epr-downtime-recovery-for-clinical-documentation.pdf | [E] |

---

## 2. Recovery procedures: who does what, by item type

| Item type | Who enters it (evidence) | Could Rita (secretary) enter it in an SNS hospital? |
|---|---|---|
| Admissions, registrations, identity | Patient Access / admissions department (US-3, US-4). In Portugal, the secretariado clínico fills identity at admission (PT-4, PT-8). | **Yes.** This is her normal administrative and SONHO work. [I] for the SONHO detail. |
| Transfers, discharges, bed state, census | Unit or ward clerks; bed control reconciles (US-3, UK-5, US-6). | **Yes.** This is Lantern's strongest legitimate core. |
| Charges / production | Batch charge entry, revenue cycle staff and coders (US-3, US-6). | **Mostly yes**, for administrative production, but only for acts backed by a clinical record. Production is audited (PT-9). [I] |
| Scanning or filing paper originals | Medical Records / HIM after discharge (US-3, UK-2, US-4). | **Yes**, as preparing and listing the documents to scan. [I] |
| Orders / prescriptions | Prescriber (UK-2), or pharmacy with co-signature (US-3). One exception: a department secretary types faxed order sheets (Stony Brook EEG). | **No**, except transcription that a clinician then confirms. |
| Medication administration | The nurse who gave it, or a next-shift nurse in proxy with a comment (UK-2, UK-3, US-3). | **No** (PT-1, PT-2, PT-3, UK-1, US-1). |
| Observations / vitals, I&O | Nurse; often only the last set or clinically significant values (US-3, US-4, CA-1). | **No.** At most she pre-fills a draft for the nurse to confirm. [I] |
| Nursing assessments / notes | Optional, or replaced by scanning (US-4, CA-1). | **No** (PT-3: assessment and judgement cannot be delegated). |

**Timing rules found:** "as soon as possible" (NMC, MKUH, OM). Task lists and last vitals within 4 h of recovery (Stony Brook). Twice the outage length (TRACIE SME). In the doctor's own working hours (FNAM).

**Duplicate avoidance found:** patient entry by admissions before units go live (Stony Brook, Toledo). A census check (Nebraska). No infant linking during recovery (Winnipeg). A marker on the record showing the paper copy is the original (MKUH, Stony Brook).

**Spreadsheets and email:** no published procedure describes them. They show up only as improvisation (US-8). [E] The founder's account is consistent with that. [I]

---

## 3. Tools, IT literacy, pain points

- **Tools:** ward clerks and health unit coordinators work in PAS/ADT screens, email, phone and office equipment (UK-5, US-9). Portuguese secretaries do admissions ("internamento") and file management (PT-8), and SONHO is the administrative system. [S]/[I]
- **Literacy:** these are entry-grade roles: NHS Band 2 (UK-5); high school plus one year (US-9). They are confident with forms and lists, not clinical vocabulary. [I] Lantern copy must be plain PT-PT, with no clinical abbreviations left unexplained. [I]
- **Documented recovery pain:**
  - missing or wrong ADT and census (US-6)
  - entry date stored instead of service date (US-6)
  - wrong patient or account (US-6, UK-6)
  - fragmented paper (US-7)
  - backlogs in the hundreds of thousands, for months (UK-6)
  - "back entering data and … loss of records" (IE-1, [S])
  - large unrecorded volumes in Portugal (PT-7)
  - nurses unaware of recovery steps (UK-7, [S])

---

## 4. Implications for Lantern (keep / change / risk)

1. **KEEP: Rita as the reconciler and preparer, with ADT and census as her own entries.** Clerks own ADT, bed state and census reconciliation everywhere (US-3, US-6, UK-5), and the bed-census input targets a documented failure ("Validating inpatient census by calling each unit").
2. **CHANGE: route every clinical item to a nurse, not only the ambiguous ones.** Medication administrations, observations and nursing interventions must be entered or confirmed by the nurse who did them, or by a nurse proxy with a comment (PT-1 to PT-3, UK-1, UK-2, US-1, US-3). Present Lantern's split as "Rita prepares, de-duplicates and hands off; the nurse confirms and authors."
3. **CHANGE: every worklist row needs these fields:**
   - original event time and entry time (US-6's service-date bug)
   - documenting author (from the sheet) and entered-by
   - a fixed late-entry label, e.g. "Registo tardio – introduzido após indisponibilidade; original em papel/folha v3, linha N" (MKUH, CMS PIM, NMC 10.1)
   - the downtime window (Stony Brook)
   - per OM PT-6, show "autor do registo" vs "responsável pela informação" separately.
4. **ADD: triage by outage length and criticality.** Toledo has an "always recover" set (allergies, weight and height, problems, home medications, lines, charges) and scans the rest after 8 h. TRACIE does critical patients first and discharged ones last. Let the hospital configure which categories are "back-enter" and which are "scan only".
5. **POSITION scanning as a complement, not a competitor.** Scanning is the default for long outages and for the legal original (US-3, US-4, UK-2), and the SNS has a scanning repository (PT-11). Lantern should output a "documents to scan" list per patient next to the back-entry list. Its value is the discrete, safety-critical subset plus de-duplication, which scanning cannot do.
6. **RISK: compliance claim.** No source allows a secretary to author nursing or medical acts in Portugal. Never pitch Lantern as letting Rita enter clinical data. Pitch it as stopping that from happening (the founder's story becomes the problem statement).
7. **RISK: identity and duplicates.** Match on SNS user number or record number plus bed plus name, and block auto-merge on any conflict. Duplicate registrations (CA-1), wrong-patient charges (US-6) and misidentification (UK-6) are the failure modes seen most often.
8. **RISK: billing and production pressure.** Production is audited against the clinical record (PT-9), and the OM wants performance indicators adjusted after outages (PT-4). Rita may register administrative production only for acts confirmed in the clinical record. Show that link in the UI. [I]
9. **KEEP: spreadsheet and email inputs.** Improvised spreadsheets are real (US-8), but no procedure standardises them, so Lantern should tolerate messy versions and must show provenance (file, version, row) for every item.
10. **VALIDATE with SNS users:** we found no public SNS recovery procedure. Ask 2–3 ULS IT/quality teams and a nurse manager who re-entered data after June 2025 (Amadora-Sintra) and June 2026, and whether nurses or secretaries did it.
