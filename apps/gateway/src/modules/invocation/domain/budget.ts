// Pure budget reservation state machine (T012). Tracks estimated, reserved,
// confirmed, and uncertain spend against a hard cap with soft targets kept
// informational. Cancellation or provider silence never erases possibly
// charged usage: uncertain outcomes retain the full reservation. Retries draw
// from the same pool; nothing grants a fresh allowance. Settlement for less
// than reserved frees the difference (legitimate accounting, not a reset).
// Durable claims, leases, and crash recovery belong to T023; this module is
// the transition logic it must obey.
import {
  makeError,
  nanosToDecimalString,
  parseDecimalToNanos,
  type HeimdallError,
  type Money,
} from '@heimdall/contracts';

export interface BudgetLedger {
  readonly hardCap: Money;
  readonly softTarget?: Money;
  /** Currently held unsettled reservations (fungible pool). */
  readonly reservedActive: Money;
  readonly confirmedTotal: Money;
  readonly uncertainTotal: Money;
}

export type BudgetResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: HeimdallError };

function fail<T>(code: 'INVALID_REQUEST' | 'BUDGET_EXCEEDED', message: string): BudgetResult<T> {
  return { ok: false, error: makeError(code, message) };
}

function zeroOf(currency: string): Money {
  return { currency, amount: '0' };
}

function checkCurrency(ledger: BudgetLedger, amount: Money): boolean {
  return amount.currency === ledger.hardCap.currency;
}

function nanosOf(amount: Money): bigint | undefined {
  return parseDecimalToNanos(amount.amount);
}

function add(a: Money, b: Money): Money | undefined {
  if (a.currency !== b.currency) return undefined;
  const na = nanosOf(a);
  const nb = nanosOf(b);
  if (na === undefined || nb === undefined) return undefined;
  return { currency: a.currency, amount: nanosToDecimalString(na + nb) };
}

function sub(a: Money, b: Money): Money | undefined {
  if (a.currency !== b.currency) return undefined;
  const na = nanosOf(a);
  const nb = nanosOf(b);
  if (na === undefined || nb === undefined || nb > na) return undefined;
  return { currency: a.currency, amount: nanosToDecimalString(na - nb) };
}

/** Create a ledger. Soft targets never gate admission. */
export function createLedger(hardCap: Money, softTarget?: Money): BudgetResult<BudgetLedger> {
  const capNanos = nanosOf(hardCap);
  if (capNanos === undefined || capNanos < 0n) {
    return fail('INVALID_REQUEST', 'hard cap must be a valid non-negative amount');
  }
  if (softTarget !== undefined) {
    if (softTarget.currency !== hardCap.currency || nanosOf(softTarget) === undefined) {
      return fail('INVALID_REQUEST', 'soft target must be a valid amount in cap currency');
    }
  }
  const currency = hardCap.currency;
  return {
    ok: true,
    value: {
      hardCap,
      ...(softTarget === undefined ? {} : { softTarget }),
      reservedActive: zeroOf(currency),
      confirmedTotal: zeroOf(currency),
      uncertainTotal: zeroOf(currency),
    },
  };
}

/** Spend counted against the cap across every category. */
export function accountedSpend(ledger: BudgetLedger): Money | undefined {
  const reserved = nanosOf(ledger.reservedActive);
  const confirmed = nanosOf(ledger.confirmedTotal);
  const uncertain = nanosOf(ledger.uncertainTotal);
  if (reserved === undefined || confirmed === undefined || uncertain === undefined)
    return undefined;
  return {
    currency: ledger.hardCap.currency,
    amount: nanosToDecimalString(reserved + confirmed + uncertain),
  };
}

/** Remaining admission headroom. Never negative on a healthy ledger. */
export function remainingHeadroom(ledger: BudgetLedger): Money | undefined {
  const spent = accountedSpend(ledger);
  const cap = nanosOf(ledger.hardCap);
  if (!spent || cap === undefined) return undefined;
  const spentNanos = nanosOf(spent);
  if (spentNanos === undefined || spentNanos > cap) return undefined;
  return { currency: spent.currency, amount: nanosToDecimalString(cap - spentNanos) };
}

/**
 * Admit one attempt (plus optional classifier cost) against remaining
 * headroom. Exact fits pass; one nano over fails. Retries call this again on
 * the same ledger: no fresh allowance is ever granted.
 */
export function admitAttempt(
  ledger: BudgetLedger,
  attemptUpperBound: Money,
  classifierCost?: Money,
): BudgetResult<BudgetLedger> {
  if (!checkCurrency(ledger, attemptUpperBound)) {
    return fail('INVALID_REQUEST', 'attempt bound must be in cap currency');
  }
  let total = attemptUpperBound;
  if (classifierCost !== undefined) {
    if (!checkCurrency(ledger, classifierCost)) {
      return fail('INVALID_REQUEST', 'classifier cost must be in cap currency');
    }
    const summed = add(total, classifierCost);
    if (!summed) return fail('INVALID_REQUEST', 'unparseable attempt amounts');
    total = summed;
  }
  const room = remainingHeadroom(ledger);
  const need = nanosOf(total);
  if (!room || need === undefined) return fail('INVALID_REQUEST', 'unparseable ledger amounts');
  const roomNanos = nanosOf(room);
  if (roomNanos === undefined || need > roomNanos) {
    return fail('BUDGET_EXCEEDED', 'attempt upper bound exceeds remaining hard cap');
  }
  const reserved = add(ledger.reservedActive, total);
  if (!reserved) return fail('INVALID_REQUEST', 'unparseable reservation total');
  return { ok: true, value: { ...ledger, reservedActive: reserved } };
}

export interface ReconcileOutcome {
  /** True when the provider reported a definitive billed amount. */
  readonly certain: boolean;
  readonly confirmed?: Money;
}

/**
 * Settle a held reservation. Certain outcomes move the confirmed amount to
 * confirmed spend and free any held remainder. Uncertain outcomes (abort,
 * silence, crash windows) move the FULL held amount to uncertain spend:
 * a lost connection never proves zero cost.
 */
export function reconcileReservation(
  ledger: BudgetLedger,
  heldAmount: Money,
  outcome: ReconcileOutcome,
): BudgetResult<BudgetLedger> {
  if (!checkCurrency(ledger, heldAmount)) {
    return fail('INVALID_REQUEST', 'settlement must be in cap currency');
  }
  const held = nanosOf(heldAmount);
  const active = nanosOf(ledger.reservedActive);
  if (held === undefined || active === undefined || held > active) {
    return fail('INVALID_REQUEST', 'cannot settle more than the active reservation');
  }
  if (outcome.certain) {
    if (!outcome.confirmed || !checkCurrency(ledger, outcome.confirmed)) {
      return fail('INVALID_REQUEST', 'certain outcomes need a confirmed amount in cap currency');
    }
    const confirmed = nanosOf(outcome.confirmed);
    if (confirmed === undefined || confirmed > held) {
      return fail('INVALID_REQUEST', 'confirmed amount exceeds the held reservation');
    }
    const reservedActive = sub(ledger.reservedActive, heldAmount);
    const confirmedTotal = add(ledger.confirmedTotal, outcome.confirmed);
    if (!reservedActive || !confirmedTotal)
      return fail('INVALID_REQUEST', 'unparseable settlement');
    return { ok: true, value: { ...ledger, reservedActive, confirmedTotal } };
  }
  const reservedActive = sub(ledger.reservedActive, heldAmount);
  const uncertainTotal = add(ledger.uncertainTotal, heldAmount);
  if (!reservedActive || !uncertainTotal) return fail('INVALID_REQUEST', 'unparseable settlement');
  return { ok: true, value: { ...ledger, reservedActive, uncertainTotal } };
}

export type OverrunCause = 'provider_uncertainty' | 'accounting_anomaly' | 'none';

/**
 * Diagnose cap overrun. Honest provider-side overrun (uncertain spend pushed
 * the observed total past the cap despite correct admission arithmetic)
 * reports provider_uncertainty. Anything else inconsistent is an
 * accounting_anomaly: an arithmetic bug, never a billing fact.
 */
export function diagnoseOverrun(ledger: BudgetLedger): OverrunCause {
  const cap = nanosOf(ledger.hardCap);
  const spent = accountedSpend(ledger);
  const uncertain = nanosOf(ledger.uncertainTotal);
  const reserved = nanosOf(ledger.reservedActive);
  const confirmed = nanosOf(ledger.confirmedTotal);
  if (
    cap === undefined ||
    spent === undefined ||
    uncertain === undefined ||
    reserved === undefined ||
    confirmed === undefined
  ) {
    return 'accounting_anomaly';
  }
  if (reserved < 0n || confirmed < 0n || uncertain < 0n) return 'accounting_anomaly';
  const spentNanos = reserved + confirmed + uncertain;
  if (spentNanos <= cap) return 'none';
  return uncertain > 0n ? 'provider_uncertainty' : 'accounting_anomaly';
}

/**
 * Strict-cap support check. Exact-dollar stopping is refused unless every
 * charge category has an enforceable bound: bounded token counts, known
 * rates, a provider-enforced output limit, and a bounded request count.
 */
export interface StrictCapBounds {
  readonly maxInputTokens?: number;
  readonly maxOutputTokens?: number;
  readonly ratesKnown: boolean;
  readonly providerEnforcedOutputLimit: boolean;
  readonly maxRequests?: number;
}

export function supportsStrictCap(bounds: StrictCapBounds): { supported: boolean; reason: string } {
  if (bounds.maxInputTokens === undefined) {
    return { supported: false, reason: 'no defensible maximum input without a token bound' };
  }
  if (bounds.maxOutputTokens === undefined || !bounds.providerEnforcedOutputLimit) {
    return {
      supported: false,
      reason: 'no defensible maximum output without a provider-enforced limit',
    };
  }
  if (!bounds.ratesKnown) {
    return { supported: false, reason: 'unknown prices cannot support an exact guarantee' };
  }
  if (bounds.maxRequests === undefined) {
    return {
      supported: false,
      reason: 'unbounded request charges cannot support an exact guarantee',
    };
  }
  return { supported: true, reason: 'all charge categories bounded with known rates' };
}
