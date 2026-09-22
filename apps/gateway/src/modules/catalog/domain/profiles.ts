// Catalog profile domain rules (T003). Pure functions over validated
// CandidateProfile records. Storage, snapshot publication, and rollback
// belong to T021; this module decides upload validity, fixture gating,
// capability-state mapping, and evidence conflict detection.
import {
  makeError,
  validatorFor,
  type CandidateProfile,
  type CapabilityState,
  type HeimdallError,
} from '@heimdall/contracts';

export interface CatalogUploadOptions {
  /** Development/test imports only. Production publication always passes false. */
  readonly allowFixture: boolean;
}

export type CatalogUploadResult =
  | { readonly ok: true; readonly records: CandidateProfile[] }
  | { readonly ok: false; readonly error: HeimdallError };

function fail(code: 'INVALID_REQUEST' | 'POLICY_DENIED', message: string): CatalogUploadResult {
  return { ok: false, error: makeError(code, message) };
}

/**
 * Map an explicit boolean support claim to a capability state.
 * `undefined` (no evidence) stays `unknown`: unknown hard capability is
 * never verified support and never false.
 */
export function capabilityFromExplicit(support: boolean | undefined): CapabilityState {
  if (support === undefined) return 'unknown';
  return support ? 'verified' : 'unsupported';
}

/** Validate an upload batch: schema-valid, unique IDs, fixture gate. */
export function validateCatalogUpload(
  records: unknown,
  opts: CatalogUploadOptions,
): CatalogUploadResult {
  if (!Array.isArray(records)) return fail('INVALID_REQUEST', 'catalog upload must be an array');
  const validate = validatorFor('candidateProfile');
  const seen = new Set<string>();
  for (let i = 0; i < records.length; i += 1) {
    const record: unknown = records[i];
    if (!validate(record))
      return fail('INVALID_REQUEST', `record ${i} is not a valid candidateProfile`);
    const profile = record as CandidateProfile;
    if (seen.has(profile.candidateId)) {
      return fail('INVALID_REQUEST', `duplicate candidateId ${profile.candidateId}`);
    }
    seen.add(profile.candidateId);
    if (profile.fixture && !opts.allowFixture) {
      return fail('POLICY_DENIED', `fixture ${profile.candidateId} is barred from production`);
    }
  }
  return { ok: true, records: records as CandidateProfile[] };
}

/**
 * Compare two records for the same candidate and list conflicting fields.
 * Quarantine enforcement happens at publication time (T021); this function
 * defines what counts as a conflict: differing hard capabilities, capacity,
 * price rates, or evidence provenance for the same candidate identity.
 */
export function detectConflicts(a: CandidateProfile, b: CandidateProfile): string[] {
  const conflicts: string[] = [];
  if (a.candidateId !== b.candidateId) {
    conflicts.push(`candidateId: ${a.candidateId} vs ${b.candidateId}`);
    return conflicts;
  }
  for (const key of ['text', 'image', 'audio', 'video', 'file', 'mixed'] as const) {
    if (a.modalities[key] !== b.modalities[key]) {
      conflicts.push(`modalities.${key}: ${a.modalities[key]} vs ${b.modalities[key]}`);
    }
  }
  if (a.tools.genericToolCalling !== b.tools.genericToolCalling) {
    conflicts.push(
      `tools.genericToolCalling: ${a.tools.genericToolCalling} vs ${b.tools.genericToolCalling}`,
    );
  }
  if (a.tools.structuredOutput !== b.tools.structuredOutput) {
    conflicts.push(
      `tools.structuredOutput: ${a.tools.structuredOutput} vs ${b.tools.structuredOutput}`,
    );
  }
  for (const key of ['safeInputTokens', 'safeOutputTokens', 'outputReserveTokens'] as const) {
    if (a.capacity[key] !== b.capacity[key]) {
      conflicts.push(`capacity.${key}: ${a.capacity[key]} vs ${b.capacity[key]}`);
    }
  }
  for (const key of ['input', 'output'] as const) {
    const ra = a.prices[key];
    const rb = b.prices[key];
    if (ra.currency !== rb.currency || ra.perMillionUnits !== rb.perMillionUnits) {
      conflicts.push(
        `prices.${key}: ${ra.currency} ${ra.perMillionUnits} vs ${rb.currency} ${rb.perMillionUnits}`,
      );
    }
  }
  const kindsA = [...new Set(a.evidence.map((e) => e.kind))].sort().join(',');
  const kindsB = [...new Set(b.evidence.map((e) => e.kind))].sort().join(',');
  if (kindsA !== kindsB) conflicts.push(`evidence kinds: ${kindsA} vs ${kindsB}`);
  if (a.fixture !== b.fixture) conflicts.push(`fixture: ${a.fixture} vs ${b.fixture}`);
  return conflicts;
}
