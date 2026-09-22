// T012 acceptance: admissions respect remaining caps; retries never reset
// funds; unknown outcomes retain conservative reservations; overruns blame
// provider uncertainty, never arithmetic.
import { describe, expect, it } from 'vitest';
import type { Money } from '@heimdall/contracts';
import {
  admitAttempt,
  createLedger,
  diagnoseOverrun,
  reconcileReservation,
  remainingHeadroom,
  supportsStrictCap,
  type BudgetLedger,
} from '../src/modules/invocation/public.js';

const USD = (amount: string): Money => ({ currency: 'USD', amount });

function ledger(cap = '100.00'): BudgetLedger {
  const created = createLedger(USD(cap));
  if (!created.ok) throw new Error('fixture ledger invalid');
  return created.value;
}

describe('budget ledger', () => {
  it('admits exact fits and rejects one nano over', () => {
    const admitted = admitAttempt(ledger('10.00'), USD('10.00'));
    expect(admitted.ok).toBe(true);

    const over = admitAttempt(ledger('10.00'), USD('10.000000001'));
    expect(over.ok).toBe(false);
    if (over.ok) return;
    expect(over.error.code).toBe('BUDGET_EXCEEDED');
  });

  it('includes classifier costs in the same reservation', () => {
    const result = admitAttempt(ledger('10.00'), USD('9.00'), USD('2.00'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('BUDGET_EXCEEDED');
  });

  it('never resets funds across retries', () => {
    let state = ledger('10.00');
    const first = admitAttempt(state, USD('6.00'));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    state = first.value;
    expect(remainingHeadroom(state)).toEqual(USD('4'));

    const second = admitAttempt(state, USD('6.00'));
    expect(second.ok).toBe(false);

    const settled = reconcileReservation(state, USD('6.00'), {
      certain: true,
      confirmed: USD('5.00'),
    });
    expect(settled.ok).toBe(true);
    if (!settled.ok) return;
    // 5 confirmed, 1 freed: headroom is 5, not a fresh 10.
    expect(remainingHeadroom(settled.value)).toEqual(USD('5'));
  });

  it('retains the full reservation on uncertain outcomes', () => {
    const admitted = admitAttempt(ledger('10.00'), USD('6.00'));
    expect(admitted.ok).toBe(true);
    if (!admitted.ok) return;
    const reconciled = reconcileReservation(admitted.value, USD('6.00'), { certain: false });
    expect(reconciled.ok).toBe(true);
    if (!reconciled.ok) return;
    expect(reconciled.value.uncertainTotal).toEqual(USD('6'));
    expect(reconciled.value.reservedActive).toEqual(USD('0'));
    expect(remainingHeadroom(reconciled.value)).toEqual(USD('4'));
  });

  it('rejects over-settlement as an accounting error', () => {
    const admitted = admitAttempt(ledger('10.00'), USD('6.00'));
    expect(admitted.ok).toBe(true);
    if (!admitted.ok) return;
    const over = reconcileReservation(admitted.value, USD('7.00'), {
      certain: true,
      confirmed: USD('7.00'),
    });
    expect(over.ok).toBe(false);
  });

  it('lets soft targets inform without gating', () => {
    const created = createLedger(USD('10.00'), USD('1.00'));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const admitted = admitAttempt(created.value, USD('9.00'));
    expect(admitted.ok).toBe(true);
  });

  it('distinguishes provider uncertainty from arithmetic bugs', () => {
    const admitted = admitAttempt(ledger('10.00'), USD('6.00'));
    expect(admitted.ok).toBe(true);
    if (!admitted.ok) return;
    const reconciled = reconcileReservation(admitted.value, USD('6.00'), { certain: false });
    expect(reconciled.ok).toBe(true);
    if (!reconciled.ok) return;
    // Forced overrun: uncertain spend observed past the cap stays honest.
    const overrun: BudgetLedger = {
      ...reconciled.value,
      uncertainTotal: USD('11.00'),
    };
    expect(diagnoseOverrun(overrun)).toBe('provider_uncertainty');
    expect(diagnoseOverrun(reconciled.value)).toBe('none');
    expect(diagnoseOverrun({ ...reconciled.value, confirmedTotal: USD('-1.00') })).toBe(
      'accounting_anomaly',
    );
  });

  it('refuses strict-cap mode without enforceable bounds', () => {
    expect(
      supportsStrictCap({
        maxInputTokens: 1000,
        maxOutputTokens: 500,
        ratesKnown: true,
        providerEnforcedOutputLimit: true,
        maxRequests: 5,
      }).supported,
    ).toBe(true);
    expect(
      supportsStrictCap({
        ratesKnown: true,
        providerEnforcedOutputLimit: true,
        maxRequests: 5,
      }).supported,
    ).toBe(false);
    expect(
      supportsStrictCap({
        maxInputTokens: 1000,
        maxOutputTokens: 500,
        ratesKnown: false,
        providerEnforcedOutputLimit: true,
        maxRequests: 5,
      }).supported,
    ).toBe(false);
  });
});

describe('budget properties', () => {
  const nanosOf2dp = (amount: string): bigint => {
    const [int = '0', frac = ''] = amount.split('.');
    return BigInt(int) * 1_000_000_000n + BigInt((frac + '00').slice(0, 2)) * 10_000_000n;
  };

  it('never admits above remaining headroom across random sequences', () => {
    let seed = 48857;
    const rand = (): number => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let iter = 0; iter < 200; iter += 1) {
      let state = ledger('100.00');
      let settled = 0;
      for (let step = 0; step < 6; step += 1) {
        const bound = USD((Math.floor(rand() * 6000) / 100).toFixed(2));
        const room = remainingHeadroom(state);
        if (!room) throw new Error('unreachable');
        const roomNanos = nanosOf2dp(room.amount);
        const needNanos = nanosOf2dp(bound.amount);
        const admitted = admitAttempt(state, bound);
        if (needNanos <= roomNanos) {
          expect(admitted.ok, `iter ${iter} step ${step}`).toBe(true);
          if (!admitted.ok) return;
          state = admitted.value;
          if (rand() < 0.6) {
            const certain = rand() < 0.7;
            const reconciled = reconcileReservation(state, bound, {
              certain,
              ...(certain ? { confirmed: bound } : {}),
            });
            expect(reconciled.ok).toBe(true);
            if (!reconciled.ok) return;
            state = reconciled.value;
            settled += 1;
          }
        } else {
          expect(admitted.ok).toBe(false);
        }
      }
      expect(settled).toBeGreaterThanOrEqual(0);
    }
  });
});
