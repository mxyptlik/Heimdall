// Deterministic eligibility engine (T010). Hard filters only: authorization,
// verified modalities, exact context fit, verified tool/schema support,
// endpoint overlap, effective prices, fresh evidence, and measurement-backed
// reliability/latency floors. Every rejection is recorded; survivors are
// unordered (ranking is T015). Missing quality/reliability/latency evidence
// rejects explicitly — sparse evidence never masquerades as proven quality.
// Numeric regression-vs-baseline comparison belongs to T015; risk tiers are
// carried by policy but applied during ranking, not here.
import {
  compareDecimals,
  type CandidateProfile,
  type ContentBlock,
  type Modality,
  type PolicyRule,
  type RouteRequest,
} from '@heimdall/contracts';

export const REJECTION_CODES = [
  'not_allowlisted',
  'explicitly_denied',
  'modality_not_verified',
  'context_exceeds_safe_capacity',
  'tool_calling_not_verified',
  'structured_output_not_verified',
  'endpoint_not_permitted',
  'price_not_effective',
  'evidence_stale',
  'insufficient_evidence',
  'reliability_below_floor',
  'latency_above_limit',
] as const;

export type RejectionCode = (typeof REJECTION_CODES)[number];

export interface EligibilityVerdict {
  readonly candidateId: string;
  readonly eligible: boolean;
  readonly rejections: RejectionCode[];
}

/** Exact token inputs from the caller's estimator. No global tokenizer is assumed. */
export interface TokenNeeds {
  /** Ordinary request tokens excluding selected tool definitions. */
  readonly inputTokens: number;
  /** Exact selected tool-definition tokens, including essential tools. */
  readonly toolSchemaTokens: number;
  /** Required output tokens excluding the candidate output reserve. */
  readonly requiredOutputTokens: number;
}

export interface CandidateMeasurements {
  readonly qualityLowerBound?: string;
  readonly successRate?: string;
  readonly p99Ms?: number;
}

export interface EligibilityInputs {
  readonly request: RouteRequest;
  readonly candidates: CandidateProfile[];
  readonly policy: PolicyRule;
  readonly tokenNeeds: TokenNeeds;
  readonly measurements: Partial<Record<string, CandidateMeasurements>>;
  readonly nowMs: number;
}

type LeafModality = Exclude<Modality, 'mixed'>;

function leafModalities(block: ContentBlock, out: LeafModality[] = []): LeafModality[] {
  if (block.type === 'mixed') {
    for (const part of block.parts) leafModalities(part, out);
  } else {
    out.push(block.type);
  }
  return out;
}

/** Hard modality requirements: leaf block types across all messages. */
export function requiredModalities(request: RouteRequest): LeafModality[] {
  const required = new Set<LeafModality>();
  for (const message of request.messages) {
    for (const block of message.content) {
      for (const modality of leafModalities(block)) required.add(modality);
    }
  }
  return [...required];
}

function overlaps(a: readonly string[], b: readonly string[]): boolean {
  return a.some((v) => b.includes(v));
}

function verdictFor(
  candidate: CandidateProfile,
  inputs: EligibilityInputs,
  required: LeafModality[],
): EligibilityVerdict {
  const rejections: RejectionCode[] = [];
  const { policy, tokenNeeds, measurements, nowMs, request } = inputs;

  if (policy.allowlist.length > 0 && !policy.allowlist.includes(candidate.candidateId)) {
    rejections.push('not_allowlisted');
  }
  if ((policy.deniedCandidates ?? []).includes(candidate.candidateId)) {
    rejections.push('explicitly_denied');
  }
  for (const modality of required) {
    if (candidate.modalities[modality] !== 'verified') {
      rejections.push('modality_not_verified');
      break;
    }
  }
  if (
    tokenNeeds.inputTokens + tokenNeeds.toolSchemaTokens > candidate.capacity.safeInputTokens ||
    tokenNeeds.requiredOutputTokens + candidate.capacity.outputReserveTokens >
      candidate.capacity.safeOutputTokens
  ) {
    rejections.push('context_exceeds_safe_capacity');
  }
  if (
    request.toolSelection?.enabled === true &&
    candidate.tools.genericToolCalling !== 'verified'
  ) {
    rejections.push('tool_calling_not_verified');
  }
  if (request.outputSchema !== undefined && candidate.tools.structuredOutput !== 'verified') {
    rejections.push('structured_output_not_verified');
  }
  if (
    !overlaps(policy.egress.regions, candidate.endpoints.regions) ||
    !overlaps(policy.egress.providers, candidate.endpoints.providers)
  ) {
    rejections.push('endpoint_not_permitted');
  }
  if (
    Number.isNaN(Date.parse(candidate.prices.effectiveAt)) ||
    Date.parse(candidate.prices.effectiveAt) > nowMs
  ) {
    rejections.push('price_not_effective');
  }
  const hasLiveEvidence = candidate.evidence.some(
    (record) => record.expiresAt === undefined || Date.parse(record.expiresAt) > nowMs,
  );
  if (!hasLiveEvidence) rejections.push('evidence_stale');

  const measured = measurements[candidate.candidateId];
  if (measured?.qualityLowerBound === undefined) {
    rejections.push('insufficient_evidence');
  }
  if (measured?.successRate === undefined) {
    rejections.push('insufficient_evidence');
  } else {
    const comparison = compareDecimals(measured.successRate, policy.reliability.minSuccessRate);
    if (comparison === undefined) {
      rejections.push('insufficient_evidence');
    } else if (comparison === -1) {
      rejections.push('reliability_below_floor');
    }
  }
  if (measured?.p99Ms === undefined) {
    rejections.push('insufficient_evidence');
  } else if (measured.p99Ms > policy.latency.maxP99Ms) {
    rejections.push('latency_above_limit');
  }

  return { candidateId: candidate.candidateId, eligible: rejections.length === 0, rejections };
}

/**
 * Filter candidates through every hard gate, recording each rejection.
 * Deterministic: identical inputs yield identical verdicts in input order.
 */
export function filterEligible(inputs: EligibilityInputs): EligibilityVerdict[] {
  const required = requiredModalities(inputs.request);
  return inputs.candidates.map((candidate) => verdictFor(candidate, inputs, required));
}
