// T005 acceptance: canonical hashing rules. Object key order is
// insignificant; message and tool-definition order are significant.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { canonicalize, digestCanonical, isSha256Hex } from '../src/canonical.js';

function requestWith(messages: unknown[], catalog: unknown[] = []) {
  return {
    applicationProfile: 'chat',
    policyRef: 'pol_test000001',
    messages,
    toolSelection: { enabled: true, catalog },
  };
}

const MESSAGES = [
  { role: 'user', content: [{ type: 'text', text: 'first' }] },
  { role: 'assistant', content: [{ type: 'text', text: 'second' }] },
];

describe('canonical hashing', () => {
  it('ignores object key order', () => {
    const a = requestWith(MESSAGES);
    const shuffled = {
      toolSelection: a.toolSelection,
      messages: a.messages,
      policyRef: a.policyRef,
      applicationProfile: a.applicationProfile,
    };
    expect(canonicalize(a)).toBe(canonicalize(shuffled));
    expect(digestCanonical(a)).toBe(digestCanonical(shuffled));
  });

  it('treats message order as significant', () => {
    expect(digestCanonical(requestWith(MESSAGES))).not.toBe(
      digestCanonical(requestWith([...MESSAGES].reverse())),
    );
  });

  it('treats tool-definition order as significant', () => {
    const t1 = {
      id: 'a',
      description: 'A',
      inputSchema: {},
      sideEffect: 'read',
      version: 'v1',
      essential: false,
    };
    const t2 = {
      id: 'b',
      description: 'B',
      inputSchema: {},
      sideEffect: 'read',
      version: 'v1',
      essential: false,
    };
    expect(digestCanonical(requestWith(MESSAGES, [t1, t2]))).not.toBe(
      digestCanonical(requestWith(MESSAGES, [t2, t1])),
    );
  });

  it('emits stable SHA-256 hex digests matching an independent computation', () => {
    const value = requestWith(MESSAGES);
    const expected = createHash('sha256').update(canonicalize(value), 'utf8').digest('hex');
    expect(digestCanonical(value)).toBe(expected);
    expect(isSha256Hex(digestCanonical(value))).toBe(true);
    expect(isSha256Hex('xyz')).toBe(false);
  });

  it('is deterministic across repeated calls', () => {
    const value = requestWith(MESSAGES);
    expect(canonicalize(value)).toBe(canonicalize(JSON.parse(JSON.stringify(value)) as unknown));
  });
});
