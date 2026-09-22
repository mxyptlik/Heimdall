// T017 acceptance: exact replay orders; failure before/after commitment;
// unknown billing on disconnect; cancellation conservatism; model mismatch
// surfacing; redacted recordings; test-only identity.
import { describe, expect, it } from 'vitest';
import type { RouteRequest, StreamEvent } from '@heimdall/contracts';
import {
  createFakeClock,
  createSeededRandom,
  isTestOnlyProvider,
  runFakeScenario,
  TESTKIT_PROVIDER_ID,
  type FakeInvokeRequest,
  type FakeScenario,
} from '../src/index.js';

const ATTEMPT = 'att_fixture101';

function invokeRequest(): FakeInvokeRequest {
  const request: RouteRequest = {
    applicationProfile: 'chat',
    policyRef: 'pol_test000001',
    messages: [{ role: 'user', content: [{ type: 'text', text: 'secret prompt body' }] }],
  };
  return { attemptId: ATTEMPT, candidateId: 'cand_aaaa0001', toolIds: ['search'], request };
}

function textEvents(): StreamEvent[] {
  return [
    { attempt: ATTEMPT, seq: 0, kind: 'text', delta: 'hel' },
    { attempt: ATTEMPT, seq: 1, kind: 'text', delta: 'lo' },
    { attempt: ATTEMPT, seq: 2, kind: 'finish', reason: 'completed' },
  ];
}

describe('fake provider', () => {
  it('replays exact event orders and advances only the fake clock', () => {
    const clock = createFakeClock(1000);
    const scenario: FakeScenario = {
      name: 'ordered',
      steps: [
        { kind: 'delay', ms: 250 },
        { kind: 'events', events: textEvents() },
      ],
    };
    const result = runFakeScenario(scenario, invokeRequest(), clock);
    expect(result.events.map((e) => e.seq)).toEqual([0, 1, 2]);
    expect(result.disconnected).toBe(false);
    expect(clock.now()).toBe(1250);
  });

  it('fails before commitment with retryable certainty', () => {
    const clock = createFakeClock();
    const scenario: FakeScenario = {
      name: 'early-fail',
      steps: [
        {
          kind: 'fail',
          error: {
            code: 'PROVIDER_UNAVAILABLE',
            message: 'down',
            retryable: true,
            certainty: 'not_started',
          },
        },
      ],
    };
    const result = runFakeScenario(scenario, invokeRequest(), clock);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({ kind: 'error' });
    expect(result.disconnected).toBe(false);
  });

  it('marks disconnects uncertain without terminal events', () => {
    const clock = createFakeClock();
    const scenario: FakeScenario = {
      name: 'cut',
      steps: [
        {
          kind: 'events',
          events: [{ attempt: ATTEMPT, seq: 0, kind: 'text', delta: 'partial' }],
        },
        { kind: 'disconnect' },
      ],
      usage: { inputTokens: 10, outputTokens: 5 },
    };
    const result = runFakeScenario(scenario, invokeRequest(), clock);
    expect(result.disconnected).toBe(true);
    expect(result.events.some((e) => e.kind === 'finish' || e.kind === 'error')).toBe(false);
    expect(result.events.some((e) => e.kind === 'usage')).toBe(false);
  });

  it('cancels conservatively before dispatch', () => {
    const clock = createFakeClock();
    const scenario: FakeScenario = {
      name: 'abort',
      steps: [{ kind: 'events', events: textEvents() }],
    };
    const result = runFakeScenario(scenario, { ...invokeRequest(), aborted: true }, clock);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      kind: 'error',
      error: { code: 'CANCELLED', certainty: 'possibly_started' },
    });
  });

  it('surfaces actual-model mismatch instead of relabelling', () => {
    const clock = createFakeClock();
    const scenario: FakeScenario = {
      name: 'mismatch',
      steps: [
        { kind: 'mismatch', actual: { provider: 'synthetic-hosted-beta', model: 'other-model' } },
        { kind: 'events', events: textEvents() },
      ],
    };
    const result = runFakeScenario(scenario, invokeRequest(), clock);
    expect(result.actualModel).toEqual({ provider: 'synthetic-hosted-beta', model: 'other-model' });
  });

  it('replays fragmented tool arguments in order', () => {
    const clock = createFakeClock();
    const events: StreamEvent[] = [
      { attempt: ATTEMPT, seq: 0, kind: 'tool_call', callId: 'c1', argumentsFragment: '{"a":' },
      { attempt: ATTEMPT, seq: 1, kind: 'tool_call', callId: 'c1', argumentsFragment: '1}' },
      { attempt: ATTEMPT, seq: 2, kind: 'finish', reason: 'completed' },
    ];
    const result = runFakeScenario(
      { name: 'fragments', steps: [{ kind: 'events', events }] },
      invokeRequest(),
      clock,
    );
    expect(result.events.map((e) => e.seq)).toEqual([0, 1, 2]);
  });

  it('redacts raw prompt text from recordings', () => {
    const clock = createFakeClock(7);
    const result = runFakeScenario({ name: 'rec', steps: [] }, invokeRequest(), clock);
    expect(result.recorded.atMs).toBe(7);
    expect(result.recorded.toolIds).toEqual(['search']);
    expect(result.recorded.messages).toEqual([
      { role: 'user', blocks: [{ type: 'text', chars: 18 }] },
    ]);
    expect(JSON.stringify(result.recorded)).not.toContain('secret prompt body');
  });

  it('stays namespaced and private so production can never select it', () => {
    expect(TESTKIT_PROVIDER_ID).toBe('testkit-fake');
    expect(isTestOnlyProvider(TESTKIT_PROVIDER_ID)).toBe(true);
    expect(isTestOnlyProvider('testkit-local-loop')).toBe(true);
    expect(isTestOnlyProvider('synthetic-hosted-alpha')).toBe(false);
  });

  it('drives the fake clock without real timers', () => {
    const clock = createFakeClock();
    clock.advance(50);
    expect(clock.now()).toBe(50);
    expect(() => clock.advance(-1)).toThrow();
  });

  it('reproduces seeded randomness deterministically', () => {
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(createSeededRandom(43)()).not.toBe(createSeededRandom(42)());
  });
});
