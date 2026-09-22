// Typed error vocabulary (T002). Every ErrorCode has exactly one catalog entry
// with its default retryability. Execution certainty stays per-occurrence on
// the envelope; it is never derived from the code.
import type { ErrorCode, ExecutionCertainty, HeimdallError } from './generated/types.js';

export interface ErrorCatalogEntry {
  /** Default `retryable` for a fresh envelope with this code. */
  readonly retryable: boolean;
  /** Why this default holds; recorded so future changes need justification. */
  readonly reason: string;
}

export const ERROR_CATALOG: Record<ErrorCode, ErrorCatalogEntry> = {
  INVALID_REQUEST: { retryable: false, reason: 'Caller must fix the request first.' },
  POLICY_DENIED: { retryable: false, reason: 'Hard policy will deny the same request again.' },
  UNSUPPORTED_OPTION: { retryable: false, reason: 'Caller must choose a supported option.' },
  NO_ELIGIBLE_MODEL: { retryable: false, reason: 'No candidate satisfies hard requirements.' },
  INSUFFICIENT_EVIDENCE: { retryable: false, reason: 'Retrying cannot create missing evidence.' },
  ESSENTIAL_TOOLS_DO_NOT_FIT: {
    retryable: false,
    reason: 'Caller must narrow essential tools or budget.',
  },
  CLASSIFIER_UNAVAILABLE: {
    retryable: true,
    reason: 'Transient semantic-engine outage may clear.',
  },
  CATALOG_STALE: { retryable: true, reason: 'A refresh may restore a usable snapshot.' },
  CONTEXT_OVERFLOW: { retryable: false, reason: 'Caller must shrink context or raise limits.' },
  BUDGET_EXCEEDED: { retryable: false, reason: 'Retrying spends against the same exhausted cap.' },
  DEADLINE_EXCEEDED: {
    retryable: false,
    reason: 'A retry needs a new deadline, hence a new request.',
  },
  PROVIDER_UNAVAILABLE: { retryable: true, reason: 'Transient provider outage may clear.' },
  PROVIDER_PROTOCOL_ERROR: { retryable: true, reason: 'Malformed provider framing may not recur.' },
  STREAM_INTERRUPTED: {
    retryable: true,
    reason: 'Pre-commit interruption can recover on another attempt.',
  },
  STALE_PREPARED_ROUTE: { retryable: false, reason: 'Caller must prepare a fresh route.' },
  IDEMPOTENCY_CONFLICT: {
    retryable: false,
    reason: 'Same key with a different payload needs a new key.',
  },
  CANCELLED: { retryable: false, reason: 'Cancellation is terminal for the request.' },
};

export function defaultRetryable(code: ErrorCode): boolean {
  return ERROR_CATALOG[code].retryable;
}

/** Build a valid envelope with catalog-default retryability. */
export function makeError(
  code: ErrorCode,
  message: string,
  extra?: Partial<Pick<HeimdallError, 'certainty' | 'requestId' | 'decisionId' | 'attemptId'>>,
): HeimdallError {
  return { code, message, retryable: defaultRetryable(code), ...extra };
}

export type { ErrorCode, ExecutionCertainty, HeimdallError };
