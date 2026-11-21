import { beforeEach, describe, expect, it } from 'vitest';
import { _resetBundled, assertCloudAllowed, CloudNotAllowedError, registerBundledFixture } from '../../src/ai/cloudPayload';
import type { SourceFile } from '../../src/core/types';

const file = (over: Partial<SourceFile>): SourceFile => ({
  id: 'v1',
  name: '7B-downtime-log.xlsx',
  hash: 'a'.repeat(64),
  versionLabel: 'v1',
  role: 'log',
  origin: 'bundled-fixture',
  headers: [],
  rows: [],
  mapping: [],
  ...over,
});

describe('cloud payload guard', () => {
  beforeEach(() => _resetBundled());

  it('allows only registered bundled fixtures', () => {
    registerBundledFixture('a'.repeat(64));
    expect(() => assertCloudAllowed([file({})])).not.toThrow();
  });

  it('rejects any user import, even with a fixture name', () => {
    registerBundledFixture('a'.repeat(64));
    expect(() => assertCloudAllowed([file({ origin: 'user-import' })])).toThrow(CloudNotAllowedError);
  });

  it('rejects a file claiming to be a fixture whose bytes are not bundled', () => {
    registerBundledFixture('a'.repeat(64));
    expect(() => assertCloudAllowed([file({ hash: 'b'.repeat(64) })])).toThrow(CloudNotAllowedError);
  });
});
