// T016 acceptance: at most two passes, no recursive loop, no third semantic
// stage; essentials never silently dropped for a cheaper model.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type {
  CandidateProfile,
  PolicyRule,
  RouteRequest,
  ToolDefinition,
} from '@heimdall/contracts';
import {
  composeRoute,
  type CandidateMeasurements,
  type RankCosts,
  type TwoPassInputs,
} from '../src/modules/selection/public.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const NOW_MS = Date.parse('2026-10-01T00:00:00Z');

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

function measurementsFor(ids: string[]): Partial<Record<string, CandidateMeasurements>> {
  return Object.fromEntries(
    ids.map((id): [string, CandidateMeasurements] => [
      id,
      { qualityLowerBound: '0.9', successRate: '0.999', p99Ms: 100 },
    ]),
  );
}

function costsFor(ids: string[], price: string): Partial<Record<string, RankCosts>> {
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

function requestWith(catalog: ToolDefinition[]): RouteRequest {
  return {
    applicationProfile: 'coding-agent',
    policyRef: 'pol_test000001',
    messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
    toolSelection: { enabled: true, catalog },
  };
}

function baseInputs(candidates: CandidateProfile[], catalog: ToolDefinition[]): TwoPassInputs {
  const ids = candidates.map((c) => c.candidateId);
  return {
    request: requestWith(catalog),
    candidates,
    policy: policy(),
    costs: costsFor(ids, '0.10'),
    measurements: measurementsFor(ids),
    relevance: Object.fromEntries(catalog.map((t) => [t.id, 1])),
    relevanceThreshold: 0.5,
    tokenBudget: 100000,
    estimateToolTokens: (def) => JSON.stringify(def).length,
    estimatedToolSchemaTokens: 500,
    inputTokens: 1000,
    requiredOutputTokens: 2000,
    nowMs: NOW_MS,
    retentionHolds: false,
    compound: false,
    minSavingsToSwitch: { currency: 'USD', amount: '0.05' },
  };
}

describe('two-pass orchestration', () => {
  it('selects the cheapest compatible model in one pass', () => {
    const candidates = loadFixture().filter((c) =>
      ['cand_synthalpha01', 'cand_synthbeta002'].includes(c.candidateId),
    );
    const catalog = [tool('search')];
    const result = composeRoute(baseInputs(candidates, catalog));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.decision.passesUsed).toBe(1);
    expect(result.decision.trace.repaired).toBe(false);
    expect(result.decision.selectedToolIds).toEqual(['search']);
  });

  it('prefers a capable expensive model over a cheaper incapable one', () => {
    const candidates = loadFixture();
    const catalog = [tool('search')];
    const result = composeRoute({
      ...baseInputs(candidates, catalog),
      costs: costsFor(
        candidates.map((c) => c.candidateId),
        '0.10',
      ),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // beta lacks verified tool calling; local lacks the egress overlap.
    expect(result.decision.candidate).toBe('cand_synthalpha01');
  });

  it('repairs once by trimming non-essentials when estimates undershoot', () => {
    const candidates = loadFixture().filter((c) => c.candidateId === 'cand_synthalpha01');
    // Schema-valid definitions (description <= 4000) whose exact sum overflows
    // alpha's safe input: 24 x ~4100 + essential ~= 98550; 1000 + 98550 > 96000.
    const bulk = Array.from({ length: 24 }, (_, i) =>
      tool(`t${i}`, { description: 'x'.repeat(4000) }),
    );
    const small = tool('small', { essential: true });
    const catalog = [...bulk, small];
    const inputs = baseInputs(candidates, catalog);
    const exact = catalog.reduce((sum, def) => sum + JSON.stringify(def).length, 0);
    expect(1000 + exact).toBeGreaterThan(96000);
    expect(exact).toBeLessThanOrEqual(100000);
    const result = composeRoute({ ...inputs, estimatedToolSchemaTokens: 100 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.decision.passesUsed).toBe(2);
    expect(result.decision.trace.repaired).toBe(true);
    expect(result.decision.selectedToolIds).toEqual(['small']);
  });

  it('fails explicitly instead of dropping essentials', () => {
    const candidates = loadFixture().filter((c) => c.candidateId === 'cand_synthlocal03');
    // Ten valid essentials overflow local's 32000 safe input tokens.
    const catalog = Array.from({ length: 10 }, (_, i) =>
      tool(`e${i}`, { essential: true, description: 'x'.repeat(4000) }),
    );
    const localPolicy: PolicyRule = {
      ...policy(),
      egress: { regions: ['synthetic-local'], providers: ['synthetic-local'] },
      classifierEgress: { regions: ['synthetic-local'], providers: ['synthetic-local'] },
    };
    const result = composeRoute({
      ...baseInputs(candidates, catalog),
      policy: localPolicy,
      estimatedToolSchemaTokens: 100,
      inputTokens: 1000,
      requiredOutputTokens: 100,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('ESSENTIAL_TOOLS_DO_NOT_FIT');
  });

  it('never exceeds two passes across randomized scenarios', () => {
    let seed = 777;
    const rand = (): number => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const fixture = loadFixture();
    for (let iter = 0; iter < 100; iter += 1) {
      const count = 1 + Math.floor(rand() * 3);
      const catalog = Array.from({ length: count }, (_, i) =>
        tool(`t${i}`, { essential: rand() < 0.3 }),
      );
      const result = composeRoute({
        ...baseInputs(structuredClone(fixture), catalog),
        relevance: Object.fromEntries(catalog.map((t) => [t.id, rand()])),
        estimatedToolSchemaTokens: Math.floor(rand() * 5000),
        inputTokens: Math.floor(rand() * 50000),
      });
      if (result.ok) {
        expect([1, 2]).toContain(result.decision.passesUsed);
        for (const id of result.decision.selectedToolIds) {
          expect(catalog.some((t) => t.id === id)).toBe(true);
        }
      } else {
        expect(['NO_ELIGIBLE_MODEL', 'ESSENTIAL_TOOLS_DO_NOT_FIT']).toContain(result.error.code);
      }
    }
  });
});
