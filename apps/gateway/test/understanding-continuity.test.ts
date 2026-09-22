// T013 acceptance: retention across iterations; per-invocation chat/RAG;
// uncertainty retains; ineligibility reselects; stale revisions reject.
import { describe, expect, it } from 'vitest';
import { reduceContinuity, type ContinuityInputs } from '../src/modules/understanding/public.js';

const CANDIDATE = 'cand_aaaa0001';

function coding(partial: Partial<ContinuityInputs> = {}): ContinuityInputs {
  return {
    profile: 'coding-agent',
    priorCandidate: CANDIDATE,
    continues: true,
    uncertain: false,
    retainedEligible: true,
    stateRevisionStale: false,
    ...partial,
  };
}

describe('continuity reducer', () => {
  it('retains one eligible model across a multi-iteration task', () => {
    const firstTurn: ContinuityInputs = {
      profile: 'coding-agent',
      continues: true,
      uncertain: false,
      retainedEligible: true,
      stateRevisionStale: false,
    };
    const turns: ContinuityInputs[] = [
      firstTurn,
      coding(),
      coding({ uncertain: true, continues: false }),
      coding({ continues: false }),
      coding(),
    ];
    const actions = turns.map((inputs) => reduceContinuity(inputs).action);
    expect(actions).toEqual(['select', 'retain', 'retain', 'select', 'retain']);
    const retained = reduceContinuity(coding());
    if (retained.action !== 'retain') throw new Error('expected retain');
    expect(retained.candidate).toBe(CANDIDATE);
  });

  it('routes chat and RAG per invocation even with a prior candidate', () => {
    for (const profile of ['chat', 'rag'] as const) {
      const decision = reduceContinuity({ ...coding(), profile });
      expect(decision.action).toBe('select');
      if (decision.action !== 'select') throw new Error('expected select');
      expect(decision.code).toBe('first_selection');
    }
  });

  it('never switches on uncertainty alone', () => {
    const decision = reduceContinuity(coding({ continues: false, uncertain: true }));
    expect(decision.action).toBe('retain');
  });

  it('reselects on clear task change, explicit reevaluation, and eligibility loss', () => {
    expect(reduceContinuity(coding({ continues: false })).action).toBe('select');

    const reevaluated = reduceContinuity(coding({ reevaluation: 'no_progress' }));
    expect(reevaluated.action).toBe('select');
    if (reevaluated.action !== 'select') throw new Error('expected select');
    expect(reevaluated.detail).toContain('no_progress');

    const ineligible = reduceContinuity(coding({ retainedEligible: false }));
    expect(ineligible.action).toBe('select');
    if (ineligible.action !== 'select') throw new Error('expected select');
    expect(ineligible.detail).toContain(CANDIDATE);
  });

  it('carries a strict pin into reselection without loosening it', () => {
    const pin = { candidate: CANDIDATE, allowFallback: false };
    const decision = reduceContinuity(coding({ continues: false, pin }));
    expect(decision.action).toBe('select');
    if (decision.action !== 'select') throw new Error('expected select');
    expect(decision.pinnedTo).toBe(CANDIDATE);
  });

  it('routes compound requests to one fresh selection', () => {
    const decision = reduceContinuity(coding({ compound: true }));
    expect(decision.action).toBe('select');
    if (decision.action !== 'select') throw new Error('expected select');
    expect(decision.detail).toContain('compound');
  });

  it('rejects stale revisions so older state cannot win', () => {
    const decision = reduceContinuity(coding({ stateRevisionStale: true }));
    expect(decision.action).toBe('reject');
    if (decision.action !== 'reject') throw new Error('expected reject');
    expect(decision.code).toBe('rejected_stale');
    expect(decision.error.code).toBe('INVALID_REQUEST');
  });

  it('is total and deterministic', () => {
    const inputs = coding({ reevaluation: 'user_request', uncertain: true });
    expect(reduceContinuity(inputs)).toEqual(reduceContinuity(inputs));
  });
});
