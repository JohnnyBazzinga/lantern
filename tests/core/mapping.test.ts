import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parseSpreadsheet } from '../../src/core/parse';
import { profileColumns } from '../../src/core/profile';
import { reconcileMapping, type ModelOpinion } from '../../src/core/mapping';

const grid = async (name: string) =>
  parseSpreadsheet(name, await readFile(new URL(`../../public/fixtures/dev/${name}`, import.meta.url)));

const ops = (fields: (string | null)[]): ModelOpinion[] =>
  fields.flatMap((f, index) => (f ? [{ index, field: f as ModelOpinion['field'], confidence: 'high' as const }] : []));

describe('profileColumns', () => {
  it('recognises value shapes independently of headers', async () => {
    const c = await grid('variant-c.csv');
    expect(profileColumns(c.headers, c.rows).map((p) => p.suggested)).toEqual(['bed', 'patient', null, 'documented_by', 'ignore']);
    const b = await grid('variant-b.csv');
    expect(profileColumns(b.headers, b.rows).map((p) => p.suggested)).toEqual([
      'bed',
      'patient_name',
      'patient_id',
      'event_time',
      null,
      null,
      'documented_by',
    ]);
  });
});

describe('reconcileMapping', () => {
  it('fixes the real Gemini Nano errors from the day-1 run and flags them for review', async () => {
    // Observed on 2026-11-21 (S3, variant C): "Who" → documented_by, "Logged by" → ignore, "Sent?" missing
    const c = await grid('variant-c.csv');
    const out = reconcileMapping(profileColumns(c.headers, c.rows), ops(['bed', 'documented_by', 'act', 'ignore', null]));
    expect(out.map((x) => x.field)).toEqual(['bed', 'patient', 'act', 'documented_by', 'ignore']);
    expect(out.filter((x) => x.needsReview).map((x) => x.index)).toEqual([1, 3, 4]);
  });

  it('turns a name-only "patient" column into patient_name', async () => {
    // Observed on 2026-11-21 (S3, variant A): "Patient" → patient although IDs are in "Patient No."
    const a = await grid('variant-a.csv');
    const out = reconcileMapping(
      profileColumns(a.headers, a.rows),
      ops(['bed', 'patient', 'patient_id', 'event_time', 'act', 'notes', 'documented_by']),
    );
    expect(out.map((x) => x.field)).toEqual(['bed', 'patient_name', 'patient_id', 'event_time', 'act', 'notes', 'documented_by']);
    expect(out.some((x) => x.needsReview)).toBe(false);
  });

  it('never assigns a unique field to two columns', async () => {
    const a = await grid('variant-a.csv');
    const out = reconcileMapping(
      profileColumns(a.headers, a.rows),
      ops(['bed', 'patient_name', 'patient_id', 'event_time', 'act', 'notes', 'event_time']),
    );
    expect(out.filter((x) => x.field === 'event_time')).toHaveLength(1);
    expect(out[6]?.field).toBe('documented_by');
    expect(out[6]?.needsReview).toBe(true);
  });
});
