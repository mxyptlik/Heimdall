// T002 acceptance: valid fixtures round-trip; unknown/malformed/oversized
// fields, unsafe numbers, invalid currencies, and task-ID fields are rejected.
import { describe, expect, it } from 'vitest';
import { validationErrors, validatorFor } from '../src/validate.js';

const isValid = (def: string, data: unknown): boolean => validatorFor(def)(data);
const keywords = (def: string, data: unknown): string[] =>
  validationErrors(def, data).map((e) => e.keyword ?? '');

describe('identifiers', () => {
  it('accepts well-formed request/decision/attempt IDs', () => {
    expect(isValid('requestId', 'req_abc123XY-_9')).toBe(true);
    expect(isValid('decisionId', 'dec_abc123XY-_9')).toBe(true);
    expect(isValid('attemptId', 'att_abc123XY-_9')).toBe(true);
  });

  it('rejects malformed IDs and cross-prefix use', () => {
    expect(isValid('requestId', 'dec_abc123XY-_9')).toBe(false);
    expect(isValid('requestId', 'req_short')).toBe(false);
    expect(isValid('requestId', 'req_no spaces allowed!!')).toBe(false);
    expect(isValid('requestId', 42)).toBe(false);
  });

  it('rejects oversized IDs', () => {
    expect(isValid('requestId', `req_${'a'.repeat(97)}`)).toBe(false);
  });
});

describe('money', () => {
  it('round-trips exact decimal money', () => {
    const money = { currency: 'USD', amount: '12.345' };
    expect(isValid('money', money)).toBe(true);
    expect(isValid('money', JSON.parse(JSON.stringify(money)))).toBe(true);
  });

  it('rejects binary floats and bad precision', () => {
    expect(isValid('money', { currency: 'USD', amount: 0.3 })).toBe(false);
    expect(isValid('money', { currency: 'USD', amount: '12.3456789012' })).toBe(false);
    expect(isValid('money', { currency: 'USD', amount: '1234567890123456789.00' })).toBe(false);
    expect(isValid('money', { currency: 'USD', amount: '12.34.56' })).toBe(false);
  });

  it('rejects invalid currencies', () => {
    expect(isValid('money', { currency: 'US', amount: '1.00' })).toBe(false);
    expect(isValid('money', { currency: 'usd', amount: '1.00' })).toBe(false);
    expect(isValid('money', { currency: 'USDD', amount: '1.00' })).toBe(false);
  });

  it('rejects unknown properties on money', () => {
    expect(keywords('money', { currency: 'USD', amount: '1.00', taskId: 'x' })).toContain(
      'additionalProperties',
    );
  });
});

describe('token counts', () => {
  it('accepts zero and MAX_SAFE_INTEGER', () => {
    expect(isValid('tokenCount', 0)).toBe(true);
    expect(isValid('tokenCount', Number.MAX_SAFE_INTEGER)).toBe(true);
  });

  it('rejects unsafe, negative, and fractional counts', () => {
    expect(isValid('tokenCount', 2 ** 53)).toBe(false);
    expect(isValid('tokenCount', -1)).toBe(false);
    expect(isValid('tokenCount', 1.5)).toBe(false);
  });
});

describe('timestamps and durations', () => {
  it('accepts RFC3339 timestamps', () => {
    expect(isValid('timestamp', '2026-09-22T00:00:00Z')).toBe(true);
    expect(isValid('timestamp', '2026-09-22T00:00:00.123456789+02:00')).toBe(true);
  });

  it('rejects date-only and malformed timestamps', () => {
    expect(isValid('timestamp', '2026-09-22')).toBe(false);
    expect(isValid('timestamp', 'not-a-date')).toBe(false);
    expect(isValid('timestamp', '2026-13-99T99:99:99Z')).toBe(false);
  });

  it('rejects negative durations', () => {
    expect(isValid('durationMs', 0)).toBe(true);
    expect(isValid('durationMs', -1)).toBe(false);
  });
});

describe('task-ID exclusion', () => {
  it.each(['taskId', 'task_id', 'taskID'])('rejects %s on strict objects', (field) => {
    expect(
      isValid('heimdallError', {
        code: 'CANCELLED',
        message: 'm',
        retryable: false,
        [field]: 't1',
      }),
    ).toBe(false);
    expect(isValid('textBlock', { type: 'text', text: 'hi', [field]: 't1' })).toBe(false);
  });
});

describe('extensions', () => {
  it('accepts an empty extensions object but rejects unknown keys', () => {
    expect(
      isValid('heimdallError', {
        code: 'CANCELLED',
        message: 'm',
        retryable: false,
        extensions: {},
      }),
    ).toBe(true);
    expect(
      isValid('heimdallError', {
        code: 'CANCELLED',
        message: 'm',
        retryable: false,
        extensions: { future: 1 },
      }),
    ).toBe(false);
  });
});
