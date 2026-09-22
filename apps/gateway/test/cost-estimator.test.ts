// T011 acceptance: exact hand-calculated fixtures across unit scales;
// reasoning never double-counted; failed spend included; missing prices
// never rank as zero; cache assumptions never shrink reservations.
import { describe, expect, it } from 'vitest';
import type { Money, PriceSchedule } from '@heimdall/contracts';
import {
  CONSERVATIVE_ESTIMATOR,
  expectedCallCost,
  expectedSequenceCost,
  nanosToDecimalString,
  upperBoundCallCost,
  type CallUsageTokens,
} from '../src/modules/selection/public.js';

function usdSchedule(): PriceSchedule {
  return {
    effectiveAt: '2026-09-22T00:00:00Z',
    input: { currency: 'USD', perMillionUnits: '12.50' },
    cachedInput: { currency: 'USD', perMillionUnits: '6.25' },
    output: { currency: 'USD', perMillionUnits: '50.00' },
  };
}

function usage(partial: Partial<CallUsageTokens> = {}): CallUsageTokens {
  return {
    uncachedInputTokens: 1000,
    cachedInputTokens: 500,
    outputTokens: 2000,
    reasoningTokens: 0,
    reasoningBilledSeparately: false,
    requestCount: 0,
    ...partial,
  };
}

describe('upper-bound admission', () => {
  it('matches hand calculation across components', () => {
    // input (1000+500) * 12.50/1e6 = 0.01875; output 2000 * 50/1e6 = 0.1
    const bound = upperBoundCallCost(usdSchedule(), usage());
    expect(bound).toEqual({ currency: 'USD', amount: '0.11875' });
  });

  it('prices cached input at the uncached rate without proof of reuse', () => {
    const bound = upperBoundCallCost(usdSchedule(), usage({ cachedInputTokens: 1000000 }));
    // (1000 + 1000000) * 12.50/1e6 = 12.5125, plus 0.1 output
    expect(bound).toEqual({ currency: 'USD', amount: '12.6125' });
  });

  it('handles zero-decimal-scale currencies across unit scales', () => {
    const jpy: PriceSchedule = {
      effectiveAt: '2026-09-22T00:00:00Z',
      input: { currency: 'JPY', perMillionUnits: '1500.00' },
      output: { currency: 'JPY', perMillionUnits: '6000.00' },
    };
    expect(
      upperBoundCallCost(
        jpy,
        usage({ uncachedInputTokens: 1000000, cachedInputTokens: 0, outputTokens: 0 }),
      ),
    ).toEqual({
      currency: 'JPY',
      amount: '1500',
    });
  });

  it('bills reasoning separately only when declared separately', () => {
    const withRate: PriceSchedule = {
      ...usdSchedule(),
      reasoning: { currency: 'USD', perMillionUnits: '25.00' },
    };
    // 500 * 25/1e6 = 0.0125 on top of 0.11875
    expect(
      upperBoundCallCost(
        withRate,
        usage({ reasoningTokens: 500, reasoningBilledSeparately: true }),
      ),
    ).toEqual({ currency: 'USD', amount: '0.13125' });
    expect(
      upperBoundCallCost(
        withRate,
        usage({ reasoningTokens: 500, reasoningBilledSeparately: false }),
      ),
    ).toEqual({ currency: 'USD', amount: '0.11875' });
  });

  it('returns undefined instead of zero for missing prices', () => {
    expect(
      upperBoundCallCost(
        usdSchedule(),
        usage({ reasoningTokens: 10, reasoningBilledSeparately: true }),
      ),
    ).toBeUndefined();
    expect(upperBoundCallCost(usdSchedule(), usage({ requestCount: 3 }))).toBeUndefined();
    const mixed: PriceSchedule = {
      ...usdSchedule(),
      output: { currency: 'EUR', perMillionUnits: '50.00' },
    };
    expect(upperBoundCallCost(mixed, usage())).toBeUndefined();
  });
});

describe('expected costs', () => {
  it('blends cache hit and miss legs from measured probability', () => {
    // cached 500 @ 6.25/M on hit, @ 12.50/M on miss, p = 0.5:
    // miss leg 500*12.50/1e6 = 0.00625 -> 6250000n; hit leg 500*6.25/1e6 = 0.003125 -> 3125000n
    // blended (6250000 + 3125000)/2 = 4687500n = 0.0046875
    // uncached 1000*12.50/1e6 = 0.0125; output 0.1; total 0.1171875
    const expected = expectedCallCost(usdSchedule(), {
      expectedUncachedInputTokens: 1000,
      expectedCachedInputTokens: 500,
      cacheHitProbability: '0.5',
      expectedOutputTokens: 2000,
      expectedReasoningTokens: 0,
      reasoningBilledSeparately: false,
      expectedRequests: 0,
    });
    expect(expected).toEqual({ currency: 'USD', amount: '0.1171875' });
  });

  it('rejects unmeasured or out-of-range probabilities', () => {
    const base = {
      expectedUncachedInputTokens: 1000,
      expectedCachedInputTokens: 500,
      cacheHitProbability: '0.5',
      expectedOutputTokens: 2000,
      expectedReasoningTokens: 0,
      reasoningBilledSeparately: false,
      expectedRequests: 0,
    };
    expect(expectedCallCost(usdSchedule(), { ...base, cacheHitProbability: '2' })).toBeUndefined();
    expect(
      expectedCallCost(usdSchedule(), { ...base, cacheHitProbability: 'maybe' }),
    ).toBeUndefined();
  });

  it('includes failed-attempt spend across retry sequences', () => {
    // C1 = 0.10, C2 = 0.20 with reach probability 0.5 -> 0.20 total
    const c1: Money = { currency: 'USD', amount: '0.10' };
    const c2: Money = { currency: 'USD', amount: '0.20' };
    expect(expectedSequenceCost([c1, c2], ['0.5'])).toEqual({ currency: 'USD', amount: '0.2' });
    // Single-call sequences normalize representation without changing value.
    expect(expectedSequenceCost([c1], [])).toEqual({ currency: 'USD', amount: '0.1' });
    expect(expectedSequenceCost([], [])).toBeUndefined();
    expect(expectedSequenceCost([c1, c2], [])).toBeUndefined();
    expect(expectedSequenceCost([c1, c2], ['2'])).toBeUndefined();
    expect(
      expectedSequenceCost([c1, { currency: 'EUR', amount: '0.20' }], ['0.5']),
    ).toBeUndefined();
  });
});

describe('estimator bounds', () => {
  it('never lets expected costs exceed the admission bound', () => {
    const bound = upperBoundCallCost(usdSchedule(), usage());
    const expected = expectedCallCost(usdSchedule(), {
      expectedUncachedInputTokens: 1000,
      expectedCachedInputTokens: 500,
      cacheHitProbability: '0.9',
      expectedOutputTokens: 2000,
      expectedReasoningTokens: 0,
      reasoningBilledSeparately: false,
      expectedRequests: 0,
    });
    expect(bound).toBeDefined();
    expect(expected).toBeDefined();
    if (!bound || !expected) throw new Error('unreachable');
    expect(Number(expected.amount) <= Number(bound.amount)).toBe(true);
  });

  it('sums upper bounds in the conservative estimator', () => {
    const total = CONSERVATIVE_ESTIMATOR.estimateRemainingUpperBound([
      { prices: usdSchedule(), usage: usage() },
      { prices: usdSchedule(), usage: usage() },
    ]);
    // 0.11875 * 2 = 0.2375
    expect(total).toEqual({ currency: 'USD', amount: '0.2375' });
    expect(CONSERVATIVE_ESTIMATOR.version).toBe('conservative-v1');
    expect(CONSERVATIVE_ESTIMATOR.estimateRemainingUpperBound([])).toBeUndefined();
  });
});

describe('nanos formatting', () => {
  it('renders exact decimals without float artifacts', () => {
    expect(nanosToDecimalString(118750000n)).toBe('0.11875');
    expect(nanosToDecimalString(1500000000000n)).toBe('1500');
    expect(nanosToDecimalString(-500000000n)).toBe('-0.5');
    expect(nanosToDecimalString(0n)).toBe('0');
  });
});
