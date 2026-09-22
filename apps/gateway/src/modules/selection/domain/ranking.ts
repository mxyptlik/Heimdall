// Deterministic candidate ranking and reason trace (T015). Consumes hard
// eligibility verdicts (T010): ineligible candidates never rank, however
// cheap. Survivors need sufficient evidence or the configured eligible
// baseline; sparse evidence never masquerades as proven quality. Among
// survivors the lowest expected total cost wins, with retention breaking ties
// and a meaningful-savings bar for mid-task switches (context-transfer and
// lost-cache costs are real). Compound requests use the best conservative
// evidence, then cost. Fixed inputs and snapshots yield identical rankings:
// the comparator is a total order ending in stable candidate ID.
import {
  makeError,
  parseDecimalToNanos,
  type CandidateId,
  type HeimdallError,
  type ModelPin,
  type Money,
} from '@heimdall/contracts';
import type { EligibilityVerdict, RejectionCode } from './eligibility.js';

export interface RankCosts {
  /** Expected total cost per candidate. Absent means unpriceable: never cheapest. */
  readonly expectedCost?: Money;
  /** Conservative quality evidence per candidate for compound choice. */
  readonly qualityLowerBound?: string;
  /** Reliability evidence for tie-breaks. */
  readonly successRate?: string;
}

export interface RankInputs {
  readonly verdicts: EligibilityVerdict[];
  readonly costs: Partial<Record<string, RankCosts>>;
  /** Retained candidate and whether continuity kept it. From the T013 decision. */
  readonly retainedCandidate?: CandidateId;
  readonly retentionHolds: boolean;
  readonly pin?: ModelPin;
  readonly compound: boolean;
  /** Configured eligible baseline for sparse evidence. Must itself be eligible. */
  readonly baseline?: CandidateId;
  /** Minimum savings that justify a mid-task switch away from retention. */
  readonly minSavingsToSwitch: Money;
}

export interface RankedCandidate {
  readonly candidateId: CandidateId;
  readonly expectedCost?: Money;
}

export interface RankingTrace {
  readonly selected: CandidateId | null;
  readonly retained: boolean;
  readonly baselineUsed: boolean;
  readonly compared: { candidateId: CandidateId; expectedCost?: Money }[];
  readonly rejected: { candidateId: CandidateId; rejections: RejectionCode[] }[];
  readonly failure?: HeimdallError;
}

export type RankingResult =
  | {
      readonly ok: true;
      readonly primary: CandidateId;
      readonly fallbacks: CandidateId[];
      readonly trace: RankingTrace;
    }
  | { readonly ok: false; readonly error: HeimdallError; readonly trace: RankingTrace };

function costEntry(
  candidateId: CandidateId,
  costs: Partial<Record<string, RankCosts>>,
): RankedCandidate {
  const expectedCost = costs[candidateId]?.expectedCost;
  return expectedCost === undefined ? { candidateId } : { candidateId, expectedCost };
}

function costNanos(cost: Money | undefined): bigint | undefined {
  if (!cost) return undefined;
  return parseDecimalToNanos(cost.amount);
}

function reliabilityNanos(rate: string | undefined): bigint | undefined {
  if (rate === undefined) return undefined;
  return parseDecimalToNanos(rate);
}

/** Total order: priced first, then cost, retained on ties, reliability, stable ID. */
function compareRanked(
  a: RankedCandidate,
  b: RankedCandidate,
  costs: Partial<Record<string, RankCosts>>,
  retained: CandidateId | undefined,
): number {
  const costA = costNanos(a.expectedCost);
  const costB = costNanos(b.expectedCost);
  if (costA !== undefined && costB === undefined) return -1;
  if (costA === undefined && costB !== undefined) return 1;
  if (costA !== undefined && costB !== undefined && costA !== costB) {
    return costA < costB ? -1 : 1;
  }
  if (retained !== undefined) {
    if (a.candidateId === retained && b.candidateId !== retained) return -1;
    if (b.candidateId === retained && a.candidateId !== retained) return 1;
  }
  const relA = reliabilityNanos(costs[a.candidateId]?.successRate);
  const relB = reliabilityNanos(costs[b.candidateId]?.successRate);
  if (relA !== undefined && relB !== undefined && relA !== relB) {
    return relA > relB ? -1 : 1;
  }
  return a.candidateId < b.candidateId ? -1 : a.candidateId > b.candidateId ? 1 : 0;
}

function orderEligible(inputs: RankInputs, pool: EligibilityVerdict[]): RankedCandidate[] {
  const retained = inputs.retentionHolds ? inputs.retainedCandidate : undefined;
  return pool
    .map((v) => costEntry(v.candidateId as CandidateId, inputs.costs))
    .sort((a, b) => compareRanked(a, b, inputs.costs, retained));
}

function rejectedOf(
  inputs: RankInputs,
): { candidateId: CandidateId; rejections: RejectionCode[] }[] {
  return inputs.verdicts
    .filter((v) => !v.eligible)
    .map((v) => ({ candidateId: v.candidateId as CandidateId, rejections: v.rejections }));
}

function failureResult(
  inputs: RankInputs,
  code: 'NO_ELIGIBLE_MODEL' | 'INSUFFICIENT_EVIDENCE',
  message: string,
  compared: RankedCandidate[],
): RankingResult {
  const error = makeError(code, message);
  return {
    ok: false,
    error,
    trace: {
      selected: null,
      retained: false,
      baselineUsed: false,
      compared: compared.map((c) => ({ ...c })),
      rejected: rejectedOf(inputs),
      failure: error,
    },
  };
}

/**
 * Rank eligible candidates deterministically. Ineligible verdicts feed the
 * trace only. Returns an explicit failure when nothing is certifiable.
 */
export function rankCandidates(inputs: RankInputs): RankingResult {
  const rejected = rejectedOf(inputs);
  const eligible = inputs.verdicts.filter((v) => v.eligible);
  if (eligible.length === 0) {
    return failureResult(
      inputs,
      'NO_ELIGIBLE_MODEL',
      'no candidate satisfies the hard requirements',
      [],
    );
  }

  if (inputs.pin !== undefined) {
    const pinned = eligible.find((v) => v.candidateId === inputs.pin?.candidate);
    if (pinned) {
      return successResult(
        inputs,
        pinned.candidateId as CandidateId,
        orderEligible(inputs, eligible),
        rejected,
        false,
      );
    }
  }

  if (inputs.compound) {
    const best = bestConservativeEvidence(inputs, eligible);
    if (best) {
      return successResult(inputs, best, orderEligible(inputs, eligible), rejected, false);
    }
  }

  const certified = eligible.filter(
    (v) => inputs.costs[v.candidateId]?.qualityLowerBound !== undefined,
  );
  if (certified.length === 0) {
    const baseline =
      inputs.baseline !== undefined
        ? eligible.find((v) => v.candidateId === inputs.baseline)
        : undefined;
    if (baseline) {
      return successResult(
        inputs,
        baseline.candidateId as CandidateId,
        orderEligible(inputs, eligible),
        rejected,
        true,
      );
    }
    return failureResult(
      inputs,
      'INSUFFICIENT_EVIDENCE',
      'no candidate has sufficient evidence and no eligible baseline is configured',
      eligible.map((v) => costEntry(v.candidateId as CandidateId, inputs.costs)),
    );
  }

  const ordered = orderEligible(inputs, certified);
  const cheapest = ordered[0];
  if (!cheapest) {
    return failureResult(inputs, 'NO_ELIGIBLE_MODEL', 'ranking produced no primary', []);
  }
  return successResult(inputs, cheapest.candidateId, ordered, rejected, false);
}

/** Best conservative quality evidence, then lowest same-currency cost. */
function bestConservativeEvidence(
  inputs: RankInputs,
  eligible: EligibilityVerdict[],
): CandidateId | undefined {
  let best: CandidateId | undefined;
  let bestQ: bigint | undefined;
  let bestCost: { nanos: bigint; currency: string } | undefined;
  for (const candidate of eligible) {
    const id = candidate.candidateId as CandidateId;
    const qStr = inputs.costs[id]?.qualityLowerBound;
    if (qStr === undefined) continue;
    const q = parseDecimalToNanos(qStr);
    if (q === undefined) continue;
    const cost = inputs.costs[id]?.expectedCost;
    const costNanosValue = cost ? parseDecimalToNanos(cost.amount) : undefined;
    if (best === undefined || bestQ === undefined || q > bestQ) {
      best = id;
      bestQ = q;
      bestCost =
        cost && costNanosValue !== undefined
          ? { nanos: costNanosValue, currency: cost.currency }
          : undefined;
    } else if (
      q === bestQ &&
      cost &&
      costNanosValue !== undefined &&
      bestCost &&
      cost.currency === bestCost.currency &&
      costNanosValue < bestCost.nanos
    ) {
      best = id;
      bestCost = { nanos: costNanosValue, currency: cost.currency };
    }
  }
  return best;
}

function successResult(
  inputs: RankInputs,
  primaryId: CandidateId,
  ordered: RankedCandidate[],
  rejected: { candidateId: CandidateId; rejections: RejectionCode[] }[],
  baselineUsed: boolean,
): RankingResult {
  let primary = primaryId;
  let retained = inputs.retentionHolds && inputs.retainedCandidate === primaryId;
  // A mid-task switch needs proven meaningful savings; otherwise retention holds.
  if (
    inputs.retentionHolds &&
    inputs.retainedCandidate !== undefined &&
    inputs.retainedCandidate !== primaryId
  ) {
    const kept = ordered.find((c) => c.candidateId === inputs.retainedCandidate);
    const challenger = ordered.find((c) => c.candidateId === primaryId);
    let switchProven = false;
    if (
      kept?.expectedCost &&
      challenger?.expectedCost &&
      kept.expectedCost.currency === challenger.expectedCost.currency &&
      challenger.expectedCost.currency === inputs.minSavingsToSwitch.currency
    ) {
      const keptNanos = parseDecimalToNanos(kept.expectedCost.amount);
      const challengerNanos = parseDecimalToNanos(challenger.expectedCost.amount);
      const threshold = parseDecimalToNanos(inputs.minSavingsToSwitch.amount);
      switchProven =
        keptNanos !== undefined &&
        challengerNanos !== undefined &&
        threshold !== undefined &&
        challengerNanos < keptNanos &&
        keptNanos - challengerNanos >= threshold;
    }
    if (!switchProven && kept) {
      primary = kept.candidateId;
      retained = true;
    }
  }
  const fallbacks = ordered.map((c) => c.candidateId).filter((id) => id !== primary);
  return {
    ok: true,
    primary,
    fallbacks,
    trace: {
      selected: primary,
      retained,
      baselineUsed,
      compared: ordered.map((c) => ({ ...c })),
      rejected,
    },
  };
}
