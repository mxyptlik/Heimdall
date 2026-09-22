// Contract primitives (T002 scaffold entrypoint). Request/result composition
// belongs to T005+; this package currently owns primitives, modality blocks,
// the typed error vocabulary, and the version policy (see VERSIONING.md).
export const CONTRACTS_VERSION = '0.0.0';

export * from './errors.js';
export * from './validate.js';
