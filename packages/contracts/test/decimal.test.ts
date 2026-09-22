// Exact decimal parsing and comparison. No binary floats touch billing math.
import { describe, expect, it } from 'vitest';
import { compareDecimals, nanosToDecimalString, parseDecimalToNanos } from '../src/decimal.js';

describe('exact decimals', () => {
  it('parses scaled nanos without float error', () => {
    expect(parseDecimalToNanos('0.1')).toBe(100_000_000n);
    expect(parseDecimalToNanos('12.50')).toBe(12_500_000_000n);
    expect(parseDecimalToNanos('-3')).toBe(-3_000_000_000n);
    expect(parseDecimalToNanos('1')).toBe(1_000_000_000n);
  });

  it('rejects malformed input without throwing', () => {
    expect(parseDecimalToNanos('12.34.56')).toBeUndefined();
    expect(parseDecimalToNanos('1.1234567890')).toBeUndefined();
    expect(parseDecimalToNanos('abc')).toBeUndefined();
    expect(parseDecimalToNanos('')).toBeUndefined();
  });

  it('compares across scales exactly', () => {
    expect(compareDecimals('0.10', '0.1')).toBe(0);
    expect(compareDecimals('0.05', '0.5')).toBe(-1);
    expect(compareDecimals('1.000000001', '1')).toBe(1);
    expect(compareDecimals('nope', '1')).toBeUndefined();
  });

  it('formats nanos without float artifacts', () => {
    expect(nanosToDecimalString(118750000n)).toBe('0.11875');
    expect(nanosToDecimalString(1500000000000n)).toBe('1500');
    expect(nanosToDecimalString(-500000000n)).toBe('-0.5');
    expect(nanosToDecimalString(0n)).toBe('0');
  });
});
