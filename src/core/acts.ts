import type { CanonicalField } from './fields';
import { cellRef } from './parse';
import { nightMinutes } from './text';
import type { Act, CensusEntry, Evidence, SourceFile } from './types';

const ID_IN_TEXT = /\(?\b([A-Z]{1,4}-?\d{4,}|\d{6,})\b\)?/;

function col(file: SourceFile, field: CanonicalField): number[] {
  return file.mapping.filter((c) => c.field === field).map((c) => c.index);
}

function ev(file: SourceFile, row: number, c: number): Evidence {
  return { fileId: file.id, row, col: c, ref: cellRef(row, c), text: file.rows[row]?.[c] ?? '' };
}

/** Deterministically turns a mapped log file into acts. No model involved; values stay as written. */
export function buildActs(file: SourceFile): Act[] {
  const pick = (field: CanonicalField) => col(file, field);
  const [bedC] = pick('bed');
  const [nameC] = pick('patient_name');
  const [idC] = pick('patient_id');
  const [comboC] = pick('patient');
  const [timeC] = pick('event_time');
  const actCs = pick('act');
  const notesCs = pick('notes');
  const [byC] = pick('documented_by');

  return file.rows.map((r, row) => {
    const get = (c: number | undefined) => (c === undefined ? '' : (r[c] ?? '').trim());
    let patientName = get(nameC);
    let patientId = get(idC);
    let patientEv = nameC !== undefined ? ev(file, row, nameC) : undefined;
    if (comboC !== undefined) {
      const combo = get(comboC);
      const m = combo.match(ID_IN_TEXT);
      patientId ||= m?.[1] ?? '';
      patientName ||= (m ? combo.replace(m[0], '') : combo).replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim();
      patientEv = ev(file, row, comboC);
    }
    const actText = actCs.map(get).filter((v) => v && !/^[-–—]+$/.test(v)).join(' — ');
    const notes = notesCs.map(get).filter(Boolean).join(' — ');
    const eventTime = get(timeC);
    return {
      id: `${file.id}:${row}`,
      fileId: file.id,
      versionLabel: file.versionLabel,
      row,
      bed: get(bedC),
      patientName,
      patientId,
      eventTime,
      timeMinutes: eventTime ? nightMinutes(eventTime) : null,
      actText,
      notes,
      documentedBy: get(byC),
      evidence: {
        ...(bedC !== undefined && { bed: ev(file, row, bedC) }),
        ...(patientEv && { patient: patientEv }),
        ...(timeC !== undefined && { time: ev(file, row, timeC) }),
        ...(actCs[0] !== undefined && { act: ev(file, row, actCs[0]) }),
        ...(notesCs[0] !== undefined && { notes: ev(file, row, notesCs[0]) }),
        ...(byC !== undefined && { by: ev(file, row, byC) }),
      },
      patientKey: null,
    };
  });
}

/** Reads a census file (bed, name, hospital number), skipping empty beds. */
export function buildCensus(file: SourceFile): CensusEntry[] {
  return buildActs(file)
    .filter((a) => a.patientName || a.patientId)
    .map((a) => ({ bed: a.bed, patientName: a.patientName, patientId: a.patientId }));
}
