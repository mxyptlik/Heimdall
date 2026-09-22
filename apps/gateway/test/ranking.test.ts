// T015 acceptance: identical inputs rank identically; ineligible never wins;
// ties retain; switches need proven savings; sparse evidence needs the
// baseline or fails explicitly.
import { describe, expect, it } from 'vitest';
import type { EligibilityVerdict, RejectionCode } from '../src/modules/selection/public.js';
import {
  rankCandidates,
  type RankCosts,
  type RankInputs,
} from '../src/modules/selection/public.js';

const ALPHA = 'cand_synthalpha01';
const BETA = 'cand_synthbeta002';
const GAMMA = 'cand_synthlocal03';

function eligible(id: string): EligibilityVerdict {
  return { candidateId: id, eligible: true, rejections: [] };
}

function rejected(id: string, rejections: RejectionCode[]): EligibilityVerdict {
  return { candidateId: id, eligible: false, rejections };
}

function costs(
  entries: Record<string, { cost?: string; quality?: string; reliability?: string }>,
): Partial<Record<string, RankCosts>> {
  const out: Partial<Record<string, RankCosts>> = {};
  for (const [id, entry] of Object.entries(entries)) {
    out[id] = {
      ...(entry.cost === undefined
        ? {}
        : { expectedCost: { currency: 'USD', amount: entry.cost } }),
      ...(entry.quality === undefined ? {} : { qualityLowerBound: entry.quality }),
      ...(entry.reliability === undefined ? {} : { successRate: entry.reliability }),
    };
  }
  return out;
}

function base(partial: Partial<RankInputs> = {}): RankInputs {
  return {
    verdicts: [eligible(ALPHA), eligible(BETA)],
    costs: costs({
      [ALPHA]: { cost: '0.10', quality: '0.9', reliability: '0.999' },
      [BETA]: { cost: '0.05', quality: '0.9', reliability: '0.999' },
    }),
    retentionHolds: false,
    compound: false,
    minSavingsToSwitch: { currency: 'USD', amount: '0.05' },
    ...partial,
  };
}

describe('candidate ranking', () => {
  it('ranks fixed inputs identically with the cheapest first', () => {
    const first = rankCandidates(base());
    const second = rankCandidates(base());
    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.primary).toBe(BETA);
    expect(first.fallbacks).toEqual([ALPHA]);
    expect(first.trace.rejected).toEqual([]);
  });

  it('never lets a cheaper ineligible model win', () => {
    const result = rankCandidates(
      base({
        verdicts: [eligible(ALPHA), eligible(BETA), rejected(GAMMA, ['explicitly_denied'])],
        costs: costs({
          [ALPHA]: { cost: '0.10', quality: '0.9' },
          [BETA]: { cost: '0.05', quality: '0.9' },
          [GAMMA]: { cost: '0.01', quality: '0.99' },
        }),
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.primary).toBe(BETA);
    expect(result.fallbacks).toEqual([ALPHA]);
    expect(result.trace.rejected).toEqual([
      { candidateId: GAMMA, rejections: ['explicitly_denied'] },
    ]);
  });

  it('keeps every fallback inside the eligible set', () => {
    const result = rankCandidates(base());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const id of result.fallbacks) {
      expect([ALPHA, BETA]).toContain(id);
    }
  });

  it('prefers the retained model on exact ties, then reliability, then ID', () => {
    const tied = base({
      costs: costs({
        [ALPHA]: { cost: '0.10', quality: '0.9', reliability: '0.99' },
        [BETA]: { cost: '0.10', quality: '0.9', reliability: '0.999' },
      }),
      retentionHolds: true,
      retainedCandidate: ALPHA,
    });
    const retained = rankCandidates(tied);
    expect(retained.ok).toBe(true);
    if (!retained.ok) return;
    expect(retained.primary).toBe(ALPHA);
    expect(retained.trace.retained).toBe(true);

    const untied = rankCandidates({ ...tied, retentionHolds: false });
    expect(untied.ok).toBe(true);
    if (!untied.ok) return;
    expect(untied.primary).toBe(BETA);
  });

  it('switches mid-task only on proven meaningful savings', () => {
    const setup = (betaCost: string | undefined) =>
      base({
        costs: costs({
          [ALPHA]: { cost: '0.10', quality: '0.9' },
          ...(betaCost === undefined
            ? { [BETA]: { quality: '0.9' } }
            : { [BETA]: { cost: betaCost, quality: '0.9' } }),
        }),
        retentionHolds: true,
        retainedCandidate: ALPHA,
      });
    const kept = rankCandidates(setup('0.09'));
    expect(kept.ok).toBe(true);
    if (!kept.ok) return;
    expect(kept.primary).toBe(ALPHA);

    const switched = rankCandidates(setup('0.04'));
    expect(switched.ok).toBe(true);
    if (!switched.ok) return;
    expect(switched.primary).toBe(BETA);
    expect(switched.trace.retained).toBe(false);

    const unpriced = rankCandidates(setup(undefined));
    expect(unpriced.ok).toBe(true);
    if (!unpriced.ok) return;
    expect(unpriced.primary).toBe(ALPHA);
  });

  it('honors an eligible pin over cheaper candidates', () => {
    const result = rankCandidates(base({ pin: { candidate: BETA, allowFallback: true } }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.primary).toBe(BETA);
  });

  it('ranks unpriced certified candidates after priced ones', () => {
    const result = rankCandidates(
      base({
        costs: costs({
          [ALPHA]: { cost: '0.10', quality: '0.9' },
          [BETA]: { quality: '0.9' },
        }),
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.primary).toBe(ALPHA);
    expect(result.fallbacks).toEqual([BETA]);
  });

  it('uses the best conservative evidence for compound requests', () => {
    const result = rankCandidates(
      base({
        compound: true,
        costs: costs({
          [ALPHA]: { cost: '0.05', quality: '0.9' },
          [BETA]: { cost: '0.10', quality: '0.95' },
        }),
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.primary).toBe(BETA);
  });

  it('falls back to the eligible baseline under sparse evidence', () => {
    const sparse = base({
      costs: costs({ [ALPHA]: { cost: '0.10' }, [BETA]: { cost: '0.05' } }),
      baseline: ALPHA,
    });
    const result = rankCandidates(sparse);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.primary).toBe(ALPHA);
    expect(result.trace.baselineUsed).toBe(true);
  });

  it('fails explicitly without evidence or baseline', () => {
    const noBaseline = rankCandidates(
      base({ costs: costs({ [ALPHA]: { cost: '0.10' }, [BETA]: { cost: '0.05' } }) }),
    );
    expect(noBaseline.ok).toBe(false);
    if (noBaseline.ok) return;
    expect(noBaseline.error.code).toBe('INSUFFICIENT_EVIDENCE');

    const badBaseline = rankCandidates(
      base({
        verdicts: [eligible(ALPHA), rejected(BETA, ['explicitly_denied'])],
        costs: costs({ [ALPHA]: { cost: '0.10' } }),
        baseline: BETA,
      }),
    );
    expect(badBaseline.ok).toBe(false);
    if (badBaseline.ok) return;
    expect(badBaseline.error.code).toBe('INSUFFICIENT_EVIDENCE');

    const noneEligible = rankCandidates(base({ verdicts: [rejected(ALPHA, ['not_allowlisted'])] }));
    expect(noneEligible.ok).toBe(false);
    if (noneEligible.ok) return;
    expect(noneEligible.error.code).toBe('NO_ELIGIBLE_MODEL');
  });
});
