import * as XLSX from 'xlsx';

/**
 * A parsed downtime sheet. Values are kept exactly as displayed (never type-converted),
 * because "0005" and "22:15" are evidence: Lantern must be able to show the reviewer the
 * original cell, character for character.
 */
export interface Grid {
  fileName: string;
  /** SHA-256 of the file bytes; re-importing identical bytes is recognised as the same source */
  hash: string;
  sheet: string;
  headers: string[];
  rows: string[][];
}

export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  // copy into a plain ArrayBuffer-backed view (WebCrypto rejects SharedArrayBuffer-backed views)
  const bytes = new Uint8Array(data instanceof Uint8Array ? data : new Uint8Array(data));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function parseSpreadsheet(fileName: string, data: ArrayBuffer | Uint8Array): Promise<Grid> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  // raw: true stops SheetJS from re-interpreting CSV text (e.g. "0005" → 5, "22:15" → a time serial)
  const wb = XLSX.read(bytes, { type: 'array', raw: true, dense: true });
  const sheet = wb.SheetNames[0];
  if (!sheet) throw new Error(`${fileName}: no sheets found`);
  const ws = wb.Sheets[sheet];
  if (!ws) throw new Error(`${fileName}: sheet ${sheet} is unreadable`);
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: '', blankrows: false });
  const [head, ...body] = aoa;
  if (!head) throw new Error(`${fileName}: the sheet is empty`);
  const width = Math.max(head.length, ...body.map((r) => r.length));
  const norm = (r: unknown[]) => Array.from({ length: width }, (_, i) => String(r[i] ?? '').trim());
  return {
    fileName,
    hash: await sha256Hex(bytes),
    sheet,
    headers: norm(head),
    rows: body.map(norm).filter((r) => r.some((v) => v !== '')),
  };
}

/** Spreadsheet-style reference for a data cell: data row 0 is sheet row 2 (row 1 holds headers). */
export function cellRef(dataRow: number, col: number): string {
  return XLSX.utils.encode_cell({ r: dataRow + 1, c: col });
}
