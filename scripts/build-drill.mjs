// Builds the bundled downtime drill (and frozen benchmark) from one source of truth.
//   node scripts/build-drill.mjs
// Outputs public/fixtures/drill/: ward-census.csv, 7B-downtime-log.xlsx (v1),
// 7B-downtime-log (2).xlsx (v2) and answer-key.json.
// Everything is synthetic: fictional hospital, fictional patients, fictional staff.

import { mkdirSync, writeFileSync } from 'node:fs';
import * as XLSX from 'xlsx';

const OUT = new URL('../public/fixtures/drill/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const SCENARIO = {
  hospital: 'St. Elm General (fictional)',
  ward: 'Ward 7B — Internal Medicine',
  outage: 'Electronic record unavailable from 21:40 to 07:15',
  story: [
    '21:40 the electronic record goes down. Night nurses log care in an improvised spreadsheet on the ward PC; paper notes on the trolley.',
    "03:10 the nurse in charge emails the log to the clinical secretary: '7B downtime log.xlsx' (version 1).",
    "07:40 nurse JM replies-all with her copy: '7B downtime log (2).xlsx' (version 2). She kept logging in the attachment, re-typed some acts from her paper notes, corrected three entries, and sorted the sheet by bed — losing three rows.",
    '08:30 systems are back. Rita, the clinical secretary, has to decide what goes back into the record.',
  ],
};

// Ward census printed from the last downtime report (21:00).
const CENSUS = [
  [1, 'Peter Novak', 'H-176604'],
  [2, 'Ellen Brooks', 'H-185503'],
  [3, 'Fatima Rahman', 'H-210045'],
  [4, 'Rui Costa', 'H-201190'],
  [5, 'Henry Walsh', 'H-190027'],
  [6, '', ''],
  [7, 'Ana Ribeiro', 'H-204811'],
  [8, 'Mei Chen', 'H-199850'],
  [9, 'Lucia Moreno', 'H-205598'],
  [10, 'Ines Duarte', 'H-206642'],
  [11, 'Sofia Lind', 'H-207734'],
  [12, 'Thomas Hale', 'H-198332'],
  [13, 'Dmitri Petrov', 'H-208821'],
  [14, 'Nora Quinn', 'H-204430'],
  [15, 'George Mills', 'H-187220'],
  [16, 'Kwame Asante', 'H-211076'],
  [17, 'Liam Burke', 'H-202267'],
  [18, 'Grace Owusu', 'H-209912'],
  [19, 'Ravi Patel', 'H-197718'],
  [20, 'Omar Haddad', 'H-203381'],
];

// ---- Version 1 (emailed 03:10). key: [bed, patient, hospNo, time, whatWasDone, by]
const V1 = [
  ['v1-01', 7, 'Ana Ribeiro', 'H-204811', '21:55', 'Paracetamol 1g IV given - temp 38.6', 'JM'],
  ['v1-02', 12, 'Thomas Hale', 'H-198332', '22:10', 'BP 92/58 HR 104 - Dr Silva informed', 'KS'],
  ['v1-03', 3, 'Fatima Rahman', 'H-210045', '22:30', 'Morphine 2mg SC PRN - pain 7/10', 'JM'],
  ['v1-04', 15, 'George Mills', 'H-187220', '22:45', 'BM 3.1 - glucose gel 15g given', 'KS'],
  ['v1-05', 15, 'George Mills', 'H-187220', '23:05', 'BM recheck 4.8', 'KS'],
  ['v1-06', 9, 'Lucia Moreno', 'H-205598', '23:15', 'NaCl 0.9% 1L IV started', 'JM'],
  ['v1-07', 1, 'Peter Novak', 'H-176604', '23:40', 'Found on floor beside bed - no injury seen, Dr reviewed', 'JM'],
  ['v1-08', 1, 'Peter Novak', 'H-176604', '23:55', 'Neuro obs GCS 15', 'JM'],
  ['v1-09', 18, 'Grace Owusu', 'H-209912', '00:20', 'Ceftriaxone 2g IV given (1h late - pharmacy)', 'KS'],
  ['v1-10', 13, 'Dmitri Petrov', 'H-208821', '00:35', 'Novorapid 4 units SC - BM 14.2', 'KS'],
  ['v1-11', 4, 'Rui Costa', 'H-201190', '00:50', 'Amoxiclav 1.2g IV - cannula resited L arm', 'JM'],
  ['v1-12', 2, 'Ellen Brooks', 'H-185503', '01:00', 'Furosemide 40mg IV', 'JM'],
  ['v1-13', 8, 'Mei Chen', 'H-199850', '01:10', 'NEWS 6 (RR 24, SpO2 91% RA) - O2 2L NP started', 'JM'],
  ['v1-14', 19, 'Ravi Patel', 'H-197718', '01:25', 'Metoclopramide 10mg IV - vomited x2', 'KS'],
  ['v1-15', 16, 'Kwame Asante', 'H-211076', '01:40', 'Pulled out NG tube - reinserted, position checked', 'KS'],
  ['v1-16', 5, 'Henry Walsh', 'H-190027', '02:00', 'Moved to bed 6 (side room) - infection control', 'JM'],
  ['v1-17', 11, 'Sofia Lind', 'H-207734', '02:15', 'Urine output 30ml in 2h - catheter flushed', 'KS'],
  ['v1-18', 10, 'Ines Duarte', 'H-206642', '02:20', 'Oxycodone 5mg PO PRN - pain 6/10', 'JM'],
  ['v1-19', 17, 'Liam Burke', 'H-202267', '02:30', 'Heparin infusion rate to 1400 units/h (APTT 1.4)', 'KS'],
  ['v1-20', 20, 'Omar Haddad', 'H-203381', '02:40', 'Enoxaparin 40mg SC', 'KS'],
  ['v1-21', 14, 'Nora Quinn', 'H-204430', '02:45', 'Paracetamol 1g PO - temp 37.9', 'KS'],
  ['v1-22', 12, 'Thomas Hale', 'H-198332', '02:50', '500ml NaCl 0.9% bolus given - BP 104/66 after', 'KS'],
  ['v1-23', 7, 'Ana Ribeiro', 'H-204811', '03:00', 'Temp 37.4, settled', 'JM'],
  ['v1-24', 6, 'Henry Walsh', 'H-190027', '03:05', 'Family phoned - updated', 'JM'],
];

// ---- Version 2 (JM's copy, replied 07:40). Columns renamed/added: "Time given", "Comments".
// Each entry: [id, bed, patient, hospNo, time, whatWasDone, comments, by, gold]
// gold.kind: copy | paraphrase | amendment | new | ambiguous ; gold.of = v1 row it corresponds to
const V2 = [
  // unchanged copies (12)
  ['v2-c02', 12, 'Thomas Hale', 'H-198332', '22:10', 'BP 92/58 HR 104 - Dr Silva informed', '', 'KS', { kind: 'copy', of: 'v1-02' }],
  ['v2-c04', 15, 'George Mills', 'H-187220', '22:45', 'BM 3.1 - glucose gel 15g given', '', 'KS', { kind: 'copy', of: 'v1-04' }],
  ['v2-c05', 15, 'George Mills', 'H-187220', '23:05', 'BM recheck 4.8', '', 'KS', { kind: 'copy', of: 'v1-05' }],
  ['v2-c06', 9, 'Lucia Moreno', 'H-205598', '23:15', 'NaCl 0.9% 1L IV started', '', 'JM', { kind: 'copy', of: 'v1-06' }],
  ['v2-c10', 13, 'Dmitri Petrov', 'H-208821', '00:35', 'Novorapid 4 units SC - BM 14.2', '', 'KS', { kind: 'copy', of: 'v1-10' }],
  ['v2-c12', 2, 'Ellen Brooks', 'H-185503', '01:00', 'Furosemide 40mg IV', '', 'JM', { kind: 'copy', of: 'v1-12' }],
  ['v2-c14', 19, 'Ravi Patel', 'H-197718', '01:25', 'Metoclopramide 10mg IV - vomited x2', '', 'KS', { kind: 'copy', of: 'v1-14' }],
  ['v2-c15', 16, 'Kwame Asante', 'H-211076', '01:40', 'Pulled out NG tube - reinserted, position checked', '', 'KS', { kind: 'copy', of: 'v1-15' }],
  ['v2-c17', 11, 'Sofia Lind', 'H-207734', '02:15', 'Urine output 30ml in 2h - catheter flushed', '', 'KS', { kind: 'copy', of: 'v1-17' }],
  ['v2-c19', 17, 'Liam Burke', 'H-202267', '02:30', 'Heparin infusion rate to 1400 units/h (APTT 1.4)', '', 'KS', { kind: 'copy', of: 'v1-19' }],
  ['v2-c21', 14, 'Nora Quinn', 'H-204430', '02:45', 'Paracetamol 1g PO - temp 37.9', '', 'KS', { kind: 'copy', of: 'v1-21' }],
  ['v2-c22', 12, 'Thomas Hale', 'H-198332', '02:50', '500ml NaCl 0.9% bolus given - BP 104/66 after', '', 'KS', { kind: 'copy', of: 'v1-22' }],
  // paraphrased copies (6): same act re-typed from paper, worded differently; includes identity and data traps
  ['v2-p01', 7, 'Anna Ribeiro', 'H-204811', '21:55', 'PCM 1g IV', 'for temp 38.6', 'JM', { kind: 'paraphrase', of: 'v1-01', traps: ['name-variant'] }],
  ['v2-p03', 3, 'Fatima Rahman', 'H-210045', '', 'morphine 2 mg s/c', 'pain 7/10, PRN', 'JM', { kind: 'paraphrase', of: 'v1-03', traps: ['missing-time', 'competing-match'] }],
  ['v2-p09', 18, 'Grace Owusu', 'H-209921', '00:20', 'ceftriaxon 2g iv', 'given late, waiting for pharmacy', 'KS', { kind: 'paraphrase', of: 'v1-09', traps: ['id-transposed', 'drug-typo'] }],
  ['v2-p11', 4, 'R. Costa', 'H-201190', '00:50', 'amoxiclav 1.2 g IV', 'new cannula L arm', 'JM', { kind: 'paraphrase', of: 'v1-11' }],
  ['v2-p13', 8, 'Mei Chen', 'H-199850', '01:10', 'O2 2L via nasal specs', 'NEWS 6, sats 91% on air', 'JM', { kind: 'paraphrase', of: 'v1-13' }],
  ['v2-p23', 7, 'Ana Ribeiro', 'H-204811', '03:00', 'temp down to 37.4', 'settled', 'JM', { kind: 'paraphrase', of: 'v1-23' }],
  // documented corrections (3): the sheet itself carries the evidence
  ['v2-a16', 5, 'Henry Walsh', 'H-190027', '02:30', 'Moved to bed 6 (side room) - infection control', 'corr. time: moved at 02:30 not 02:00 (JM)', 'JM', { kind: 'amendment', of: 'v1-16', field: 'time', from: '02:00', to: '02:30' }],
  ['v2-a18', 10, 'Ines Duarte', 'H-206642', '02:20', 'Oxycodone 10mg PO PRN - pain 6/10', 'corrected by JM: dose was 10mg, not 5mg', 'JM', { kind: 'amendment', of: 'v1-18', field: 'dose', from: '5mg', to: '10mg' }],
  ['v2-a20', 20, 'Omar Haddad', 'H-203381', '02:40', 'Enoxaparin 40mg SC - NOT given, pt refused', 'per KS 06:00: was logged as given by mistake', 'KS', { kind: 'amendment', of: 'v1-20', field: 'status', from: 'given', to: 'not given (patient refused)' }],
  // new acts after the first email (3), including genuine repeats that must NOT be merged
  ['v2-n1', 3, 'Fatima Rahman', 'H-210045', '01:45', 'Morphine 2mg SC PRN', 'pain still 6/10', 'JM', { kind: 'new', traps: ['genuine-repeat-of:v1-03'] }],
  ['v2-n2', 15, 'George Mills', 'H-187220', '05:30', 'BM 6.2', '', 'KS', { kind: 'new', traps: ['genuine-repeat-of:v1-05'] }],
  ['v2-n3', 5, 'Joan Pike', 'H-212950', '03:40', 'Admitted from ED - obs BP 128/80 HR 88', 'new admission, bed 5', 'JM', { kind: 'new', traps: ['not-in-census'] }],
  // ambiguous (2): the right outcome is an open question with an owner, not a guess
  ['v2-q1', 3, 'F. Rahman', 'H-210045', '04:20', 'MS 10mg given', '', 'JM', { kind: 'ambiguous', reason: "'MS' is an error-prone abbreviation (morphine sulfate or magnesium sulfate) and the dose differs from earlier entries", owner: 'documenting nurse (JM)' }],
  ['v2-q2', 5, '', '', '05:00', 'obs done - BP 132/84', '', 'JM', { kind: 'ambiguous', reason: 'bed only, no name or hospital number; bed 5 changed patient during the night (Henry Walsh until 02:30, Joan Pike from 03:40)', owner: 'documenting nurse (JM)' }],
];

// JM sorted her copy by bed (then time); that is how three rows were lost.
const v2Sorted = [...V2].sort((a, b) => a[1] - b[1] || (a[4] || '99:99').localeCompare(b[4] || '99:99'));

function xlsx(headers, rows, sheetName) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  // store everything as text, the way a hurried nurse types it
  for (const ref of Object.keys(ws)) if (!ref.startsWith('!')) ws[ref].t = 's';
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(8, h.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

const v1Headers = ['Bed', 'Patient', 'Hosp no', 'Time', 'What was done', 'By'];
const v2Headers = ['Bed', 'Patient', 'Hosp no', 'Time given', 'What was done', 'Comments', 'By'];

writeFileSync(new URL('7B-downtime-log.xlsx', OUT), xlsx(v1Headers, V1.map((r) => r.slice(1).map(String)), 'Downtime 7B'));
writeFileSync(
  new URL('7B-downtime-log (2).xlsx', OUT),
  xlsx(v2Headers, v2Sorted.map((r) => r.slice(1, 8).map(String)), 'Downtime 7B'),
);
writeFileSync(
  new URL('ward-census.csv', OUT),
  ['Bed,Patient,Hospital number', ...CENSUS.map((r) => r.join(','))].join('\n') + '\n',
);

// ---- Answer key (never shown to any model)
const sheetRow = (list, id) => list.findIndex((r) => r[0] === id) + 2; // header is row 1
const v2Ids = new Set(V2.map((r) => r[0]));
const keepFromV1 = V1.filter((r) => !V2.some((x) => x[8].of === r[0])).map((r) => r[0]);

const key = {
  _about:
    'Frozen benchmark for the Lantern downtime drill. Synthetic data. Row ids map to sheet rows via "sheetRow". Never include this file in prompts.',
  scenario: SCENARIO,
  files: {
    census: 'ward-census.csv',
    v1: '7B-downtime-log.xlsx',
    v2: '7B-downtime-log (2).xlsx',
  },
  rows: {
    v1: V1.map((r) => ({ id: r[0], sheetRow: sheetRow(V1, r[0]) })),
    v2: v2Sorted.map((r) => ({ id: r[0], sheetRow: sheetRow(v2Sorted, r[0]), ...r[8] })),
  },
  expected: {
    // every v1 row that has no counterpart in v2 must survive into the worklist
    onlyInV1: keepFromV1,
    // pairs that describe the same act (copies, paraphrases, amendments)
    sameActPairs: V2.filter((r) => ['copy', 'paraphrase', 'amendment'].includes(r[8].kind)).map((r) => ({
      v1: r[8].of,
      v2: r[0],
      kind: r[8].kind,
    })),
    // pairs a careless reconciler would merge; they are separate acts
    mustNotMerge: [
      { v1: 'v1-03', v2: 'v2-n1', why: 'second PRN morphine dose at 01:45 (first at 22:30)' },
      { v1: 'v1-05', v2: 'v2-n2', why: 'later glucose check with a different value' },
      { v1: 'v1-03', v2: 'v2-q1', why: 'different drug abbreviation and dose; must stay open' },
    ],
    amendments: V2.filter((r) => r[8].kind === 'amendment').map((r) => ({ v1: r[8].of, v2: r[0], field: r[8].field, from: r[8].from, to: r[8].to })),
    openQuestions: V2.filter((r) => r[8].kind === 'ambiguous').map((r) => ({ v2: r[0], reason: r[8].reason, owner: r[8].owner })),
    identityConflicts: [
      { rows: ['v1-01', 'v2-p01'], kind: 'name-variant', resolution: 'Ana Ribeiro (census, H-204811)' },
      { rows: ['v1-09', 'v2-p09'], kind: 'id-mismatch', resolution: 'H-209912 (census); H-209921 is a transposition' },
      { rows: ['v2-n3'], kind: 'not-in-census', resolution: 'admitted during the outage; confirm against admission record' },
      { rows: ['v2-q2'], kind: 'no-identity', resolution: 'bed only; cannot be attributed without the documenting nurse' },
    ],
    worklist: {
      approvedActs: V1.length + V2.filter((r) => r[8].kind === 'new').length,
      unresolved: V2.filter((r) => r[8].kind === 'ambiguous').length,
    },
  },
};
if (!keepFromV1.every((id) => !v2Ids.has(id))) throw new Error('inconsistent key');
writeFileSync(new URL('answer-key.json', OUT), JSON.stringify(key, null, 2) + '\n');

console.log(
  `drill: v1 ${V1.length} rows, v2 ${V2.length} rows, only-in-v1 ${keepFromV1.join(', ')}, expected worklist ${key.expected.worklist.approvedActs} approved + ${key.expected.worklist.unresolved} open`,
);
