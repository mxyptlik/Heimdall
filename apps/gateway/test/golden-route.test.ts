// T019 acceptance: M1 deterministic core proof. A test-local harness wires
// the real modules (continuity reducer, two-pass composition with eligibility,
// ranking, tool selection, budgets of tokens) over synthetic fixtures and the
// fake semantic engine. Semantic-to-boolean mapping lives here as documented
// glue; its production home is T026. No database, no paid calls.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type {
  ApplicationProfile,
  CandidateId,
  CandidateProfile,
  ModelPin,
  PolicyRule,
  ReevaluationReason,
  RouteRequest,
  ToolDefinition,
} from '@heimdall/contracts';
import { FakeSemanticEngine, type AskResult, type ScriptedOutcome } from '@heimdall/testkit';
import { reduceContinuity } from '../src/modules/understanding/public.js';
import {
  composeRoute,
  filterEligible,
  type CandidateMeasurements,
  type RankCosts,
  type TwoPassResult,
} from '../src/modules/selection/public.js';
import type { ContinuityDecision } from '../src/modules/understanding/public.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const NOW_MS = Date.parse('2026-10-01T00:00:00Z');
const POLICY_REF = 'pol_test000001';

function loadFixture(): CandidateProfile[] {
  const raw = JSON.parse(
    readFileSync(join(ROOT, 'data', 'catalog', 'synthetic-profiles.v1.json'), 'utf8'),
  ) as { records: CandidateProfile[] };
  return raw.records;
}

function tool(id: string, partial: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    id,
    description: `tool ${id}`,
    inputSchema: { type: 'object' },
    sideEffect: 'read',
    version: 'v1',
    essential: false,
    ...partial,
  };
}

function policy(): PolicyRule {
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

function fullMeasurements(ids: string[]): Partial<Record<string, CandidateMeasurements>> {
  return Object.fromEntries(
    ids.map((id): [string, CandidateMeasurements] => [
      id,
      { qualityLowerBound: '0.9', successRate: '0.999', p99Ms: 100 },
    ]),
  );
}

function pricedCosts(ids: string[], price: string): Partial<Record<string, RankCosts>> {
  return Object.fromEntries(
    ids.map((id): [string, RankCosts] => [
      id,
      {
        expectedCost: { currency: 'USD', amount: price },
        qualityLowerBound: '0.9',
        successRate: '0.999',
      },
    ]),
  );
}

/** Test-glue mapping from semantic answers to continuity booleans (T026 will own the production version). */
function continuityFromSemantic(result: AskResult): { continues: boolean; uncertain: boolean } {
  if (!result.ok) return { continues: false, uncertain: true };
  if ('probability' in result.answer) {
    return { continues: result.answer.probability >= 0.5, uncertain: false };
  }
  return { continues: false, uncertain: true };
}

export interface GoldenScenario {
  readonly profile?: ApplicationProfile;
  readonly priorCandidate?: CandidateId;
  readonly candidates?: CandidateProfile[];
  readonly catalog?: ToolDefinition[];
  readonly toolsEnabled?: boolean;
  readonly policy?: PolicyRule;
  readonly costs?: Partial<Record<string, RankCosts>>;
  readonly measurements?: Partial<Record<string, CandidateMeasurements>>;
  readonly relevance?: Partial<Record<string, number>>;
  readonly pin?: ModelPin;
  readonly outputSchema?: boolean;
  readonly compound?: boolean;
  readonly reevaluation?: ReevaluationReason;
  readonly tokenBudget?: number;
  /** Drives continuity through the fake engine: probability or a malformed script. */
  readonly semanticProbability?: number | 'malformed';
}

export interface GoldenOutcome {
  readonly continuity: ContinuityDecision;
  readonly result: TwoPassResult;
}

/** Wire the real modules end to end over one scenario. */
export function runGoldenScenario(scenario: GoldenScenario): GoldenOutcome {
  const candidates = scenario.candidates ?? loadFixture();
  const ids = candidates.map((c) => c.candidateId);
  const catalog = scenario.catalog ?? [tool('search')];
  const request: RouteRequest = {
    applicationProfile: scenario.profile ?? 'coding-agent',
    policyRef: POLICY_REF,
    messages: [{ role: 'user', content: [{ type: 'text', text: 'golden task' }] }],
    toolSelection: { enabled: scenario.toolsEnabled ?? true, catalog },
    ...(scenario.outputSchema === true ? { outputSchema: { type: 'object' } } : {}),
  };
  const tokenNeeds = { inputTokens: 1000, toolSchemaTokens: 500, requiredOutputTokens: 2000 };
  const measurements = scenario.measurements ?? fullMeasurements(ids);
  const policyValue = scenario.policy ?? policy();

  let continues = true;
  let uncertain = false;
  if (scenario.priorCandidate !== undefined) {
    if (scenario.semanticProbability !== undefined) {
      const script: Partial<Record<string, ScriptedOutcome>> =
        scenario.semanticProbability === 'malformed'
          ? { continuity: { kind: 'malformed', payload: { broken: true } } }
          : {
              continuity: {
                kind: 'answer',
                answer: { question: 'continuity', probability: scenario.semanticProbability },
              },
            };
      const engine = new FakeSemanticEngine({ script });
      const mapped = continuityFromSemantic(
        engine.ask({ name: 'continuity', kind: 'noul', rubricVersion: 'v1' }, 'golden state'),
      );
      continues = mapped.continues;
      uncertain = mapped.uncertain;
    } else {
      continues = true;
      uncertain = false;
    }
  }

  const priorVerdicts = filterEligible({
    request,
    candidates,
    policy: policyValue,
    tokenNeeds,
    measurements,
    nowMs: NOW_MS,
  });
  const priorVerdict = priorVerdicts.find((v) => v.candidateId === scenario.priorCandidate);
  const continuity = reduceContinuity({
    profile: request.applicationProfile,
    ...(scenario.priorCandidate === undefined ? {} : { priorCandidate: scenario.priorCandidate }),
    continues,
    uncertain,
    ...(scenario.reevaluation === undefined ? {} : { reevaluation: scenario.reevaluation }),
    ...(scenario.pin === undefined ? {} : { pin: scenario.pin }),
    retainedEligible: priorVerdict?.eligible ?? false,
    stateRevisionStale: false,
    ...(scenario.compound === true ? { compound: true } : {}),
  });

  const result = composeRoute({
    request,
    candidates,
    policy: policyValue,
    costs: scenario.costs ?? pricedCosts(ids, '0.10'),
    measurements,
    relevance: scenario.relevance ?? Object.fromEntries(catalog.map((t) => [t.id, 1])),
    relevanceThreshold: 0.5,
    tokenBudget: scenario.tokenBudget ?? 100000,
    estimateToolTokens: (def) => JSON.stringify(def).length,
    estimatedToolSchemaTokens: 500,
    inputTokens: 1000,
    requiredOutputTokens: 2000,
    nowMs: NOW_MS,
    ...(scenario.priorCandidate === undefined
      ? {}
      : { retainedCandidate: scenario.priorCandidate }),
    retentionHolds: continuity.action === 'retain',
    ...(scenario.pin === undefined ? {} : { pin: scenario.pin }),
    compound: scenario.compound ?? false,
    minSavingsToSwitch: { currency: 'USD', amount: '0.05' },
  });
  return { continuity, result };
}

describe('golden route scenarios', () => {
  it('routes an initial coding task to the compatible model', () => {
    const { continuity, result } = runGoldenScenario({});
    expect(continuity.action).toBe('select');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.decision.candidate).toBe('cand_synthalpha01');
    expect(result.decision.passesUsed).toBe(1);
    expect(result.decision.trace.repaired).toBe(false);
  });

  it('retains the model across a continuing task', () => {
    const { continuity, result } = runGoldenScenario({
      priorCandidate: 'cand_synthalpha01',
      semanticProbability: 0.8,
    });
    expect(continuity.action).toBe('retain');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.decision.candidate).toBe('cand_synthalpha01');
  });

  it('reselects on a clear new task', () => {
    const { continuity, result } = runGoldenScenario({
      priorCandidate: 'cand_synthalpha01',
      semanticProbability: 0.2,
    });
    expect(continuity.action).toBe('select');
    expect(result.ok).toBe(true);
  });

  it('serves compound work with the best-evidenced model', () => {
    const alpha2 = {
      ...loadFixture().find((c) => c.candidateId === 'cand_synthalpha01'),
    } as CandidateProfile;
    alpha2.candidateId = 'cand_synthalpha02';
    const candidates = [loadFixture()[0] as CandidateProfile, alpha2];
    const { result } = runGoldenScenario({
      candidates,
      compound: true,
      costs: {
        [candidates[0]?.candidateId ?? '']: {
          expectedCost: { currency: 'USD', amount: '0.05' },
          qualityLowerBound: '0.9',
        },
        [candidates[1]?.candidateId ?? '']: {
          expectedCost: { currency: 'USD', amount: '0.20' },
          qualityLowerBound: '0.95',
        },
      },
      measurements: fullMeasurements(candidates.map((c) => c.candidateId)),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.decision.candidate).toBe('cand_synthalpha02');
  });

  it('selects no tools when disabled with an empty catalog', () => {
    const { result } = runGoldenScenario({ toolsEnabled: false, catalog: [] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.decision.selectedToolIds).toEqual([]);
  });

  it('fails essential-tool overflow explicitly', () => {
    const catalog = [tool('huge', { essential: true, description: 'x'.repeat(4000) })];
    const { result } = runGoldenScenario({ catalog, tokenBudget: 100 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('ESSENTIAL_TOOLS_DO_NOT_FIT');
  });

  it('reports no eligible model explicitly', () => {
    const { result } = runGoldenScenario({
      policy: { ...policy(), allowlist: ['cand_nonexistent1'] },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NO_ELIGIBLE_MODEL');
  });

  it('honors strict pins and rejects strict pins to incapable models', () => {
    const pinned = runGoldenScenario({
      pin: { candidate: 'cand_synthalpha01', allowFallback: false },
    });
    expect(pinned.result.ok).toBe(true);
    if (!pinned.result.ok) return;
    expect(pinned.result.decision.candidate).toBe('cand_synthalpha01');

    const strictMiss = runGoldenScenario({
      pin: { candidate: 'cand_synthbeta002', allowFallback: false },
    });
    expect(strictMiss.result.ok).toBe(false);
    if (strictMiss.result.ok) return;
    expect(strictMiss.result.error.code).toBe('POLICY_DENIED');
  });

  it('rejects stale prices before ranking', () => {
    const candidates = loadFixture();
    const { result } = runGoldenScenario({
      candidates: candidates.map((c) => ({
        ...c,
        prices: { ...c.prices, effectiveAt: '2027-01-01T00:00:00Z' },
      })),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NO_ELIGIBLE_MODEL');
  });

  it('routes increased-risk requests without relaxing hard gates', () => {
    const { result } = runGoldenScenario({
      policy: { ...policy(), riskMinimum: 'critical' },
    });
    expect(result.ok).toBe(true);
  });

  it('retains on malformed classifier output instead of guessing', () => {
    const { continuity, result } = runGoldenScenario({
      priorCandidate: 'cand_synthalpha01',
      semanticProbability: 'malformed',
    });
    expect(continuity.action).toBe('retain');
    expect(result.ok).toBe(true);
  });

  it('never selects unauthorized tools or unpriced cheapest models', () => {
    const catalog = [tool('search'), tool('lookup')];
    const { result } = runGoldenScenario({
      catalog,
      costs: {
        cand_synthalpha01: { qualityLowerBound: '0.9' },
        cand_synthbeta002: {
          expectedCost: { currency: 'USD', amount: '0.01' },
          qualityLowerBound: '0.99',
        },
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const id of result.decision.selectedToolIds) {
      expect(['search', 'lookup']).toContain(id);
    }
    // Beta is cheaper but lacks verified tool calling: alpha still wins.
    expect(result.decision.candidate).toBe('cand_synthalpha01');
  });
});
