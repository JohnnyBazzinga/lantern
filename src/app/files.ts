import { registerBundledFixture } from '../ai/cloudPayload';
import { parseSpreadsheet } from '../core/parse';
import type { SourceFile } from '../core/types';
import { getLang } from '../i18n/lang';

export const DRILL_FILES = [
  { id: 'census', name: 'ward-census.csv', role: 'census' as const, label: 'census' },
  { id: 'v1', name: '7B-downtime-log.xlsx', role: 'log' as const, label: 'version 1' },
  { id: 'v2', name: '7B-downtime-log (2).xlsx', role: 'log' as const, label: 'version 2' },
];

/** Loads the bundled synthetic drill (precached by the service worker, so it works offline). */
export async function loadDrillFiles(): Promise<SourceFile[]> {
  return Promise.all(
    DRILL_FILES.map(async (f) => {
      const res = await fetch(`/fixtures/drill/${encodeURIComponent(f.name)}`);
      if (!res.ok) throw new Error(getLang() === 'pt' ? `Não foi possível abrir ${f.name} (${res.status})` : `Could not load ${f.name} (${res.status})`);
      const g = await parseSpreadsheet(f.name, await res.arrayBuffer());
      registerBundledFixture(g.hash);
      return { id: f.id, name: f.name, hash: g.hash, versionLabel: f.label, role: f.role, origin: 'bundled-fixture' as const, headers: g.headers, rows: g.rows, mapping: [] };
    }),
  );
}

/** A file the user picked. It is parsed locally and never registered as cloud-eligible. */
export async function importUserFile(file: File, id: string, role: SourceFile['role']): Promise<SourceFile> {
  const g = await parseSpreadsheet(file.name, await file.arrayBuffer());
  const versionLabel = { census: 'census', v1: 'earlier version', v2: 'later version' }[id] ?? id;
  return { id, name: file.name, hash: g.hash, versionLabel, role, origin: 'user-import', headers: g.headers, rows: g.rows, mapping: [] };
}
