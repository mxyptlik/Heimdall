// Cost components and conservative estimator (T011). Exact money/token
// arithmetic in scaled integers; binary floats never touch billing math.
// Unknown values stay unknown: missing prices cannot rank as zero, and cache
// reuse without proof never reduces hard-cap reservations. Failed-attempt
// spend is included by construction. Task-level fitting belongs to T044;
// this module starts from invocation estimates plus a conservative estimator.
import {
  nanosToDecimalString,
  parseDecimalToNanos,
  type Money,
  type PriceSchedule,
} from '@heimdall/contracts';

/** Call token inputs with explicit billing treatment. No hidden cache assumptions. */
export interface CallUsageTokens {
  readonly uncachedInputTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
  readonly reasoningTokens: number;
  /** True only when the provider bills reasoning separately from output. Never guessed. */
  readonly reasoningBilledSeparately: boolean;
  readonly requestCount: number;
}

export interface CallCost {
  readonly currency: string;
  readonly inputCharge: Money;
  readonly cachedInputCharge: Money;
  readonly outputCharge: Money;
  readonly reasoningCharge: Money;
  readonly requestCharge: Money;
  readonly total: Money;
}

/** Exact charge for tokens at a per-million-unit rate, rounded to the nearest nano. */
function priceTokens(tokens: number, ratePerMillion: string): bigint | undefined {
  if (!Number.isInteger(tokens) || tokens < 0) return undefined;
  const nanos = parseDecimalToNanos(ratePerMillion);
  if (nanos === undefined) return undefined;
  const numerator = BigInt(tokens) * nanos;
  const quotient = numerator / 1_000_000n;
  const remainder = numerator % 1_000_000n;
  return remainder * 2n >= 1_000_000n ? quotient + 1n : quotient;
}

/** Integer division with half-up rounding for sub-nano expected fractions. */
function divRound(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return remainder * 2n >= denominator ? quotient + 1n : quotient;
}

function moneyOf(currency: string, nanos: bigint): Money {
  return { currency, amount: nanosToDecimalString(nanos) };
}

/** Shared currency across every rate the computation touches. Undefined on mismatch. */
function scheduleCurrency(prices: PriceSchedule): string | undefined {
  const currencies = new Set<string>();
  currencies.add(prices.input.currency);
  currencies.add(prices.output.currency);
  if (prices.cachedInput) currencies.add(prices.cachedInput.currency);
  if (prices.reasoning) currencies.add(prices.reasoning.currency);
  if (prices.request) currencies.add(prices.request.currency);
  if (currencies.size !== 1) return undefined;
  const [currency] = currencies;
  return currency;
}

/**
 * Conservative upper bound for admission and hard-cap reservation. Cached
 * input is priced at the uncached rate: reuse without proof never shrinks a
 * reservation. Undefined when any needed price is missing or inconsistent.
 */
export function upperBoundCallCost(
  prices: PriceSchedule,
  usage: CallUsageTokens,
): Money | undefined {
  const currency = scheduleCurrency(prices);
  if (currency === undefined) return undefined;
  const inputNanos = priceTokens(
    usage.uncachedInputTokens + usage.cachedInputTokens,
    prices.input.perMillionUnits,
  );
  const outputNanos = priceTokens(usage.outputTokens, prices.output.perMillionUnits);
  if (inputNanos === undefined || outputNanos === undefined) return undefined;

  let reasoningNanos = 0n;
  if (usage.reasoningTokens > 0) {
    if (!usage.reasoningBilledSeparately) {
      reasoningNanos = 0n;
    } else if (prices.reasoning) {
      const billed = priceTokens(usage.reasoningTokens, prices.reasoning.perMillionUnits);
      if (billed === undefined) return undefined;
      reasoningNanos = billed;
    } else {
      return undefined;
    }
  }

  let requestNanos = 0n;
  if (usage.requestCount > 0) {
    if (!Number.isInteger(usage.requestCount)) return undefined;
    if (!prices.request) return undefined;
    const billed = priceTokens(usage.requestCount, prices.request.perMillionUnits);
    if (billed === undefined) return undefined;
    requestNanos = billed;
  }

  return moneyOf(currency, inputNanos + outputNanos + reasoningNanos + requestNanos);
}

export interface ExpectedUsageTokens {
  readonly expectedUncachedInputTokens: number;
  readonly expectedCachedInputTokens: number;
  /** Measured cache-hit probability for the cached portion. Observed, never assumed. */
  readonly cacheHitProbability: string;
  readonly expectedOutputTokens: number;
  readonly expectedReasoningTokens: number;
  readonly reasoningBilledSeparately: boolean;
  readonly expectedRequests: number;
}

/**
 * Expected call cost for ranking. Uses a measured cache-hit probability for
 * the cached portion; the admission bound stays conservative regardless.
 */
export function expectedCallCost(
  prices: PriceSchedule,
  usage: ExpectedUsageTokens,
): Money | undefined {
  const currency = scheduleCurrency(prices);
  if (currency === undefined) return undefined;
  const hit = parseDecimalToNanos(usage.cacheHitProbability);
  if (hit === undefined || hit < 0n || hit > 1_000_000_000n) return undefined;

  const uncachedNanos = priceTokens(
    usage.expectedUncachedInputTokens,
    prices.input.perMillionUnits,
  );
  const cachedRate = prices.cachedInput ?? prices.input;
  const cachedFull = priceTokens(usage.expectedCachedInputTokens, cachedRate.perMillionUnits);
  const cachedMiss = priceTokens(usage.expectedCachedInputTokens, prices.input.perMillionUnits);
  const outputNanos = priceTokens(usage.expectedOutputTokens, prices.output.perMillionUnits);
  if (
    uncachedNanos === undefined ||
    cachedFull === undefined ||
    cachedMiss === undefined ||
    outputNanos === undefined
  ) {
    return undefined;
  }
  // Expected cached charge blends hit and miss legs with exact integer math.
  const cachedNanos = divRound(
    cachedFull * hit + cachedMiss * (1_000_000_000n - hit),
    1_000_000_000n,
  );

  let reasoningNanos = 0n;
  if (usage.expectedReasoningTokens > 0 && usage.reasoningBilledSeparately) {
    if (!prices.reasoning) return undefined;
    const billed = priceTokens(usage.expectedReasoningTokens, prices.reasoning.perMillionUnits);
    if (billed === undefined) return undefined;
    reasoningNanos = billed;
  }

  let requestNanos = 0n;
  if (usage.expectedRequests > 0) {
    if (!prices.request) return undefined;
    const billed = priceTokens(usage.expectedRequests, prices.request.perMillionUnits);
    if (billed === undefined) return undefined;
    requestNanos = billed;
  }

  return moneyOf(
    currency,
    uncachedNanos + cachedNanos + outputNanos + reasoningNanos + requestNanos,
  );
}

export interface CallCostBreakdown {
  readonly calls: Money[];
  readonly total: Money;
}

/**
 * Expected cost of a bounded attempt sequence: first call plus each retry
 * weighted by its reach probability. Probabilities come from observed
 * workload-conditioned failures, never classifier confidence. Failed spend
 * is included: every listed call contributes whether or not it succeeds.
 */
export function expectedSequenceCost(
  calls: Money[],
  reachProbabilities: string[],
): Money | undefined {
  if (calls.length === 0) return undefined;
  if (reachProbabilities.length !== calls.length - 1) return undefined;
  const [first, ...rest] = calls;
  if (first === undefined) return undefined;
  const currency = first.currency;
  let total = parseDecimalToNanos(first.amount);
  if (total === undefined) return undefined;
  for (let i = 0; i < rest.length; i += 1) {
    const call = rest[i];
    const reach = reachProbabilities[i];
    if (call === undefined || reach === undefined) return undefined;
    const probability = parseDecimalToNanos(reach);
    const amount = parseDecimalToNanos(call.amount);
    if (call.currency !== currency || probability === undefined || amount === undefined) {
      return undefined;
    }
    if (probability < 0n || probability > 1_000_000_000n) return undefined;
    total += divRound(amount * probability, 1_000_000_000n);
  }
  return moneyOf(currency, total);
}

/** Versioned estimator artifact for later task-level fitting (T044). */
export interface TaskCostEstimator {
  readonly version: string;
  estimateRemainingUpperBound(
    calls: { prices: PriceSchedule; usage: CallUsageTokens }[],
  ): Money | undefined;
}

/** Conservative estimator: sums admission upper bounds. Beats nothing yet; the fitted model must justify itself on held-out traces. */
export const CONSERVATIVE_ESTIMATOR: TaskCostEstimator = {
  version: 'conservative-v1',
  estimateRemainingUpperBound(calls) {
    if (calls.length === 0) return undefined;
    let currency: string | undefined;
    let total = 0n;
    for (const call of calls) {
      const bound = upperBoundCallCost(call.prices, call.usage);
      if (bound === undefined) return undefined;
      if (currency === undefined) currency = bound.currency;
      if (bound.currency !== currency) return undefined;
      const nanos = parseDecimalToNanos(bound.amount);
      if (nanos === undefined) return undefined;
      total += nanos;
    }
    if (currency === undefined) return undefined;
    return moneyOf(currency, total);
  },
};
