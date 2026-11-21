import { registerBundledFixture } from '../ai/cloudPayload';
import { parseSpreadsheet } from '../core/parse';
import type { SourceFile } from '../core/types';

export const DRILL_FILES = [
  { id: 'census', name: 'ward-census.csv', role: 'census' as const, label: 'Census 21:00' },
  { id: 'v1', name: '7B-downtime-log.xlsx', role: 'log' as const, label: 'v1 · emailed 03:10' },
  { id: 'v2', name: '7B-downtime-log (2).xlsx', role: 'log' as const, label: 'v2 · reply-all 07:40' },
];

/** Loads the bundled synthetic drill (precached by the service worker, so it works offline). */
export async function loadDrillFiles(): Promise<SourceFile[]> {
  return Promise.all(
    DRILL_FILES.map(async (f) => {
      const res = await fetch(`/fixtures/drill/${encodeURIComponent(f.name)}`);
      if (!res.ok) throw new Error(`Could not load ${f.name} (${res.status})`);
      const g = await parseSpreadsheet(f.name, await res.arrayBuffer());
      registerBundledFixture(g.hash);
      return { id: f.id, name: f.name, hash: g.hash, versionLabel: f.id, role: f.role, origin: 'bundled-fixture' as const, headers: g.headers, rows: g.rows, mapping: [] };
    }),
  );
}

/** A file the user picked. It is parsed locally and never registered as cloud-eligible. */
export async function importUserFile(file: File, id: string, role: SourceFile['role']): Promise<SourceFile> {
  const g = await parseSpreadsheet(file.name, await file.arrayBuffer());
  return { id, name: file.name, hash: g.hash, versionLabel: id, role, origin: 'user-import', headers: g.headers, rows: g.rows, mapping: [] };
}
