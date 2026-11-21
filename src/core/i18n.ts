import { getLang, locale, msgs, tr } from '../i18n/lang';
import type { CanonicalField } from './fields';

/**
 * Every sentence the deterministic layer writes for people: questions for the nurse, late-entry notes,
 * the reasons behind a suggestion, identity problems, column readings. One place, so the clinical
 * vocabulary stays the same on every screen, in the CSV and on paper.
 *
 * Portuguese is European Portuguese (pt-PT, Acordo Ortográfico de 1990), written for a hospital ward:
 * "doente", "n.º de processo", "cama", "registo diferido", "enf. KS". Rows are always quoted exactly as
 * written, whatever the interface language.
 */

const quote = (s: string, blank: string) => `“${s || blank}”`;

/** "às 02:40", but "à 01:10" (one o'clock is singular in Portuguese). */
export const ptAt = (time: string) => (/^0?1[:h.]\d/.test(time) ? `à ${time}` : `às ${time}`);

export type FieldName = 'time' | 'details';

const en = {
  blank: '(blank)',
  noTime: 'no time',
  q: (s: string) => quote(s, '(blank)'),
  /** "at 02:40", or "(no time written)" */
  at: (time: string) => (time ? `at ${time}` : '(no time written)'),
  and: ' and ',

  version: (label: string) => label,
  row: (label: string, sheetRow: number) => `${label} row ${sheetRow}`,
  field: { time: 'time', details: 'details' } as Record<FieldName, string>,

  category: {
    medication: 'Medication',
    observation: 'Observation',
    'admission-transfer': 'Admission or transfer',
    communication: 'Communication',
    nursing: 'Nursing care',
  },
  clerk: 'clinical secretary',
  nurse: (initials: string) => `nurse ${initials}`,
  nurseInCharge: 'nurse in charge',
  fallFollowUp: 'A fall: an incident report is needed too.',

  fieldLabel: {
    bed: 'Bed',
    patient_name: 'Patient name',
    patient_id: 'Hospital number',
    patient: 'Name and hospital number',
    event_time: 'Time',
    act: 'What was done',
    notes: 'Comments',
    documented_by: 'Who wrote it',
    ignore: 'Not needed',
  } as Record<CanonicalField, string>,

  // questions for the documenting nurse
  relayedQuestion: (by: string, a: string, at: string, b: string, notes: string) =>
    `${by || 'Someone'} corrected your entry on your word: ${a} ${at} became ${b} (${notes}). Please confirm and enter the correction yourself.`,
  correctionQuestion: (a: string, at: string, b: string, notes: string) =>
    `The later copy corrects ${a} ${at} to ${b}${notes ? ` (${notes})` : ''}. Which version is right?`,
  twiceQuestion: (a: string, atA: string, b: string, atB: string) =>
    `One copy says ${a} ${atA}, the other ${b} ${atB}. Is this one act written twice, or two separate acts?`,
  abbreviationQuestion: (a: string, at: string, abbr: string) =>
    `${a} ${at} uses ${abbr}. Was anything given? If so, please write the full drug name and the dose with its unit.`,
  onlyEarlierQuestion: (a: string, at: string) =>
    `${a} ${at} is in the earlier copy but not in the later one. Was it removed on purpose, or lost when the sheet was edited?`,
  onlyLaterQuestion: (a: string, at: string) => `${a} ${at} is only in the later copy. Please confirm it happened, and when.`,
  confirmQuestion: (a: string, at: string) => `Please confirm ${a} ${at}.`,
  notEnoughToLink: (a: string, at: string) => ` It may be the same act as ${a} ${at}, but there is not enough detail to link them.`,
  bed: (b: string) => `bed ${b}`,
  noIdentityQuestion: (a: string, at: string, bed: string) =>
    bed
      ? `${a} ${at} has only bed ${bed}: no name or hospital number. Which patient was this?`
      : `${a} ${at} has no name, hospital number or bed. Which patient was this?`,
  whichPatient: (who: string, detail: string) => `The row says ${who}. ${detail} Which patient is it?`,
  samePatient: (who: string, detail: string) => `The row says ${who}. ${detail} Is it the same patient?`,
  notInCensusQuestion: (who: string) => `${who || 'This patient'} is not on the census. Please confirm the admission and the hospital number.`,

  // identity problems (found by rules, before any model sees a row)
  identity: {
    noIdentity: (bed: string) => `Bed ${bed || '?'} only: no name or hospital number. Do not attribute by bed.`,
    nameVariant: (name: string, censusName: string, censusId: string) => `“${name}” vs census “${censusName}” for ${censusId}`,
    idNameConflict: (rowId: string, censusName: string, name: string) => `${rowId} belongs to ${censusName} in the census, but the row says “${name}”`,
    idMismatch: (name: string, rowId: string, censusId: string, transposed: boolean) =>
      `${name}: row says ${rowId}, census says ${censusId}${transposed ? ' (looks like transposed digits)' : ''}`,
    notInCensus: (who: string) => `${who} is not on the census (admitted during the outage?)`,
  },

  // the rules' reasons
  rules: {
    documentedCorrection: 'a documented correction of the same entry (same time, similar text)',
    apart: (h: number, mm: string) => `recorded ${h}h${mm} apart with no correction note: a repeated act, not a copy`,
    noNote: 'no correction note in the sheet: a re-typed copy, not a correction',
    laterDocuments: 'the later row documents a correction',
    laterDocumentsThis: 'the later row documents a correction of this entry',
  },

  // why Lantern suggests what it suggests
  because: {
    asWrittenIn: (v: string) => `as written in ${v}`,
    correctedIn: (v: string, what: string) => `Corrected in ${v}: “${what}”`,
    correctionOf: (row: string) => `Correction of ${row}`,
    identicalIn: (v: string) => `Identical in ${v}`,
    retypedIn: (v: string) => `Same act re-typed in ${v}`,
    copyOf: (row: string) => `Copy of ${row}`,
    sameAs: (row: string, basis: 'cloud' | 'rule' | 'local') =>
      `Same act as ${row} (${basis === 'cloud' ? 'cloud second opinion' : basis === 'rule' ? 'Lantern’s rules' : 'on-device'})`,
    possiblyRetyped: (row: string) => `Possibly re-typed in ${row}; no on-device model was available, decide manually`,
    possiblySame: (row: string) => `Possibly the same act as ${row}; no on-device model was available, decide manually`,
    missingFrom: (v: string) => `Missing from ${v}: keep unless it was deliberately removed`,
    notIn: (v: string) => `Not in ${v}: keep it if it happened`,
    theLater: 'the later version',
    theEarlier: 'the earlier version',
    notEnoughDetail: 'Not enough detail to link',
    errorProne: 'Error-prone abbreviation: Lantern never interprets these',
    identityUnconfirmed: 'Patient identity cannot be confirmed from the sheet',
    checkIdentity: 'Check the patient identity first',
  },

  // column mapping
  mapping: {
    fromValues: 'read from the values and header',
    noModel: 'no model available: please choose',
    namesOnly: 'values are names without identifiers',
    valuesWin: (shape: string, model: string) => `values look like “${shape}”, header read as “${model}”`,
    headerWins: (model: string, shape: string) => `header read as “${model}”, values suggest “${shape}”`,
    taken: (field: string, col: number) => `“${field}” is already column ${col}`,
    byReviewer: 'set by the reviewer',
  },

  // the worklist and its CSV
  lateEntry: (when: string, by: string, source: string, corrected: boolean) =>
    `Late entry after system downtime. Original time ${when || 'not recorded'}${by ? `, documented by ${by}` : ''} on the downtime log (${source}).${
      corrected ? ' Corrected in the later copy.' : ''
    }`,
  csv: {
    head: [
      'Status',
      'To be entered by',
      'Category',
      'Date',
      'Time',
      'Hospital number',
      'Patient',
      'Bed',
      'Act',
      'Notes',
      'Documented by',
      'Correction',
      'Late-entry note',
      'Source rows',
      'Question',
    ],
    ready: 'Ready for re-entry',
    readyConfirm: (who: string) => `Waiting for ${who} to confirm the correction`,
    question: (owner: string) => `Question for ${owner}`,
    clinicalPart: (who: string) => `clinical part entered by ${who}`,
    drill: '# Lantern drill: fictional patients, not a real record',
    incomplete: (n: number) => `# INCOMPLETE: ${n} rows still have no decision`,
    separator: ',',
  },
};

const pt: typeof en = {
  blank: '(em branco)',
  noTime: 'sem hora',
  q: (s: string) => quote(s, '(em branco)'),
  at: (time: string) => (time ? ptAt(time) : '(sem hora escrita)'),
  and: ' e ',

  version: (label: string) =>
    ({ census: 'lista de doentes', 'earlier version': 'versão anterior', 'later version': 'versão posterior' })[label] ??
    label.replace(/^version (\d+)$/, 'versão $1'),
  row: (label: string, sheetRow: number) => `${label}, linha ${sheetRow}`,
  field: { time: 'hora', details: 'detalhes' },

  category: {
    medication: 'Medicação',
    observation: 'Observação',
    'admission-transfer': 'Admissão ou transferência',
    communication: 'Comunicação',
    nursing: 'Cuidados de enfermagem',
  },
  clerk: 'secretariado clínico',
  nurse: (initials: string) => `enf. ${initials}`,
  nurseInCharge: 'enf. responsável pelo turno',
  fallFollowUp: 'Uma queda: é preciso também notificar o incidente.',

  fieldLabel: {
    bed: 'Cama',
    patient_name: 'Nome do doente',
    patient_id: 'N.º de processo',
    patient: 'Nome e n.º de processo',
    event_time: 'Hora',
    act: 'O que foi feito',
    notes: 'Observações',
    documented_by: 'Quem registou',
    ignore: 'Não é preciso',
  },

  relayedQuestion: (by, a, at, b, notes) =>
    `${by || 'Alguém'} corrigiu o seu registo por indicação sua: ${a} ${at} passou a ${b} (${notes}). Confirme, por favor, e registe a correção.`,
  correctionQuestion: (a, at, b, notes) => `A cópia posterior corrige ${a} ${at} para ${b}${notes ? ` (${notes})` : ''}. Qual das versões está certa?`,
  twiceQuestion: (a, atA, b, atB) => `Uma cópia diz ${a} ${atA}, a outra ${b} ${atB}. É o mesmo ato escrito duas vezes, ou são dois atos diferentes?`,
  abbreviationQuestion: (a, at, abbr) =>
    `No registo ${a} ${at}, consta ${abbr}. Houve administração? Se sim, indique o nome completo do medicamento e a dose, com a unidade.`,
  onlyEarlierQuestion: (a, at) => `${a} ${at} está na cópia anterior, mas não na posterior. Foi retirado de propósito, ou perdeu-se quando a folha foi editada?`,
  onlyLaterQuestion: (a, at) => `${a} ${at} só está na cópia posterior. Confirme, por favor, que aconteceu e a que horas.`,
  confirmQuestion: (a, at) => `Confirme, por favor: ${a} ${at}.`,
  notEnoughToLink: (a, at) => ` Pode ser o mesmo ato que ${a} ${at}, mas não há detalhe suficiente para os ligar.`,
  bed: (b) => `cama ${b}`,
  noIdentityQuestion: (a, at, bed) =>
    bed
      ? `${a} ${at} só indica a cama ${bed}, sem nome nem n.º de processo. A quem se refere este registo?`
      : `${a} ${at} não tem nome, n.º de processo nem cama. A quem se refere este registo?`,
  whichPatient: (who, detail) => `A linha diz ${who}. ${detail} A quem se refere este registo?`,
  samePatient: (who, detail) => `A linha diz ${who}. ${detail} É a mesma pessoa?`,
  notInCensusQuestion: (who) => `${who || 'Este doente'} não consta da lista de doentes. Confirme, por favor, a admissão e o n.º de processo.`,

  identity: {
    noIdentity: (bed) => `Só a cama ${bed || '?'}: sem nome nem n.º de processo. Não associe o registo só pelo número da cama.`,
    nameVariant: (name, censusName, censusId) => `“${name}” na linha, “${censusName}” na lista de doentes, para ${censusId}`,
    idNameConflict: (rowId, censusName, name) => `${rowId} pertence a ${censusName} na lista de doentes, mas a linha diz “${name}”`,
    idMismatch: (name, rowId, censusId, transposed) =>
      `${name}: a linha diz ${rowId}, a lista de doentes diz ${censusId}${transposed ? ' (parecem algarismos trocados)' : ''}`,
    notInCensus: (who) => `${who} não consta da lista de doentes (admissão durante a falha?)`,
  },

  rules: {
    documentedCorrection: 'uma correção documentada do mesmo registo (mesma hora, texto semelhante)',
    apart: (h, mm) => `registados com ${h}h${mm} de intervalo e sem nota de correção: um ato repetido, não uma cópia`,
    noNote: 'a folha não tem nota de correção: uma cópia reescrita, não uma correção',
    laterDocuments: 'a linha posterior documenta uma correção',
    laterDocumentsThis: 'a linha posterior documenta uma correção deste registo',
  },

  because: {
    asWrittenIn: (v) => `conforme a ${v}`,
    correctedIn: (v, what) => `Corrigido na ${v}: “${what}”`,
    correctionOf: (row) => `Correção da ${row}`,
    identicalIn: (v) => `Igual na ${v}`,
    retypedIn: (v) => `O mesmo ato, reescrito na ${v}`,
    copyOf: (row) => `Cópia da ${row}`,
    sameAs: (row, basis) =>
      `O mesmo ato que a ${row} (${basis === 'cloud' ? 'segunda opinião na nuvem' : basis === 'rule' ? 'regras do Lantern' : 'neste computador'})`,
    possiblyRetyped: (row) => `Talvez reescrito na ${row}; não havia modelo local, decida manualmente`,
    possiblySame: (row) => `Talvez o mesmo ato que a ${row}; não havia modelo local, decida manualmente`,
    missingFrom: (v) => `Falta na ${v}: manter, a não ser que tenha sido retirado de propósito`,
    notIn: (v) => `Não está na ${v}: manter, se aconteceu`,
    theLater: 'versão posterior',
    theEarlier: 'versão anterior',
    notEnoughDetail: 'Sem detalhe suficiente para as ligar',
    errorProne: 'Abreviatura que pode dar origem a erro: o Lantern não a interpreta e pede confirmação',
    identityUnconfirmed: 'A identidade do doente não pode ser confirmada pela folha',
    checkIdentity: 'Confirme primeiro a identidade do doente',
  },

  mapping: {
    fromValues: 'lido dos valores e do cabeçalho',
    noModel: 'sem modelo disponível: escolha, por favor',
    namesOnly: 'os valores são nomes sem identificador',
    valuesWin: (shape, model) => `os valores parecem “${shape}”, o cabeçalho foi lido como “${model}”`,
    headerWins: (model, shape) => `cabeçalho lido como “${model}”, os valores sugerem “${shape}”`,
    taken: (field, col) => `“${field}” já é a coluna ${col}`,
    byReviewer: 'escolhido na revisão',
  },

  lateEntry: (when, by, source, corrected) =>
    `Registo diferido, após indisponibilidade do sistema. Data e hora do ato: ${when || 'não registadas'}. Registado${
      by ? ` por ${by}` : ''
    } na folha de contingência (${source}).${corrected ? ' Corrigido na cópia posterior.' : ''}`,
  csv: {
    head: [
      'Estado',
      'Quem regista no sistema',
      'Categoria',
      'Data',
      'Hora',
      'N.º de processo',
      'Doente',
      'Cama',
      'Ato',
      'Notas',
      'Quem escreveu na folha',
      'Correção',
      'Nota de registo diferido',
      'Linhas de origem',
      'Pergunta',
    ],
    ready: 'Pronto a registar',
    readyConfirm: (who) => `A aguardar confirmação da correção por ${who}`,
    question: (owner) => `Pergunta para ${owner}`,
    clinicalPart: (who) => `parte clínica registada por ${who}`,
    drill: '# Simulacro Lantern: doentes fictícios, não é um registo real',
    incomplete: (n) => `# INCOMPLETO: ${n} linhas ainda sem decisão`,
    // Excel in Portugal uses the semicolon as its list separator (the comma is the decimal mark)
    separator: ';',
  },
};

export const CORE = msgs(en, pt);

/** The core text set for the current interface language, read at call time. */
export const ct = () => tr(CORE);

const PT_WEEKDAY = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];

/** "Sun 22 Nov" / "dom., 22/11": a short date for a YYYY-MM-DD string, as a ward would write it. */
export function shortDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!);
  // browsers disagree on Portuguese short weekdays ("dom." vs "domingo"), so they are spelled out here
  if (getLang() === 'pt') return `${PT_WEEKDAY[date.getDay()]}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
  return date.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' });
}
