// T002 acceptance: all declared modalities are representable; oversized and
// unknown content is rejected. Runtime support stays text-only elsewhere.
import { describe, expect, it } from 'vitest';
import { validatorFor } from '../src/validate.js';

const isValid = (data: unknown): boolean => validatorFor('contentBlock')(data);

describe('content blocks', () => {
  it('accepts one block per declared modality', () => {
    expect(isValid({ type: 'text', text: 'hello' })).toBe(true);
    expect(isValid({ type: 'image', source: { url: 'https://example.invalid/i.png' } })).toBe(true);
    expect(isValid({ type: 'audio', source: { ref: 'calls/seg-42' } })).toBe(true);
    expect(
      isValid({
        type: 'video',
        source: { url: 'https://example.invalid/v.mp4' },
        mimeType: 'video/mp4',
      }),
    ).toBe(true);
    expect(isValid({ type: 'file', source: { ref: 'docs/spec.pdf' } })).toBe(true);
    expect(isValid({ type: 'mixed', parts: [{ type: 'text', text: 'a' }] })).toBe(true);
  });

  it('round-trips through JSON serialization', () => {
    const block = { type: 'mixed', parts: [{ type: 'text', text: 'a' }] };
    expect(isValid(JSON.parse(JSON.stringify(block)))).toBe(true);
  });

  it('rejects unknown block types and malformed sources', () => {
    expect(isValid({ type: 'hologram', text: 'x' })).toBe(false);
    expect(isValid({ type: 'image', source: { url: 'ftp://example.invalid/i.png' } })).toBe(false);
    expect(isValid({ type: 'image' })).toBe(false);
    expect(isValid({ type: 'text', text: '' })).toBe(false);
  });

  it('rejects oversized text and over-wide mixes', () => {
    expect(isValid({ type: 'text', text: 'x'.repeat(200001) })).toBe(false);
    expect(
      isValid({
        type: 'mixed',
        parts: Array.from({ length: 65 }, () => ({ type: 'text', text: 'a' })),
      }),
    ).toBe(false);
  });

  it('rejects unknown properties inside blocks', () => {
    expect(isValid({ type: 'text', text: 'hi', taskId: 't1' })).toBe(false);
  });
});
