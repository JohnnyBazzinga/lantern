import type { SourceFile } from '../core/types';

/**
 * The only door to the cloud. A source file may contribute to a cloud prompt only if it is one of
 * the synthetic drill files bundled with the app, recognised by the SHA-256 of its bytes. A file a
 * user imports can never pass, whatever its name or "origin" field says.
 */
const bundledHashes = new Set<string>();

export function registerBundledFixture(hash: string): void {
  bundledHashes.add(hash);
}

export class CloudNotAllowedError extends Error {
  constructor(file: SourceFile) {
    super(`“${file.name}” is not a bundled synthetic file; its content never leaves this device.`);
    this.name = 'CloudNotAllowedError';
  }
}

export function cloudAllowed(file: SourceFile): boolean {
  return file.origin === 'bundled-fixture' && bundledHashes.has(file.hash);
}

export function assertCloudAllowed(files: SourceFile[]): void {
  for (const f of files) if (!cloudAllowed(f)) throw new CloudNotAllowedError(f);
}

/** test helper */
export function _resetBundled(): void {
  bundledHashes.clear();
}
