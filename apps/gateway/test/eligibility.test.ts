// T010 acceptance: hard gates reject with explicit codes; unknown hard
// support never passes; tightening a requirement never adds candidates;
// estimator inputs are exact and caller-supplied.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type {
  CandidateProfile,
  CapabilityState,
  ContentBlock,
  PolicyRule,
  RouteRequest,
} from '@heimdall/contracts';
import {
  filterEligible,
  type CandidateMeasurements,
  type EligibilityInputs,
  type TokenNeeds,
} from '../src/modules/selection/public.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const NOW_MS = Date.parse('2026-10-01T00:00:00Z');

function loadFixture(): CandidateProfile[] {
  const raw = JSON.parse(
    readFileSync(join(ROOT, 'data', 'catalog', 'synthetic-profiles.v1.json'), 'utf8'),
  ) as { records: CandidateProfile[] };
  return raw.records;
}

function need(id: string, records: CandidateProfile[]): CandidateProfile {
  const record = records.find((r) => r.candidateId === id);
  if (!record) throw new Error(`fixture record missing: ${id}`);
  return structuredClone(record);
}

function permissivePolicy(): PolicyRule {
  return {
    allowlist: [],
    quality: { reference: 'test-baseline', maxRegression: '0.05' },
    latency: { maxP99Ms: 30000 },
    reliability: { minSuccessRate: '0.99' },
    riskMinimum: 'standard',
    egress: { regions: ['synthetic-region-1'], providers: ['synthetic-hosted-alpha'] },
    classifierEgress: { regions: ['synthetic-region-1'], providers: ['synthetic-hosted-alpha'] },
    budgets: { hardCap: { currency: 'USD', amount: '100.00' } },
  };
}

function fullMeasurements(): CandidateMeasurements {
  return { qualityLowerBound: '0.9', successRate: '0.999', p99Ms: 100 };
}

function textRequest(): RouteRequest {
  return {
    applicationProfile: 'chat',
    policyRef: 'pol_test000001',
    messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
  };
}

function baseInputs(records: CandidateProfile[]): EligibilityInputs {
  const tokenNeeds: TokenNeeds = {
    inputTokens: 1000,
    toolSchemaTokens: 500,
    requiredOutputTokens: 2000,
  };
  const measurements: Partial<Record<string, CandidateMeasurements>> = {};
  for (const record of records) measurements[record.candidateId] = fullMeasurements();
  return {
    request: textRequest(),
    candidates: records,
    policy: permissivePolicy(),
    tokenNeeds,
    measurements,
    nowMs: NOW_MS,
  };
}

describe('eligibility gates', () => {
  it('passes a verified text candidate with complete evidence', () => {
    const records = [need('cand_synthalpha01', loadFixture())];
    const verdicts = filterEligible(baseInputs(records));
    expect(verdicts).toEqual([
      { candidateId: 'cand_synthalpha01', eligible: true, rejections: [] },
    ]);
  });

  it('is deterministic for identical inputs', () => {
    const inputs = baseInputs(loadFixture());
    expect(filterEligible(inputs)).toEqual(filterEligible(inputs));
  });

  it('returns no verdicts for no candidates', () => {
    expect(filterEligible(baseInputs([]))).toEqual([]);
  });

  it('rejects unlisted and denied candidates', () => {
    const records = [need('cand_synthalpha01', loadFixture())];
    const unlisted = filterEligible({
      ...baseInputs(records),
      policy: { ...permissivePolicy(), allowlist: ['cand_other0001'] },
    });
    expect(unlisted[0]).toMatchObject({ eligible: false, rejections: ['not_allowlisted'] });

    const denied = filterEligible({
      ...baseInputs(records),
      policy: { ...permissivePolicy(), deniedCandidates: ['cand_synthalpha01'] },
    });
    expect(denied[0]?.rejections).toContain('explicitly_denied');
  });

  it('rejects unverified and unknown modalities without passing them', () => {
    const records = [need('cand_synthalpha01', loadFixture())];
    const imageRequest: RouteRequest = {
      ...textRequest(),
      messages: [{ role: 'user', content: [{ type: 'image', source: { ref: 'img/1' } }] }],
    };
    const verdicts = filterEligible({ ...baseInputs(records), request: imageRequest });
    expect(verdicts[0]?.eligible).toBe(false);
    expect(verdicts[0]?.rejections).toContain('modality_not_verified');
  });

  it('counts essential tool schema tokens and output reserve toward context', () => {
    const records = [need('cand_synthalpha01', loadFixture())];
    const overflow = filterEligible({
      ...baseInputs(records),
      tokenNeeds: { inputTokens: 96000, toolSchemaTokens: 1, requiredOutputTokens: 2000 },
    });
    expect(overflow[0]?.rejections).toContain('context_exceeds_safe_capacity');

    const outputOverflow = filterEligible({
      ...baseInputs(records),
      tokenNeeds: { inputTokens: 100, toolSchemaTokens: 100, requiredOutputTokens: 16000 },
    });
    expect(outputOverflow[0]?.rejections).toContain('context_exceeds_safe_capacity');
  });

  it('requires verified tool calling and structured output only when requested', () => {
    const beta = [need('cand_synthbeta002', loadFixture())];
    const toolRequest: RouteRequest = {
      ...textRequest(),
      toolSelection: { enabled: true, catalog: [] },
    };
    expect(filterEligible({ ...baseInputs(beta), request: toolRequest })[0]?.rejections).toContain(
      'tool_calling_not_verified',
    );

    const local = [need('cand_synthlocal03', loadFixture())];
    const schemaRequest: RouteRequest = {
      ...textRequest(),
      outputSchema: { type: 'object' },
    };
    expect(
      filterEligible({ ...baseInputs(local), request: schemaRequest })[0]?.rejections,
    ).toContain('structured_output_not_verified');
  });

  it('rejects candidates outside the allowed egress overlap', () => {
    const records = [need('cand_synthalpha01', loadFixture())];
    const verdicts = filterEligible({
      ...baseInputs(records),
      policy: {
        ...permissivePolicy(),
        egress: { regions: ['nowhere-1'], providers: ['synthetic-hosted-alpha'] },
      },
    });
    expect(verdicts[0]?.rejections).toContain('endpoint_not_permitted');
  });

  it('rejects future-dated prices and fully expired evidence', () => {
    const records = [need('cand_synthalpha01', loadFixture())];
    const future = filterEligible({
      ...baseInputs(records),
      nowMs: Date.parse('2026-01-01T00:00:00Z'),
    });
    expect(future[0]?.rejections).toContain('price_not_effective');

    const stale = need('cand_synthalpha01', loadFixture());
    for (const record of stale.evidence) record.expiresAt = '2026-01-01T00:00:00Z';
    const verdicts = filterEligible({ ...baseInputs([stale]) });
    expect(verdicts[0]?.rejections).toContain('evidence_stale');
  });

  it('rejects missing measurements explicitly instead of guessing quality', () => {
    const records = [need('cand_synthalpha01', loadFixture())];
    const verdicts = filterEligible({ ...baseInputs(records), measurements: {} });
    expect(verdicts[0]?.eligible).toBe(false);
    expect(verdicts[0]?.rejections).toContain('insufficient_evidence');
  });

  it('enforces reliability and latency floors from measurements', () => {
    const records = [need('cand_synthalpha01', loadFixture())];
    const unreliable = filterEligible({
      ...baseInputs(records),
      measurements: { cand_synthalpha01: { ...fullMeasurements(), successRate: '0.5' } },
    });
    expect(unreliable[0]?.rejections).toContain('reliability_below_floor');

    const slow = filterEligible({
      ...baseInputs(records),
      measurements: { cand_synthalpha01: { ...fullMeasurements(), p99Ms: 99999 } },
    });
    expect(slow[0]?.rejections).toContain('latency_above_limit');
  });

  it('records every rejection instead of stopping at the first', () => {
    const records = [need('cand_synthalpha01', loadFixture())];
    const verdicts = filterEligible({
      ...baseInputs(records),
      policy: { ...permissivePolicy(), deniedCandidates: ['cand_synthalpha01'] },
      measurements: {},
    });
    expect(verdicts[0]?.eligible).toBe(false);
    expect(verdicts[0]?.rejections.length ?? 0).toBeGreaterThan(1);
  });
});

/** Deterministic PRNG for property tests. Fixed seed: reproducible runs. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STATES: CapabilityState[] = ['unknown', 'verified', 'unsupported'];
const RATE_LADDER = ['0.5', '0.9', '0.99', '0.999', '1'];

describe('eligibility properties', () => {
  it('never adds candidates when a hard requirement tightens', () => {
    const rng = mulberry32(0xc10c);
    const fixture = loadFixture();
    for (let iter = 0; iter < 200; iter += 1) {
      const pick = (n: number): number => Math.floor(rng() * n);
      const count = 1 + pick(3);
      const candidates: CandidateProfile[] = [];
      for (let i = 0; i < count; i += 1) {
        const source = fixture[pick(fixture.length)];
        if (source) candidates.push(structuredClone(source));
      }
      const ids = candidates.map((c) => c.candidateId);
      const base: EligibilityInputs = {
        request: textRequest(),
        candidates,
        policy: {
          ...permissivePolicy(),
          allowlist: rng() < 0.5 ? [] : ids.filter(() => rng() < 0.5),
          deniedCandidates: ids.filter(() => rng() < 0.2),
          reliability: { minSuccessRate: RATE_LADDER[pick(RATE_LADDER.length)] ?? '0.99' },
          latency: { maxP99Ms: [1000, 30000, 60000][pick(3)] ?? 30000 },
        },
        tokenNeeds: {
          inputTokens: pick(200000),
          toolSchemaTokens: pick(20000),
          requiredOutputTokens: pick(20000),
        },
        measurements: Object.fromEntries(
          ids.map((id): [string, CandidateMeasurements] => [
            id,
            rng() < 0.2
              ? {}
              : {
                  qualityLowerBound: '0.9',
                  successRate: RATE_LADDER[pick(RATE_LADDER.length)] ?? '0.9',
                  p99Ms: [100, 5000, 40000, 99999][pick(4)] ?? 100,
                },
          ]),
        ),
        nowMs: NOW_MS,
      };
      const before = new Set(
        filterEligible(base)
          .filter((v) => v.eligible)
          .map((v) => v.candidateId),
      );

      const tightened = structuredClone(base.policy);
      const ops = 1 + pick(2);
      for (let o = 0; o < ops; o += 1) {
        const op = pick(6);
        if (op === 0) {
          tightened.allowlist =
            tightened.allowlist.length === 0
              ? [ids[pick(ids.length)] ?? ids[0] ?? '']
              : tightened.allowlist.slice(1);
        } else if (op === 1) {
          const extra = ids[pick(ids.length)] ?? '';
          tightened.deniedCandidates = [...(tightened.deniedCandidates ?? []), extra];
        } else if (op === 2) {
          const idx = RATE_LADDER.indexOf(tightened.reliability.minSuccessRate);
          if (idx >= 0 && idx < RATE_LADDER.length - 1) {
            tightened.reliability = { minSuccessRate: RATE_LADDER[idx + 1] ?? '1' };
          }
        } else if (op === 3) {
          tightened.latency = { maxP99Ms: Math.floor(tightened.latency.maxP99Ms / 2) };
        }
      }
      const tightMeasurements = { ...base.measurements };
      if (ops >= 2) {
        const victim = candidates[pick(candidates.length)];
        if (victim) delete tightMeasurements[victim.candidateId];
      }
      const tightInputs: EligibilityInputs = {
        ...base,
        policy: tightened,
        measurements: tightMeasurements,
      };
      const after = new Set(
        filterEligible(tightInputs)
          .filter((v) => v.eligible)
          .map((v) => v.candidateId),
      );
      for (const id of after) {
        expect(before.has(id), `iteration ${iter}: ${id} gained by tightening`).toBe(true);
      }
    }
  });

  it('never passes unknown or unsupported hard capabilities under fuzz', () => {
    const rng = mulberry32(0xf422);
    const fixture = loadFixture();
    const base = fixture[0];
    if (!base) throw new Error('fixture empty');
    const MODALITIES = ['text', 'image', 'audio', 'video', 'file'] as const;
    for (let iter = 0; iter < 200; iter += 1) {
      const candidate = structuredClone(base);
      for (const key of MODALITIES) {
        candidate.modalities[key] = STATES[Math.floor(rng() * STATES.length)] ?? 'unknown';
      }
      const requiredCount = 1 + Math.floor(rng() * 2);
      const required = [...MODALITIES].sort(() => rng() - 0.5).slice(0, requiredCount);
      const [head, ...rest] = required.map((modality): ContentBlock => {
        if (modality === 'text') return { type: 'text', text: 'hi' };
        return { type: modality, source: { ref: 'fuzz/1' } } as ContentBlock;
      });
      if (head === undefined) throw new Error('unreachable: required is non-empty');
      const request: RouteRequest = {
        ...textRequest(),
        messages: [{ role: 'user', content: [head, ...rest] }],
      };
      const [verdict] = filterEligible({
        ...baseInputs([candidate]),
        request,
        measurements: { [candidate.candidateId]: fullMeasurements() },
      });
      const allVerified = required.every((m) => candidate.modalities[m] === 'verified');
      expect(verdict?.eligible).toBe(allVerified);
      if (!allVerified) expect(verdict?.rejections).toContain('modality_not_verified');
    }
  });
});
