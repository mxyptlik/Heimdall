// T008 acceptance: every question names inputs, criteria, unknown path, and
// consumer; batch A holds no within-batch dependencies; fixtures preserve
// full distributions; exact comparisons live in code.
import { describe, expect, it } from 'vitest';
import {
  choiceEntropyBits,
  choiceTop1,
  ENGINE_SPEC,
  fitsClassifierBudget,
  planBatches,
  PROJECTOR_SPEC,
  RUBRICS,
  validateRegistry,
  type ChoiceAnswer,
  type RubricEntry,
} from '../src/modules/understanding/public.js';

describe('rubric registry', () => {
  it('validates clean with fully specified questions', () => {
    expect(validateRegistry(RUBRICS)).toEqual([]);
  });

  it('names inputs, criteria, unknown path, and consumer for every question', () => {
    for (const entry of RUBRICS) {
      expect(entry.inputFields.length).toBeGreaterThan(0);
      expect(entry.criteria.length).toBeGreaterThan(0);
      expect(entry.unknownPath.length).toBeGreaterThan(0);
      expect(entry.consumer.length).toBeGreaterThan(0);
      expect(entry.version).toMatch(/^v\d+$/);
    }
  });

  it('excludes complexity prediction and goal definition', () => {
    const text = RUBRICS.map((r) => `${r.name} ${r.criteria}`.toLowerCase()).join('\n');
    expect(text).not.toContain('complexity');
    expect(text).not.toMatch(/\bgoal\b/);
  });

  it('enforces Choice and Score bounds from the engine spec', () => {
    const tooMany: RubricEntry = {
      name: 'tooMany',
      version: 'v1',
      kind: 'choice',
      batch: 'A',
      inputFields: ['messages'],
      requires: ['request'],
      criteria: 'x',
      unknownPath: 'x',
      consumer: 'x',
      options: Array.from({ length: 256 }, (_, i) => `o${i}`),
    };
    expect(validateRegistry([tooMany]).length).toBeGreaterThan(0);

    const badScore: RubricEntry = {
      name: 'badScore',
      version: 'v1',
      kind: 'score',
      batch: 'A',
      inputFields: ['messages'],
      requires: ['request'],
      criteria: 'x',
      unknownPath: 'x',
      consumer: 'x',
      levels: ['a'],
    };
    expect(validateRegistry([badScore]).length).toBeGreaterThan(0);
  });

  it('rejects duplicate names and missing consumers', () => {
    const [first, ...rest] = RUBRICS;
    if (!first) throw new Error('registry empty');
    expect(validateRegistry([first, ...rest, first]).some((e) => e.includes('duplicate'))).toBe(
      true,
    );
    expect(
      validateRegistry([{ ...first, name: 'lonely', consumer: '' }]).some((e) =>
        e.includes('consumer'),
      ),
    ).toBe(true);
  });
});

describe('batch planning', () => {
  it('keeps batch A free of within-batch answer dependencies', () => {
    const plan = planBatches(RUBRICS);
    expect(plan.batchA.length).toBeGreaterThan(0);
    expect(plan.batchB).toEqual(['toolRelevance']);
    const batchA = new Set(plan.batchA);
    for (const entry of RUBRICS) {
      if (entry.batch !== 'A') continue;
      for (const dep of entry.requires) {
        expect(dep.startsWith('batchA.')).toBe(false);
        if (dep.startsWith('batchA.')) {
          expect(batchA.has(dep.slice('batchA.'.length))).toBe(false);
        }
      }
    }
  });

  it('grounds batch B in batch-A outputs plus a code-built shortlist', () => {
    const toolRelevance = RUBRICS.find((r) => r.name === 'toolRelevance');
    expect(toolRelevance?.requires).toContain('batchA.toolNeed');
    expect(toolRelevance?.requires).toContain('catalog');
    expect(toolRelevance?.parameterizedBy).toBe('toolId');
  });
});

describe('engine limits', () => {
  it('pins text-only operation with ordered token bounds', () => {
    expect(ENGINE_SPEC.textOnly).toBe(true);
    expect(PROJECTOR_SPEC.maxStateTokens).toBeLessThan(ENGINE_SPEC.workingBudgetTokens);
    expect(ENGINE_SPEC.workingBudgetTokens).toBeLessThan(
      ENGINE_SPEC.maxStatePlusLongestQuestionTokens,
    );
    expect(ENGINE_SPEC.maxStatePlusLongestQuestionTokens).toBeLessThanOrEqual(
      ENGINE_SPEC.maxTotalTokens,
    );
    expect(ENGINE_SPEC.sdkRetriesDefault).toBe(0);
  });

  it('checks classifier budgets with exact integer comparisons', () => {
    expect(fitsClassifierBudget(4000, [1000, 2000])).toBe(true);
    expect(fitsClassifierBudget(30000, [1000])).toBe(false);
    expect(fitsClassifierBudget(60000, [100])).toBe(false);
    expect(fitsClassifierBudget(100, [])).toBe(false);
    expect(fitsClassifierBudget(-1, [100])).toBe(false);
    expect(fitsClassifierBudget(100, [1.5])).toBe(false);
  });
});

describe('probability preservation', () => {
  const fixture: ChoiceAnswer = {
    question: 'intent',
    distribution: [
      { option: 'bug-fix', probability: 0.6 },
      { option: 'test-writing', probability: 0.3 },
      { option: 'other', probability: 0.1 },
    ],
  };

  it('keeps the full distribution and reads a stable top-1', () => {
    expect(fixture.distribution).toHaveLength(3);
    expect(choiceTop1(fixture)).toBe('bug-fix');
  });

  it('measures spread as entropy, not as task success', () => {
    expect(choiceEntropyBits(fixture)).toBeGreaterThan(0);
    expect(choiceEntropyBits(fixture)).toBeLessThan(Math.log2(3));
    const uniform: ChoiceAnswer = {
      question: 'intent',
      distribution: [
        { option: 'a', probability: 0.5 },
        { option: 'b', probability: 0.5 },
      ],
    };
    expect(choiceEntropyBits(uniform)).toBeCloseTo(1, 10);
  });
});
