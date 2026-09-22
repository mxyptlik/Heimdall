// T003 acceptance: unknown stays unknown; duplicates and invalid pricing
// fail; synthetic fixtures import in development and are barred from production.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validatorFor, type CandidateProfile } from '@heimdall/contracts';
import {
  capabilityFromExplicit,
  detectConflicts,
  validateCatalogUpload,
} from '../src/modules/catalog/public.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function loadFixture(): CandidateProfile[] {
  const raw = JSON.parse(
    readFileSync(join(ROOT, 'data', 'catalog', 'synthetic-profiles.v1.json'), 'utf8'),
  ) as { records: CandidateProfile[] };
  return raw.records;
}

function first(records: CandidateProfile[]): CandidateProfile {
  const record = records[0];
  if (record === undefined) throw new Error('fixture must not be empty');
  return record;
}

function second(records: CandidateProfile[]): CandidateProfile {
  const record = records[1];
  if (record === undefined) throw new Error('fixture needs two records');
  return record;
}

describe('capability states', () => {
  it('maps missing evidence to unknown, never to false support', () => {
    expect(capabilityFromExplicit(undefined)).toBe('unknown');
    expect(capabilityFromExplicit(true)).toBe('verified');
    expect(capabilityFromExplicit(false)).toBe('unsupported');
  });
});

describe('catalog upload validation', () => {
  it('accepts the synthetic fixture with fixture mode enabled', () => {
    const records = loadFixture();
    expect(records).toHaveLength(3);
    const result = validateCatalogUpload(records, { allowFixture: true });
    expect(result.ok).toBe(true);
  });

  it('bars fixtures from production publication', () => {
    const result = validateCatalogUpload(loadFixture(), { allowFixture: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('POLICY_DENIED');
  });

  it('rejects duplicate candidate IDs', () => {
    const record = first(loadFixture());
    const result = validateCatalogUpload([record, record], { allowFixture: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_REQUEST');
      expect(result.error.message).toContain('duplicate');
    }
  });

  it('rejects non-array uploads', () => {
    expect(validateCatalogUpload({} as never, { allowFixture: true }).ok).toBe(false);
  });
});

describe('synthetic fixture properties', () => {
  it('is unmistakably synthetic and covers two hosted families plus local', () => {
    const records = loadFixture();
    for (const record of records) {
      expect(record.fixture).toBe(true);
      expect(record.providerFamily.startsWith('synthetic-')).toBe(true);
      expect(validatorFor('candidateProfile')(record)).toBe(true);
    }
    const families = new Set(records.map((r) => r.providerFamily));
    expect(families.size).toBe(3);
    expect(records.filter((r) => r.endpoints.allowsLocal)).toHaveLength(1);
    expect(records.filter((r) => !r.endpoints.allowsLocal)).toHaveLength(2);
  });

  it('keeps unknown hard capabilities unknown', () => {
    const records = loadFixture();
    const alpha = records.find((r) => r.candidateId === 'cand_synthalpha01');
    expect(alpha?.modalities.image).toBe('unknown');
    expect(alpha?.modalities.audio).toBe('unsupported');
  });
});

describe('pricing units', () => {
  it('rejects binary-float and malformed rates at the schema boundary', () => {
    const validate = validatorFor('priceRate');
    expect(validate({ currency: 'USD', perMillionUnits: '12.50' })).toBe(true);
    expect(validate({ currency: 'USD', perMillionUnits: 12.5 })).toBe(false);
    expect(validate({ currency: 'US', perMillionUnits: '12.50' })).toBe(false);
  });

  it('rejects records whose pricing units are invalid', () => {
    const tampered = structuredClone(first(loadFixture())) as {
      prices: { input: { perMillionUnits: unknown } };
    };
    tampered.prices.input.perMillionUnits = 12.5;
    const result = validateCatalogUpload([tampered], { allowFixture: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_REQUEST');
  });
});

describe('conflict detection', () => {
  it('reports no conflicts for identical records', () => {
    const record = first(loadFixture());
    expect(detectConflicts(record, structuredClone(record))).toEqual([]);
  });

  it('lists differing hard capabilities, capacity, prices, and provenance', () => {
    const record = first(loadFixture());
    const altered = structuredClone(record);
    altered.modalities.image = 'verified';
    altered.capacity.safeInputTokens = 1;
    altered.prices.input.perMillionUnits = '99.99';
    const conflicts = detectConflicts(record, altered);
    expect(conflicts.some((c) => c.startsWith('modalities.image'))).toBe(true);
    expect(conflicts.some((c) => c.startsWith('capacity.safeInputTokens'))).toBe(true);
    expect(conflicts.some((c) => c.startsWith('prices.input'))).toBe(true);
  });

  it('flags cross-candidate comparison as a conflict', () => {
    const records = loadFixture();
    expect(detectConflicts(first(records), second(records)).length).toBeGreaterThan(0);
  });
});
