// T002 acceptance: the typed error vocabulary is complete (catalog covers the
// schema enum exactly) and envelopes validate strictly.
import { describe, expect, it } from 'vitest';
import { ERROR_CATALOG, defaultRetryable, makeError } from '../src/errors.js';
import { ROOT_SCHEMA } from '../src/generated/root-schema.js';
import { validationErrors, validatorFor } from '../src/validate.js';

const isValid = (data: unknown): boolean => validatorFor('heimdallError')(data);

describe('error catalog', () => {
  it('covers the schema error-code enum exactly once', () => {
    const schemaCodes = (ROOT_SCHEMA.$defs?.errorCode as { enum: string[] }).enum;
    expect(Object.keys(ERROR_CATALOG).sort()).toEqual([...schemaCodes].sort());
  });

  it('encodes retryability defaults', () => {
    expect(defaultRetryable('PROVIDER_UNAVAILABLE')).toBe(true);
    expect(defaultRetryable('STREAM_INTERRUPTED')).toBe(true);
    expect(defaultRetryable('BUDGET_EXCEEDED')).toBe(false);
    expect(defaultRetryable('POLICY_DENIED')).toBe(false);
  });
});

describe('error envelope', () => {
  it('round-trips a catalog-built envelope', () => {
    const err = makeError('BUDGET_EXCEEDED', 'hard cap reached', { certainty: 'started' });
    expect(isValid(err)).toBe(true);
    expect(isValid(JSON.parse(JSON.stringify(err)))).toBe(true);
    expect(err.retryable).toBe(false);
  });

  it('rejects unknown codes, missing fields, and bad certainty', () => {
    expect(isValid({ code: 'MADE_UP', message: 'm', retryable: false })).toBe(false);
    expect(isValid({ code: 'CANCELLED', retryable: false })).toBe(false);
    expect(isValid({ code: 'CANCELLED', message: 'm', retryable: false, certainty: 'maybe' })).toBe(
      false,
    );
    expect(isValid({ code: 'CANCELLED', message: 'm', retryable: 'no' })).toBe(false);
  });

  it('rejects oversized messages', () => {
    expect(isValid({ code: 'CANCELLED', message: 'x'.repeat(1025), retryable: false })).toBe(false);
  });

  it('surfaces machine-readable keywords for malformed input', () => {
    const keywords = validationErrors('heimdallError', { code: 42 }).map((e) => e.keyword ?? '');
    expect(keywords.length).toBeGreaterThan(0);
  });
});
