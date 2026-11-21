import { afterEach, describe, expect, it } from 'vitest';
import { buildActs, buildCensus } from '../../src/core/acts';
import { findCandidates } from '../../src/core/candidates';
import { categoryOf, enteredBy, followUp, hasCorrectionNote, isHighAlert, relayedFrom } from '../../src/core/clinical';
import { identityDetail, resolveIdentities } from '../../src/core/identity';
import { reconcileMapping } from '../../src/core/mapping';
import { parseSpreadsheet } from '../../src/core/parse';
import { profileColumns } from '../../src/core/profile';
import { pairQuestion, singleQuestion } from '../../src/core/questions';
import { propose } from '../../src/core/reconcile';
import { errorProneAbbreviations } from '../../src/core/text';
import type { Act, Disposition, SourceFile } from '../../src/core/types';
import { buildWorklist, worklistCsv } from '../../src/core/worklist';
import { setLang, type Lang } from '../../src/i18n/lang';
import { loadDrill } from './drill.helpers';

afterEach(() => setLang('en'));

/** A small Portuguese downtime sheet, as a ward in Portugal would type it. Fictional patients. */
const CENSUS = `Cama,Doente,N.º processo
3,Maria Antunes,H-300112
5,João Pereira,H-300245
8,Ana Costa,H-300377
`;
const V1 = `Cama,Doente,N.º processo,Hora,Intervenção,Enf.
3,Maria Antunes,H-300112,22:00,Paracetamol 1 g EV,KS
3,Maria Antunes,H-300112,23:00,Morfina 2 mg EV,KS
5,João Pereira,H-300245,02:40,Enoxaparina 40 mg SC,KS
8,Ana Costa,H-300377,23:40,"Queda no WC, sem lesões aparentes",MR
9,Rui Lopes,H-300488,21:50,"Admitido vindo da Urgência, TA 128/80",MR
`;
// the reply-all copy: a repeat morphine dose 3h15 later, and a refusal written only in the comments column
const V2 = `Cama,Doente,N.º processo,Hora,Intervenção,Observações,Enf.
3,Maria Antunes,H-300112,22:00,Paracetamol 1 g EV,,KS
3,Maria Antunes,H-300112,23:00,Morfina 2 mg EV,,KS
3,Maria Antunes,H-300112,02:15,Morfina 2 mg EV,,KS
5,João Pereira,H-300245,02:40,Enoxaparina 40 mg SC,"NÃO administrada, doente recusou",KS
8,Ana Costa,H-300377,23:40,"Queda no WC, sem lesões aparentes",,MR
9,Rui Lopes,H-300488,21:50,"Admitido vindo da Urgência, TA 128/80",,MR
`;

async function file(id: string, name: string, csv: string, role: SourceFile['role'], versionLabel: string): Promise<SourceFile> {
  const g = await parseSpreadsheet(name, new TextEncoder().encode(csv));
  // no model at all: the columns are read from their values and Portuguese headers only
  const mapping = reconcileMapping(profileColumns(g.headers, g.rows), []);
  return { id, name, hash: g.hash, versionLabel, role, origin: 'user-import', headers: g.headers, rows: g.rows, mapping };
}

async function reviewPortugueseSheet(lang: Lang) {
  setLang(lang);
  const census = await file('census', 'internados.csv', CENSUS, 'census', 'census');
  const v1 = await file('v1', 'registo-7B.csv', V1, 'log', 'earlier version');
  const v2 = await file('v2', 'registo-7B (2).csv', V2, 'log', 'later version');
  const A = buildActs(v1);
  const B = buildActs(v2);
  const identity = resolveIdentities([...A, ...B], buildCensus(census));
  const candidates = findCandidates(A, B);
  const proposals = propose({ earlier: A, later: B, candidates, identity });
  // accept every suggestion, as a reviewer pressing the suggested button would
  const decisions = new Map<string, Disposition | undefined>(proposals.map((p) => [p.actId, p.disposition]));
  const wl = buildWorklist([...A, ...B], decisions, { nightOf: '2026-11-21' });
  return { v1, v2, A, B, identity, proposals, wl };
}

describe('Portuguese sheets, with no model', () => {
  it('maps Portuguese headers from values and header words alone', async () => {
    const { v1, v2 } = await reviewPortugueseSheet('pt');
    expect(v1.mapping.map((c) => c.field)).toEqual(['bed', 'patient_name', 'patient_id', 'event_time', 'act', 'documented_by']);
    expect(v2.mapping.map((c) => c.field)).toEqual(['bed', 'patient_name', 'patient_id', 'event_time', 'act', 'notes', 'documented_by']);
  });

  it('never enters a refusal written in the comments as given, and keeps both morphine doses', async () => {
    const { wl } = await reviewPortugueseSheet('pt');
    const enox = wl.ready.filter((r) => /enoxaparina/i.test(r.act));
    expect(enox).toHaveLength(1);
    expect(enox[0]!.act).toContain('NÃO administrada');
    expect(enox[0]!.corrected).toHaveLength(1);
    expect(enox[0]!.highAlert).toBe(true);
    const morphine = wl.ready.filter((r) => /morfina/i.test(r.act));
    expect(morphine.map((r) => `${r.date} ${r.time}`)).toEqual(['2026-11-21 23:00', '2026-11-22 02:15']);
    expect(wl.ready).toHaveLength(6);
  });

  it('splits the work: admissions to the secretary, care to the nurse who documented it, in Portuguese', async () => {
    const { wl } = await reviewPortugueseSheet('pt');
    const admission = wl.ready.find((r) => /admitido/i.test(r.act))!;
    expect(admission.enteredBy).toEqual({ role: 'clerk', who: 'secretariado clínico' });
    expect(admission.clinicalPartBy).toBe('enf. MR');
    expect(wl.ready.find((r) => /queda/i.test(r.act))?.followUp).toBe('Uma queda: é preciso também notificar o incidente.');
    expect(wl.ready.find((r) => /paracetamol/i.test(r.act))?.enteredBy).toEqual({ role: 'nurse', who: 'enf. KS' });
    expect(wl.ready.every((r) => r.lateEntry.startsWith('Registo diferido, após indisponibilidade do sistema. Data e hora do ato: '))).toBe(true);
    expect(wl.ready.find((r) => /enoxaparina/i.test(r.act))?.lateEntry).toContain('versão posterior, linha 5');
  });

  it('reaches the same decisions in English and in Portuguese: language changes the words, never the outcome', async () => {
    const kinds = (p: { actId: string; disposition: Disposition; group: string }[]) => p.map((x) => `${x.actId}:${x.group}:${x.disposition.kind}`);
    const en = await reviewPortugueseSheet('en');
    const pt = await reviewPortugueseSheet('pt');
    expect(kinds(pt.proposals)).toEqual(kinds(en.proposals));
    expect(pt.wl.ready.map((r) => r.actId)).toEqual(en.wl.ready.map((r) => r.actId));
    expect(en.wl.ready.find((r) => /admitido/i.test(r.act))?.enteredBy.who).toBe('clinical secretary');
    expect(en.wl.ready[0]!.lateEntry).toMatch(/^Late entry after system downtime/);
  });

  it('writes a CSV that Excel in Portugal opens: semicolons, UTF-8 byte-order mark, Portuguese headers', async () => {
    const { wl } = await reviewPortugueseSheet('pt');
    const csv = worklistCsv(wl);
    expect(csv.startsWith('﻿Estado;Quem regista no sistema;Categoria;Data;Hora;N.º de processo;Doente;Cama;Ato;')).toBe(true);
    expect(csv).toContain('Pronto a registar;secretariado clínico;Admissão ou transferência;');
    // commas are ordinary text in a semicolon file; a semicolon inside a value would be quoted
    expect(csv).toContain(';Queda no WC, sem lesões aparentes;');
  });

  it('describes identity problems again in the current language', async () => {
    const { identity } = await reviewPortugueseSheet('pt');
    const issue = identity.find((i) => i.kind === 'not-in-census')!;
    expect(issue.detail).toContain('não consta da lista de doentes');
    setLang('en');
    expect(identityDetail(issue)).toBe('Rui Lopes is not on the census (admitted during the outage?)');
  });
});

describe('Portuguese lexicons', () => {
  const act = (actText: string, notes = '', documentedBy = 'KS') => ({ actText, notes, documentedBy });

  it('recognises documented corrections', () => {
    for (const t of ['corrigido: 22:15', 'Correção da dose', 'dado por engano', 'NÃO administrada', 'não foi dado', 'em vez de 2 mg', 'anulado'])
      expect(hasCorrectionNote(act('x', t)), t).toBe(true);
    expect(hasCorrectionNote(act('Paracetamol 1 g EV', 'doente a dormir'))).toBe(false);
  });

  it('classifies ward shorthand', () => {
    expect(categoryOf(act('Admitido vindo da Urgência'))).toBe('admission-transfer');
    expect(categoryOf(act('Transferido para a cama 12'))).toBe('admission-transfer');
    expect(categoryOf(act('Morfina 2 mg EV'))).toBe('medication');
    expect(categoryOf(act('Insulina rápida 4 unidades SC'))).toBe('medication');
    expect(categoryOf(act('TA 128/80, FC 92'))).toBe('observation');
    expect(categoryOf(act('Glicemia capilar 182'))).toBe('observation');
    expect(categoryOf(act('Família informada por telefone'))).toBe('communication');
    expect(categoryOf(act('Posicionado em decúbito lateral'))).toBe('nursing');
  });

  it('flags high-alert medicines and error-prone abbreviations', () => {
    for (const t of ['Morfina 2 mg EV', 'Enoxaparina 40 mg SC', 'Insulina 4 UI', 'Cloreto de potássio 7,5%', 'Varfarina 5 mg'])
      expect(isHighAlert(act(t)), t).toBe(true);
    expect(isHighAlert(act('Paracetamol 1 g EV'))).toBe(false);
    setLang('pt');
    expect(errorProneAbbreviations('Insulina 4 UI SC')).toEqual(["'UI' (unidades internacionais, lido como IV ou 10)"]);
    expect(errorProneAbbreviations('Furosemida 20,0 mg EV')).toEqual(['zero à direita (1,0 mg lido como 10 mg)']);
  });

  it('finds corrections relayed on someone else’s word, but not "per os"', () => {
    expect(relayedFrom(act('Hora corrigida segundo enf. KS', '', 'MR'))).toBe('KS');
    expect(relayedFrom(act('Corrigido', 'por indicação de KS', 'MR'))).toBe('KS');
    expect(relayedFrom(act('Paracetamol 1 g per os', '', 'MR'))).toBeNull();
    expect(relayedFrom(act('Corrigido segundo KS', '', 'KS'))).toBeNull();
  });

  it('flags falls for an incident report', () => {
    setLang('pt');
    expect(followUp(act('Encontrado no chão junto à cama'))).toBe('Uma queda: é preciso também notificar o incidente.');
    expect(followUp(act('Caiu ao levantar-se'))).not.toBeNull();
  });

  it('writes questions in European Portuguese, quoting rows as typed', () => {
    setLang('pt');
    const row = (time: string, actText: string, notes = ''): Act => ({
      id: 'v1:0',
      fileId: 'v1',
      versionLabel: 'version 1',
      row: 0,
      bed: '5',
      patientName: 'João Pereira',
      patientId: 'H-300245',
      eventTime: time,
      timeMinutes: null,
      actText,
      notes,
      documentedBy: 'KS',
      evidence: {},
      patientKey: 'H-300245',
    });
    const q = pairQuestion('changed', row('02:40', 'Enoxaparina 40 mg SC'), row('02:40', 'Enoxaparina 40 mg SC', 'NÃO administrada'));
    expect(q).toEqual({
      owner: 'KS',
      question: 'A cópia posterior corrige “Enoxaparina 40 mg SC” às 02:40 para “Enoxaparina 40 mg SC” (“NÃO administrada”). Qual das versões está certa?',
    });
    expect(singleQuestion('only-later', row('01:10', 'Morfina 2 mg EV'))).toBe(
      '“Morfina 2 mg EV” à 01:10 só está na cópia posterior. Confirme, por favor, que aconteceu e a que horas.',
    );
    expect(singleQuestion('only-later', row('', 'Morfina 2 mg EV'))).toContain('(sem hora escrita)');
  });
});

describe('Ward 7B drill in Portuguese', () => {
  it('keeps the English drill rows as typed and words everything else in Portuguese', async () => {
    setLang('pt');
    const { A, B, census } = await loadDrill();
    const identity = resolveIdentities([...A, ...B], census);
    const proposals = propose({ earlier: A, later: B, candidates: findCandidates(A, B), identity });
    const wl = buildWorklist([...A, ...B], new Map(proposals.map((p) => [p.actId, p.disposition])), { nightOf: '2026-11-21' });
    expect(wl.ready.some((r) => r.enteredBy.who === 'enf. KS')).toBe(true);
    expect(wl.ready.every((r) => r.lateEntry.startsWith('Registo diferido'))).toBe(true);
    expect(wl.ready.find((r) => /enoxaparin/i.test(r.act))?.act).toMatch(/NOT given/);
    expect(worklistCsv(wl, { drill: true })).toContain('# Simulacro Lantern: doentes fictícios, não é um registo real');
    expect(enteredBy({ actText: 'Moved to bed 4', notes: '', documentedBy: 'KS' }).who).toBe('secretariado clínico');
  });
});
