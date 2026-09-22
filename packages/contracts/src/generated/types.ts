/* Generated from src/schemas/heimdall.v1.json — do not edit. */
export const CONTRACT_SCHEMA_ID = 'https://heimdall/schemas/contracts/v1' as const;
export const CONTRACT_SCHEMA_VERSION = '1' as const;

/**
 * Opaque gateway request identifier. No task-ID fields exist in V1; taskId/task_id/taskID are rejected as unknown properties.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "requestId".
 */
export type RequestId = string;
/**
 * Identifier for one routing decision, not a task.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "decisionId".
 */
export type DecisionId = string;
/**
 * Identifier for one model invocation attempt within a decision.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "attemptId".
 */
export type AttemptId = string;
/**
 * Three-letter uppercase currency code (ISO-4217-shaped). A full allowlist is deferred to real price ingestion (T032).
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "currency".
 */
export type Currency = string;
/**
 * Exact decimal money string. Binary floats are never used for billing arithmetic.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "decimalAmount".
 */
export type DecimalAmount = string;
/**
 * Non-negative exact token count. Values above Number.MAX_SAFE_INTEGER are rejected as unsafe.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "tokenCount".
 */
export type TokenCount = number;
/**
 * RFC3339 date-time string with bounded length. The pattern checks field ranges (month, day, hour, minute, second, offset); impossible calendar dates such as February 30 pass the shape check and are a consumer concern.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "timestamp".
 */
export type Timestamp = string;
/**
 * Non-negative duration in whole milliseconds.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "durationMs".
 */
export type DurationMs = number;
/**
 * Required caller application profile. Coding agents retain models per task; chat and RAG route per invocation.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "applicationProfile".
 */
export type ApplicationProfile = 'coding-agent' | 'chat' | 'rag';
/**
 * All V1-declared modalities. Presence in the contract is not proof of runtime support; adapters advertise verified support only.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "modality".
 */
export type Modality = 'text' | 'image' | 'audio' | 'video' | 'file' | 'mixed';
/**
 * How certain Heimdall is that a billable provider call executed. A lost connection never proves zero cost.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "executionCertainty".
 */
export type ExecutionCertainty = 'not_started' | 'possibly_started' | 'started' | 'completed';
/**
 * Typed gateway error vocabulary. Unknown codes fail validation by design; consumers handle them by upgrading, not guessing.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "errorCode".
 */
export type ErrorCode =
  | 'INVALID_REQUEST'
  | 'POLICY_DENIED'
  | 'UNSUPPORTED_OPTION'
  | 'NO_ELIGIBLE_MODEL'
  | 'INSUFFICIENT_EVIDENCE'
  | 'ESSENTIAL_TOOLS_DO_NOT_FIT'
  | 'CLASSIFIER_UNAVAILABLE'
  | 'CATALOG_STALE'
  | 'CONTEXT_OVERFLOW'
  | 'BUDGET_EXCEEDED'
  | 'DEADLINE_EXCEEDED'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_PROTOCOL_ERROR'
  | 'STREAM_INTERRUPTED'
  | 'STALE_PREPARED_ROUTE'
  | 'IDEMPOTENCY_CONFLICT'
  | 'CANCELLED';
/**
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "mimeType".
 */
export type MimeType = string;
/**
 * Any single content block across all declared modalities.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "contentBlock".
 */
export type ContentBlock =
  | TextBlock
  | ImageBlock
  | AudioBlock
  | VideoBlock
  | FileBlock
  | MixedBlock;
/**
 * Hard capability evidence status. Unknown is first-class and never treated as verified support or as false.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "capabilityState".
 */
export type CapabilityState = 'unknown' | 'verified' | 'unsupported';
/**
 * Provenance class of a profile claim. Fixture evidence is synthetic and barred from production.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "evidenceKind".
 */
export type EvidenceKind = 'declared' | 'measured' | 'fixture';
/**
 * Opaque model-candidate identifier (provider, model/version, and material configuration).
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "candidateId".
 */
export type CandidateId = string;
/**
 * Opaque profile-revision identifier.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "revisionId".
 */
export type RevisionId = string;
/**
 * Provider family key. Lowercase-hyphenated; vendor-neutral, never a vendor-specific core type.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "providerFamily".
 */
export type ProviderFamily = string;
/**
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "regionCode".
 */
export type RegionCode = string;
/**
 * Exact decimal fraction between 0 and 1 inclusive.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "fraction".
 */
export type Fraction = string;
/**
 * Authenticated tenant identifier. Resolved from authentication context, never from a request body field.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "tenantId".
 */
export type TenantId = string;
/**
 * Opaque policy-version identifier.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "policyVersion".
 */
export type PolicyVersion = string;
/**
 * Caller-defined risk tier. Higher tiers require stronger evidence and can require caller-side validation; Heimdall never lowers a declared tier.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "riskTier".
 */
export type RiskTier = 'low' | 'standard' | 'high' | 'critical';
/**
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "role".
 */
export type Role = 'system' | 'user' | 'assistant' | 'tool';
/**
 * Stable caller-assigned tool identifier.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "toolId".
 */
export type ToolId = string;
/**
 * Declared side-effect class. Selection may consider it; execution authorization stays with the caller, and Heimdall never executes tools.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "sideEffectClass".
 */
export type SideEffectClass = 'read' | 'write' | 'external';
/**
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "toolVersion".
 */
export type ToolVersion = string;
/**
 * Optional tool filtering. Disabled means no selection: supplied authorized tools pass through subject to validation. Enabled requires a catalog (possibly empty) and returns only selected definitions, possibly none.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "toolSelection".
 */
export type ToolSelection = ToolSelection1;
/**
 * Typed caller reason for mid-task model reevaluation.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "reevaluationReason".
 */
export type ReevaluationReason =
  | 'no_progress'
  | 'bad_output'
  | 'context_growth'
  | 'new_modality'
  | 'new_risk'
  | 'time_pressure'
  | 'budget_change'
  | 'provider_error'
  | 'user_request';
/**
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "reasonCode".
 */
export type ReasonCode = string;
/**
 * Non-negative per-attempt event ordinal. Ordering within one attempt is significant.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "seqNumber".
 */
export type SeqNumber = number;
/**
 * Terminal attempt outcome. Usage may arrive with or after the finish event; late usage is reconciled, never fabricated.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "finishReason".
 */
export type FinishReason =
  | 'completed'
  | 'truncated'
  | 'filtered'
  | 'error'
  | 'cancelled'
  | 'budget_exceeded';
/**
 * One normalized provider-neutral stream event. Parser buffers, argument size, and event counts are bounded by the stated limits.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "streamEvent".
 */
export type StreamEvent =
  | TextDelta
  | ReasoningDelta
  | ToolCallDelta
  | UsageEvent
  | FinishEvent
  | ErrorEvent;

/**
 * Single schema source for Heimdall V1 contract primitives and error vocabulary (T002). Generated TypeScript and OpenAPI components derive from this file; never edit generated output. Request/result composition belongs to later tasks (T005+).
 */
export interface HeimdallContractsV1 {}
/**
 * Exact money value with declared currency.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "money".
 */
export interface Money {
  currency: Currency;
  amount: DecimalAmount;
}
/**
 * Reserved forward-compatibility object. No keys are allowed in v1; each future key is an additive minor version change. Unknown keys are rejected, never silently dropped.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "extensions".
 */
export interface Extensions {}
/**
 * Plain text content. The only modality with first-slice runtime support; others are expressible but rejected by adapters until verified.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "textBlock".
 */
export interface TextBlock {
  type: 'text';
  text: string;
}
/**
 * External content reference by URL. Server-side fetching, if ever needed, is allowlisted per adapter; no fetching exists in v1.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "urlSource".
 */
export interface UrlSource {
  url: string;
}
/**
 * Caller-held content reference. The gateway never dereferences it; adapters declare what they accept.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "refSource".
 */
export interface RefSource {
  ref: string;
}
/**
 * Image requirement. A description never erases the hard requirement to support the image itself.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "imageBlock".
 */
export interface ImageBlock {
  type: 'image';
  source: UrlSource | RefSource;
  mimeType?: MimeType;
  description?: string;
}
/**
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "audioBlock".
 */
export interface AudioBlock {
  type: 'audio';
  source: UrlSource | RefSource;
  mimeType?: MimeType;
  description?: string;
}
/**
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "videoBlock".
 */
export interface VideoBlock {
  type: 'video';
  source: UrlSource | RefSource;
  mimeType?: MimeType;
  description?: string;
}
/**
 * File/document requirement (text, PDF, archive, or other opaque document).
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "fileBlock".
 */
export interface FileBlock {
  type: 'file';
  source: UrlSource | RefSource;
  mimeType?: MimeType;
  description?: string;
}
/**
 * Bounded mixed-modality content. Depth beyond nesting limits is rejected.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "mixedBlock".
 */
export interface MixedBlock {
  type: 'mixed';
  /**
   * @minItems 1
   * @maxItems 64
   */
  parts: [ContentBlock, ...ContentBlock[]];
}
/**
 * Typed error envelope. Certainty is per-occurrence, never inferred from the code alone.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "heimdallError".
 */
export interface HeimdallError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  certainty?: ExecutionCertainty;
  requestId?: RequestId;
  decisionId?: DecisionId;
  attemptId?: AttemptId;
  extensions?: Extensions;
}
/**
 * Model version or documented alias plus alias-resolution status. An unresolved live alias is recorded as such and limits reproducibility claims.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "modelRef".
 */
export interface ModelRef {
  model: string;
  resolvedRevision?: string;
  unresolvedAlias: boolean;
}
/**
 * Per-modality hard support. Every key is explicit; domain code maps an absent record to unknown, never to false.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "modalitySupport".
 */
export interface ModalitySupport {
  text: CapabilityState;
  image: CapabilityState;
  audio: CapabilityState;
  video: CapabilityState;
  file: CapabilityState;
  mixed: CapabilityState;
}
/**
 * Generic tool-calling and structured-output support. Measured success with specific catalogs is quality evidence, not part of this signal.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "toolSupport".
 */
export interface ToolSupport {
  genericToolCalling: CapabilityState;
  structuredOutput: CapabilityState;
}
/**
 * Empirically safe token capacity with explicit output reserve, not advertised maxima.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "safeCapacity".
 */
export interface SafeCapacity {
  safeInputTokens: TokenCount;
  safeOutputTokens: TokenCount;
  outputReserveTokens: TokenCount;
}
/**
 * Where and through which providers a candidate may serve. Lists are explicit; emptiness is rejected rather than read as unrestricted.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "endpointPolicy".
 */
export interface EndpointPolicy {
  /**
   * @minItems 1
   * @maxItems 64
   */
  regions: [RegionCode, ...RegionCode[]];
  /**
   * @minItems 1
   * @maxItems 16
   */
  providers:
    | [ProviderFamily]
    | [ProviderFamily, ProviderFamily]
    | [ProviderFamily, ProviderFamily, ProviderFamily]
    | [ProviderFamily, ProviderFamily, ProviderFamily, ProviderFamily]
    | [ProviderFamily, ProviderFamily, ProviderFamily, ProviderFamily, ProviderFamily]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ];
  allowsLocal: boolean;
}
/**
 * Exact price per one million units in the stated currency.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "priceRate".
 */
export interface PriceRate {
  currency: Currency;
  perMillionUnits: DecimalAmount;
}
/**
 * Effective-dated price record. Cross-rate currency consistency is checked in domain code, not in this schema.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "priceSchedule".
 */
export interface PriceSchedule {
  effectiveAt: Timestamp;
  input: PriceRate;
  cachedInput?: PriceRate;
  output: PriceRate;
  reasoning?: PriceRate;
  request?: PriceRate;
}
/**
 * One sourced claim with observation time, optional expiry and sample size, and uncertainty. No unattributed specialization labels.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "evidenceRecord".
 */
export interface EvidenceRecord {
  kind: EvidenceKind;
  source: string;
  observedAt: Timestamp;
  expiresAt?: Timestamp;
  sampleCount?: number;
  uncertainty?: Fraction;
}
/**
 * Versioned model-candidate record. `fixture` marks unmistakably synthetic development data barred from production.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "candidateProfile".
 */
export interface CandidateProfile {
  candidateId: CandidateId;
  revision: RevisionId;
  providerFamily: ProviderFamily;
  model: ModelRef;
  modalities: ModalitySupport;
  tools: ToolSupport;
  capacity: SafeCapacity;
  endpoints: EndpointPolicy;
  prices: PriceSchedule;
  /**
   * @minItems 1
   * @maxItems 128
   */
  evidence: [EvidenceRecord, ...EvidenceRecord[]];
  fixture: boolean;
}
/**
 * Allowed regions and providers for one traffic class. Completion and classifier egress are modeled independently.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "egressRule".
 */
export interface EgressRule {
  /**
   * @minItems 1
   * @maxItems 64
   */
  regions: [RegionCode, ...RegionCode[]];
  /**
   * @minItems 1
   * @maxItems 16
   */
  providers:
    | [ProviderFamily]
    | [ProviderFamily, ProviderFamily]
    | [ProviderFamily, ProviderFamily, ProviderFamily]
    | [ProviderFamily, ProviderFamily, ProviderFamily, ProviderFamily]
    | [ProviderFamily, ProviderFamily, ProviderFamily, ProviderFamily, ProviderFamily]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ]
    | [
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
        ProviderFamily,
      ];
}
/**
 * Caller/profile-specific reference plus maximum tolerated regression as an exact fraction. Numerical values are calibrated in evaluation.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "qualityBaseline".
 */
export interface QualityBaseline {
  reference: string;
  maxRegression: Fraction;
}
/**
 * Application latency requirements. Numerical SLO values are calibrated before hosted rollout.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "latencyLimits".
 */
export interface LatencyLimits {
  maxP99Ms: DurationMs;
  maxTimeToFirstTokenMs?: DurationMs;
}
/**
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "reliabilityFloor".
 */
export interface ReliabilityFloor {
  minSuccessRate: Fraction;
}
/**
 * Declared money bounds. Hard caps gate admission; soft targets influence ranking only. Ledger mechanics belong to later tasks.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "budgetPolicy".
 */
export interface BudgetPolicy {
  hardCap: Money;
  softTarget?: Money;
}
/**
 * Explicit candidate pin. Bypasses selection but never eligibility; fallback permission is unambiguous.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "modelPin".
 */
export interface ModelPin {
  candidate: CandidateId;
  allowFallback: boolean;
}
/**
 * Complete effective rule for one scope. An empty allowlist constrains nothing; denials are explicit and union across levels.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "policyRule".
 */
export interface PolicyRule {
  /**
   * @maxItems 256
   */
  allowlist: CandidateId[];
  /**
   * @maxItems 256
   */
  deniedCandidates?: CandidateId[];
  pin?: ModelPin;
  quality: QualityBaseline;
  latency: LatencyLimits;
  reliability: ReliabilityFloor;
  riskMinimum: RiskTier;
  egress: EgressRule;
  classifierEgress: EgressRule;
  budgets: BudgetPolicy;
}
/**
 * Partial tenant/application rule. Set fields narrow the platform rule; any widening is an explicit conflict error, never a silent relaxation.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "policyOverride".
 */
export interface PolicyOverride {
  /**
   * @maxItems 256
   */
  allowlist?: CandidateId[];
  /**
   * @maxItems 256
   */
  deniedCandidates?: CandidateId[];
  pin?: ModelPin;
  quality?: QualityBaseline;
  latency?: LatencyLimits;
  reliability?: ReliabilityFloor;
  riskMinimum?: RiskTier;
  egress?: EgressRule;
  classifierEgress?: EgressRule;
  budgets?: BudgetPolicy;
}
/**
 * Resolved rule bound to the authenticated tenant with level-version provenance. Immutable once issued.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "effectivePolicy".
 */
export interface EffectivePolicy {
  tenant: TenantId;
  rule: PolicyRule;
  versions: {
    platform: PolicyVersion;
    tenant: PolicyVersion;
    application?: PolicyVersion;
  };
}
/**
 * One canonical conversation message. Order within the messages array is significant and preserved by canonical hashing.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "message".
 */
export interface Message {
  role: Role;
  /**
   * @minItems 1
   * @maxItems 256
   */
  content: [ContentBlock, ...ContentBlock[]];
  name?: string;
  toolCallId?: string;
}
/**
 * One caller-authorized tool. Only selected definitions reach the model; order is significant and preserved.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "toolDefinition".
 */
export interface ToolDefinition {
  id: ToolId;
  description: string;
  inputSchema: {
    [k: string]: unknown;
  };
  sideEffect: SideEffectClass;
  version: ToolVersion;
  essential: boolean;
  bundle?: string;
  /**
   * @maxItems 16
   */
  tags?:
    | []
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string, string]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ];
}
export interface ToolSelection1 {
  enabled: boolean;
  /**
   * @maxItems 256
   */
  catalog?: ToolDefinition[];
}
/**
 * Enabled selection always names its catalog, even when empty. Split from toolSelection so Ajv strict mode sees a self-contained required property.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "enabledToolSelection".
 */
export interface EnabledToolSelection {
  enabled?: true;
  /**
   * @maxItems 256
   */
  catalog: ToolDefinition[];
}
/**
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "reevaluationRequest".
 */
export interface ReevaluationRequest {
  reason: ReevaluationReason;
  detail?: string;
}
/**
 * Compact caller-carried continuity data. Advisory for classification only: it carries no permissions, policy, allowlists, tenant identity, or task identifiers, and unknown fields are rejected.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "routingState".
 */
export interface RoutingState {
  stateVersion: string;
  priorCandidate?: CandidateId;
  objective: string;
  /**
   * @maxItems 32
   */
  evidenceRefs?: string[];
  parentRevision?: string;
}
/**
 * Per-invocation money bounds plus optional advisory remaining task budget. Hard-cap admission and ledger mechanics belong to later tasks; transport defaults apply when absent.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "invocationBudget".
 */
export interface InvocationBudget {
  hardCap?: Money;
  remainingTaskBudget?: Money;
}
/**
 * Advisory context needs used for candidate-specific token-fit checks.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "contextRequirements".
 */
export interface ContextRequirements {
  requiredInputTokens?: TokenCount;
  requiredOutputTokens?: TokenCount;
}
/**
 * Native route request. Tenant identity comes from authentication context and has no body field. First-slice runtime support is text-only; other modalities are expressible and rejected by adapters until verified.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "routeRequest".
 */
export interface RouteRequest {
  applicationProfile: ApplicationProfile;
  policyRef: PolicyVersion;
  /**
   * @minItems 1
   * @maxItems 512
   */
  messages: [Message, ...Message[]];
  toolSelection?: ToolSelection;
  routingState?: RoutingState;
  modelPin?: ModelPin;
  reevaluation?: ReevaluationRequest;
  outputSchema?: {
    [k: string]: unknown;
  };
  contextRequirements?: ContextRequirements;
  budget?: InvocationBudget;
  deadlineMs?: DurationMs;
  extensions?: Extensions;
}
/**
 * Exact dependency revisions behind a decision, for reproducibility and audit.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "dependencyVersions".
 */
export interface DependencyVersions {
  policy: PolicyVersion;
  catalog: RevisionId;
  classifier?: string;
}
/**
 * Whether a continuing task retained its model, and why.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "retentionInfo".
 */
export interface RetentionInfo {
  retained: boolean;
  reason?: string;
}
/**
 * Native route result: the selected candidate, the exact visible tool set, ranked fallbacks, and the revised caller state. Cost estimation is filled by later tasks and optional until then.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "routeResult".
 */
export interface RouteResult {
  decisionId: DecisionId;
  candidateId: CandidateId;
  candidateRevision?: RevisionId;
  /**
   * @maxItems 256
   */
  selectedToolIds: ToolId[];
  /**
   * @maxItems 32
   */
  rankedFallbacks: CandidateId[];
  /**
   * @minItems 1
   * @maxItems 32
   */
  reasonCodes: [ReasonCode, ...ReasonCode[]];
  dependencyVersions: DependencyVersions;
  estimatedCost?: Money;
  routingState: RoutingState;
  retention: RetentionInfo;
}
/**
 * Exact token accounting for one attempt. Missing provider values stay absent; reconciliation never invents them.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "usageRecord".
 */
export interface UsageRecord {
  inputTokens: TokenCount;
  cachedInputTokens?: TokenCount;
  outputTokens: TokenCount;
  reasoningTokens?: TokenCount;
  requestCharges?: Money;
}
/**
 * Provider-reported model identity for one attempt. A mismatch with the requested candidate is a protocol/policy failure, never a silent relabel.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "actualModel".
 */
export interface ActualModel {
  provider: ProviderFamily;
  model: string;
  revision?: string;
}
/**
 * Result-replay metadata for duplicate-request recovery. Replay applies to metadata; response content replays only with explicit transient retention.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "replayInfo".
 */
export interface ReplayInfo {
  replayable: boolean;
  providerRequestId?: string;
}
/**
 * Candidate capability snapshot consumed by invocation-time rechecks. Produced from catalog data; storage and publication belong to later tasks.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "capabilityResolution".
 */
export interface CapabilityResolution {
  candidate: CandidateId;
  revision: RevisionId;
  modalities: ModalitySupport;
  tools: ToolSupport;
  capacity: SafeCapacity;
  policyVersion: PolicyVersion;
}
/**
 * Assistant text fragment. Any text delta is a commit event: no model switch after it is emitted.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "textDelta".
 */
export interface TextDelta {
  attempt: AttemptId;
  seq: SeqNumber;
  kind: 'text';
  delta: string;
}
/**
 * Reasoning-trace fragment. A commit event like any other visible content.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "reasoningDelta".
 */
export interface ReasoningDelta {
  attempt: AttemptId;
  seq: SeqNumber;
  kind: 'reasoning';
  delta: string;
}
/**
 * Raw tool-call argument fragment, possibly partial. Every tool-call delta is a commit event, including fragments.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "toolCallDelta".
 */
export interface ToolCallDelta {
  attempt: AttemptId;
  seq: SeqNumber;
  kind: 'tool_call';
  callId: string;
  name?: ToolId;
  argumentsFragment: string;
}
/**
 * Provider usage report. May arrive late, including after the finish event.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "usageEvent".
 */
export interface UsageEvent {
  attempt: AttemptId;
  seq: SeqNumber;
  kind: 'usage';
  usage: UsageRecord;
}
/**
 * Terminal attempt event. Exactly one terminal event (finish or error) closes an attempt; nothing follows it except late usage reconciliation.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "finishEvent".
 */
export interface FinishEvent {
  attempt: AttemptId;
  seq: SeqNumber;
  kind: 'finish';
  reason: FinishReason;
  usage?: UsageRecord;
}
/**
 * Terminal failure event carrying the typed envelope with retryability and execution certainty.
 *
 * This interface was referenced by `HeimdallContractsV1`'s JSON-Schema
 * via the `definition` "errorEvent".
 */
export interface ErrorEvent {
  attempt: AttemptId;
  seq: SeqNumber;
  kind: 'error';
  error: HeimdallError;
}
