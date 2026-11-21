import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { cellRef, parseSpreadsheet } from '../../src/core/parse';

const fixture = (name: string) => readFile(new URL(`../../public/fixtures/dev/${name}`, import.meta.url));

describe('parseSpreadsheet', () => {
  it('keeps CSV values exactly as written (no time or number conversion)', async () => {
    const g = await parseSpreadsheet('variant-b.csv', await fixture('variant-b.csv'));
    expect(g.headers).toEqual(['bed #', 'pt name', 'hosp no', 'when', 'drug + dose', 'comments', 'initials']);
    expect(g.rows).toHaveLength(10);
    expect(g.rows[3]?.[3]).toBe('0005');
    expect(g.rows[0]?.[3]).toBe('2215');
  });

  it('keeps quoted commas inside one cell', async () => {
    const g = await parseSpreadsheet('variant-a.csv', await fixture('variant-a.csv'));
    expect(g.rows[3]?.[5]).toBe('15g glucose gel given, recheck 4.8 at 23:50');
    expect(g.rows[0]?.[3]).toBe('22:15');
  });

  it('hashes content so identical bytes are recognised as the same source', async () => {
    const bytes = await fixture('variant-c.csv');
    const a = await parseSpreadsheet('one-name.csv', bytes);
    const b = await parseSpreadsheet('another-name.csv', bytes);
    expect(a.hash).toBe(b.hash);
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('reads Portuguese CSV files as Excel saves them: Windows-1252 or UTF-8, comma or semicolon', async () => {
    const text = 'Cama;Doente;Hora;Intervenção\n5;João Pereira;02:40;Enoxaparina 40 mg SC\n';
    // Excel's plain "CSV (separado por vírgulas)" in Portugal: Windows-1252 bytes, semicolons
    const cp1252 = Uint8Array.from([...text].map((ch) => ({ ç: 0xe7, ã: 0xe3 })[ch] ?? ch.charCodeAt(0)));
    for (const bytes of [cp1252, new TextEncoder().encode(text), new TextEncoder().encode('\uFEFF' + text)]) {
      const g = await parseSpreadsheet('registo.csv', bytes);
      expect(g.headers).toEqual(['Cama', 'Doente', 'Hora', 'Intervenção']);
      expect(g.rows[0]).toEqual(['5', 'João Pereira', '02:40', 'Enoxaparina 40 mg SC']);
    }
  });

  it('maps data rows to spreadsheet cell references (header is row 1)', () => {
    expect(cellRef(0, 0)).toBe('A2');
    expect(cellRef(3, 5)).toBe('F5');
  });
});
