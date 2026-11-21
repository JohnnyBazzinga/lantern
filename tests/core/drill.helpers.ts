import { readFile } from 'node:fs/promises';
import { buildActs, buildCensus } from '../../src/core/acts';
import type { CanonicalField } from '../../src/core/fields';
import { parseSpreadsheet } from '../../src/core/parse';
import type { AnswerKey } from '../../src/core/score';
import type { SourceFile } from '../../src/core/types';

const dir = new URL('../../public/fixtures/drill/', import.meta.url);

async function load(id: string, name: string, role: SourceFile['role'], fields: CanonicalField[]): Promise<SourceFile> {
  const g = await parseSpreadsheet(name, await readFile(new URL(name, dir)));
  return {
    id,
    name,
    hash: g.hash,
    versionLabel: id,
    role,
    origin: 'bundled-fixture',
    headers: g.headers,
    rows: g.rows,
    mapping: fields.map((field, index) => ({ index, header: g.headers[index] ?? '', field, basis: 'agree', needsReview: false, model: field, shape: field })),
  };
}

export async function loadDrill() {
  const census = await load('census', 'ward-census.csv', 'census', ['bed', 'patient_name', 'patient_id']);
  const v1 = await load('v1', '7B-downtime-log.xlsx', 'log', ['bed', 'patient_name', 'patient_id', 'event_time', 'act', 'documented_by']);
  const v2 = await load('v2', '7B-downtime-log (2).xlsx', 'log', ['bed', 'patient_name', 'patient_id', 'event_time', 'act', 'notes', 'documented_by']);
  const key = JSON.parse(await readFile(new URL('answer-key.json', dir), 'utf8')) as AnswerKey;
  return { census: buildCensus(census), A: buildActs(v1), B: buildActs(v2), key, files: { census, v1, v2 } };
}
