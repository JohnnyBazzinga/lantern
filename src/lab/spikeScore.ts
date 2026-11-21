import type { ColumnMapping } from '../ai/prompts/v1/mapColumns';
import { unverifiedValues, type ExtractedAct } from '../ai/prompts/v1/extractAct';

/** Scoring for the day-1 spikes against public/fixtures/dev/dev-key.json. */

export interface DevKeyRow {
  act_type: string[] | null;
  event_time: string[] | null;
  medication: string[] | null;
  dose: string[] | null;
  route: string[] | null;
  measurement: string[] | null;
}

export interface DevKeyVariant {
  file: string;
  label: string;
  mapping: string[];
  entry: { act: number; notes: number | null; time: number | null };
  rows: DevKeyRow[];
}

export interface DevKey {
  variants: DevKeyVariant[];
}

export function scoreMapping(pred: ColumnMapping[], expected: string[]) {
  const perColumn = expected.map((exp, i) => {
    const got = pred.find((p) => p.index === i);
    return { index: i, expected: exp, got: got?.field ?? '(missing)', confidence: got?.confidence ?? 'low', ok: got?.field === exp };
  });
  return { correct: perColumn.filter((c) => c.ok).length, total: expected.length, perColumn };
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[.,;]+$/, '');
const normTime = (s: string) => norm(s).replace(':', '');

const STRICT = ['act_type', 'event_time', 'medication', 'dose', 'route'] as const;

export interface FieldScore {
  field: string;
  expected: string[] | null;
  got: string;
  ok: boolean | null; // null = not scored
}

export function scoreExtraction(pred: ExtractedAct, key: DevKeyRow, sourceText: string) {
  const fields: FieldScore[] = STRICT.map((f) => {
    const exp = key[f];
    const got = pred[f];
    if (exp === null) return { field: f, expected: null, got, ok: null };
    const n = f === 'event_time' ? normTime : norm;
    return { field: f, expected: exp, got, ok: exp.map(n).includes(n(got)) };
  });
  const m = key.measurement;
  fields.push({
    field: 'measurement',
    expected: m,
    got: pred.measurement,
    ok: m === null ? null : m.some((x) => norm(pred.measurement).includes(norm(x))),
  });
  const scored = fields.filter((f) => f.ok !== null);
  return {
    fields,
    correct: scored.filter((f) => f.ok).length,
    total: scored.length,
    unverified: unverifiedValues(pred, sourceText),
  };
}
