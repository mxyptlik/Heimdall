// T018 acceptance: scripted answers support pure domain tests; malformed,
// out-of-range, oversized, and mistargeted responses are rejected; versions
// and state sizes are captured; fixture states exercise plumbing only.
import { describe, expect, it } from 'vitest';
import {
  createFakeClock,
  FakeSemanticEngine,
  SEMANTIC_FIXTURE_STATES,
  validateAnswerShape,
  type FakeQuestion,
} from '../src/index.js';

function continuityQuestion(): FakeQuestion {
  return { name: 'continuity', kind: 'noul', rubricVersion: 'v1' };
}

function intentQuestion(): FakeQuestion {
  return {
    name: 'intent',
    kind: 'choice',
    rubricVersion: 'v1',
    options: ['bug-fix', 'other'],
  };
}

describe('fake semantic engine', () => {
  it('returns scripted answers deterministically with full distributions', () => {
    const script = {
      continuity: { kind: 'answer', answer: { question: 'continuity', probability: 0.7 } },
      intent: {
        kind: 'answer',
        answer: {
          question: 'intent',
          distribution: [
            { option: 'bug-fix', probability: 0.8 },
            { option: 'other', probability: 0.2 },
          ],
        },
      },
    } as const;
    const first = new FakeSemanticEngine({ script });
    const second = new FakeSemanticEngine({ script });
    expect(first.ask(continuityQuestion(), 'state')).toEqual(
      second.ask(continuityQuestion(), 'state'),
    );
    const answered = first.ask(intentQuestion(), 'state');
    expect(answered.ok).toBe(true);
    if (!answered.ok) return;
    expect(answered.answer).toEqual({
      question: 'intent',
      distribution: [
        { option: 'bug-fix', probability: 0.8 },
        { option: 'other', probability: 0.2 },
      ],
    });
  });

  it('times out on script and advances the fake clock', () => {
    const clock = createFakeClock();
    const engine = new FakeSemanticEngine({
      script: { continuity: { kind: 'timeout', afterMs: 1500 } },
      clock,
    });
    const result = engine.ask(continuityQuestion(), 'state');
    expect(result).toMatchObject({ ok: false, reason: 'timeout' });
    expect(clock.now()).toBe(1500);
  });

  it('rejects malformed script payloads without throwing', () => {
    const engine = new FakeSemanticEngine({
      script: { continuity: { kind: 'malformed', payload: { nonsense: true } } },
    });
    const result = engine.ask(continuityQuestion(), 'state');
    expect(result).toMatchObject({ ok: false, reason: 'invalid_shape' });
  });

  it('fails unscripted questions loudly', () => {
    const engine = new FakeSemanticEngine({ script: {} });
    expect(engine.ask(continuityQuestion(), 'state')).toMatchObject({
      ok: false,
      reason: 'unscripted',
    });
  });

  it('captures rubric versions and state sizes per call', () => {
    const engine = new FakeSemanticEngine({
      script: {
        continuity: { kind: 'answer', answer: { question: 'continuity', probability: 1 } },
      },
    });
    engine.ask(continuityQuestion(), 'abc');
    engine.ask({ ...continuityQuestion(), rubricVersion: 'v2' }, 'abcdef');
    expect(engine.calls).toEqual([
      { question: 'continuity', rubricVersion: 'v1', stateChars: 3, atMs: 0 },
      { question: 'continuity', rubricVersion: 'v2', stateChars: 6, atMs: 0 },
    ]);
  });

  it('answers from script regardless of state content', () => {
    const engine = new FakeSemanticEngine({
      script: {
        continuity: { kind: 'answer', answer: { question: 'continuity', probability: 0.2 } },
      },
    });
    for (const state of Object.values(SEMANTIC_FIXTURE_STATES)) {
      const result = engine.ask(continuityQuestion(), state);
      expect(result).toEqual({
        ok: true,
        answer: { question: 'continuity', probability: 0.2 },
      });
    }
  });
});

describe('answer validation', () => {
  it('rejects missing ids, nonfinite, and out-of-range probabilities', () => {
    expect(validateAnswerShape(continuityQuestion(), {})).toContain('missing question id');
    expect(
      validateAnswerShape(continuityQuestion(), { question: 'continuity', probability: NaN }),
    ).not.toHaveLength(0);
    expect(
      validateAnswerShape(continuityQuestion(), { question: 'continuity', probability: 1.5 }),
    ).toContain('noul probability out of range');
    expect(
      validateAnswerShape(continuityQuestion(), { question: 'other', probability: 0.5 }),
    ).toContain('question id mismatch');
  });

  it('rejects unexpected options and bad distributions', () => {
    const question = intentQuestion();
    expect(
      validateAnswerShape(question, {
        question: 'intent',
        distribution: [{ option: 'explosion', probability: 1 }],
      }),
    ).toContain('unexpected option: explosion');
    expect(
      validateAnswerShape(question, {
        question: 'intent',
        distribution: [
          { option: 'bug-fix', probability: 0.5 },
          { option: 'other', probability: 0.4 },
        ],
      }),
    ).toContain('distribution must sum to 1 within tolerance');
    expect(
      validateAnswerShape(question, {
        question: 'intent',
        distribution: Array.from({ length: 256 }, (_, i) => ({ option: `o${i}`, probability: 0 })),
      }),
    ).toContain('distribution size out of bounds');
  });

  it('accepts well-formed answers of every kind', () => {
    expect(
      validateAnswerShape(continuityQuestion(), { question: 'continuity', probability: 0 }),
    ).toEqual([]);
    expect(
      validateAnswerShape(intentQuestion(), {
        question: 'intent',
        distribution: [
          { option: 'bug-fix', probability: 0.5 },
          { option: 'other', probability: 0.5 },
        ],
      }),
    ).toEqual([]);
  });
});
