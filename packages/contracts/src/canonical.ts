// Canonical hashing rules (T005). Object key order is insignificant and is
// normalized by sorting keys recursively. Array order is significant and
// preserved: message order and tool-definition order are model-visible and
// part of the digest. `undefined` object properties are dropped (JSON
// semantics); pass validated request payloads, not arbitrary values.
import { createHash } from 'node:crypto';

function sortKeys(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(sortKeys);
  if (node !== null && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(node).sort()) {
      const value = (node as Record<string, unknown>)[key];
      if (value !== undefined) out[key] = sortKeys(value);
    }
    return out;
  }
  return node;
}

/** Canonical JSON string: sorted keys, significant array order, trailing newline. */
export function canonicalize(value: unknown): string {
  return `${JSON.stringify(sortKeys(value))}\n`;
}

/** SHA-256 hex digest of the canonical form, for prepared-route binding (T028). */
export function digestCanonical(value: unknown): string {
  return createHash('sha256').update(canonicalize(value), 'utf8').digest('hex');
}

/** True for lowercase SHA-256 hex digests. */
export function isSha256Hex(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}
