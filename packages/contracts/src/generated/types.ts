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
