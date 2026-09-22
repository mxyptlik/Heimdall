// T005 acceptance: native request/result shapes; empty-tools vs disabled are
// distinct; caller state carries no permissions; no task identifiers;
// explicit pins and request-only chat/RAG fixtures work.
import { describe, expect, it } from 'vitest';
import type { Message, RouteRequest, ToolDefinition } from '../src/index.js';
import { validatorFor } from '../src/validate.js';

const isValid = (def: string, data: unknown): boolean => validatorFor(def)(data);

const POLICY = 'pol_test000001';
const PIN = 'cand_aaaa0001';

function textMessage(text: string): Message {
  return { role: 'user', content: [{ type: 'text', text }] };
}

function tool(id: string, essential = false): ToolDefinition {
  return {
    id,
    description: `Test tool ${id}`,
    inputSchema: { type: 'object', properties: { q: { type: 'string' } } },
    sideEffect: 'read',
    version: 'v1',
    essential,
  };
}

function chatRequest(): RouteRequest {
  return {
    applicationProfile: 'chat',
    policyRef: POLICY,
    messages: [textMessage('hello')],
  };
}

describe('routeRequest', () => {
  it('accepts a request-only chat fixture with no tools or state', () => {
    expect(isValid('routeRequest', chatRequest())).toBe(true);
  });

  it('accepts a RAG fixture with file context and no tool selection', () => {
    expect(
      isValid('routeRequest', {
        applicationProfile: 'rag',
        policyRef: POLICY,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'summarize' },
              { type: 'file', source: { ref: 'docs/spec.pdf' } },
            ],
          },
        ],
      }),
    ).toBe(true);
  });

  it('accepts a coding-agent continuation with state, pin, and reevaluation', () => {
    expect(
      isValid('routeRequest', {
        applicationProfile: 'coding-agent',
        policyRef: POLICY,
        messages: [textMessage('continue')],
        routingState: {
          stateVersion: 'v1',
          priorCandidate: PIN,
          objective: 'fix login bug',
          parentRevision: 'r3',
        },
        modelPin: { candidate: PIN, allowFallback: false },
        reevaluation: { reason: 'no_progress' },
        budget: { hardCap: { currency: 'USD', amount: '10.00' } },
        deadlineMs: 60000,
      }),
    ).toBe(true);
  });

  it('rejects tenant and task identifiers in the body', () => {
    for (const field of ['tenantId', 'tenant_id', 'taskId', 'task_id', 'taskID']) {
      expect(isValid('routeRequest', { ...chatRequest(), [field]: 'x' })).toBe(false);
    }
  });

  it('rejects empty messages and unknown roles', () => {
    expect(isValid('routeRequest', { ...chatRequest(), messages: [] })).toBe(false);
    expect(
      isValid('routeRequest', {
        ...chatRequest(),
        messages: [{ role: 'robot', content: [{ type: 'text', text: 'hi' }] }],
      }),
    ).toBe(false);
  });
});

describe('toolSelection semantics', () => {
  it('treats disabled selection without a catalog as valid', () => {
    expect(isValid('routeRequest', { ...chatRequest(), toolSelection: { enabled: false } })).toBe(
      true,
    );
  });

  it('treats disabled selection with a catalog as pass-through', () => {
    expect(
      isValid('routeRequest', {
        ...chatRequest(),
        toolSelection: { enabled: false, catalog: [tool('search')] },
      }),
    ).toBe(true);
  });

  it('accepts enabled selection with an explicit empty catalog', () => {
    expect(
      isValid('routeRequest', { ...chatRequest(), toolSelection: { enabled: true, catalog: [] } }),
    ).toBe(true);
  });

  it('rejects enabled selection without a catalog', () => {
    expect(isValid('routeRequest', { ...chatRequest(), toolSelection: { enabled: true } })).toBe(
      false,
    );
  });

  it('validates catalog entries strictly', () => {
    expect(
      isValid('toolSelection', {
        enabled: true,
        catalog: [{ ...tool('search'), sideEffect: 'execute' }],
      }),
    ).toBe(false);
    expect(
      isValid('toolSelection', {
        enabled: true,
        catalog: [{ ...tool('search'), taskId: 't1' }],
      }),
    ).toBe(false);
  });
});

describe('routingState', () => {
  it('rejects smuggled permissions, policy, and tenant identity', () => {
    const base = { stateVersion: 'v1', objective: 'x' };
    for (const smuggled of [
      { allowlist: [] },
      { policy: {} },
      { permissions: ['read'] },
      { tenantId: 'ten_x' },
      { taskId: 't1' },
    ]) {
      expect(isValid('routingState', { ...base, ...smuggled })).toBe(false);
    }
  });

  it('accepts minimal and full advisory state', () => {
    expect(isValid('routingState', { stateVersion: 'v1', objective: 'x' })).toBe(true);
    expect(
      isValid('routingState', {
        stateVersion: 'v1',
        priorCandidate: PIN,
        objective: 'x',
        evidenceRefs: ['e1'],
        parentRevision: 'r1',
      }),
    ).toBe(true);
  });
});

describe('routeResult', () => {
  it('accepts a complete result and rejects missing decision metadata', () => {
    const result = {
      decisionId: 'dec_test00001',
      candidateId: PIN,
      selectedToolIds: ['search'],
      rankedFallbacks: [] as string[],
      reasonCodes: ['lowest_cost'],
      dependencyVersions: { policy: POLICY, catalog: 'rev_test00001' },
      routingState: { stateVersion: 'v1', objective: 'x' },
      retention: { retained: true, reason: 'same_task' },
    };
    expect(isValid('routeResult', result)).toBe(true);
    expect(isValid('routeResult', JSON.parse(JSON.stringify(result)))).toBe(true);
    const { decisionId: _dropped, ...withoutDecision } = result;
    expect(isValid('routeResult', withoutDecision)).toBe(false);
    expect(isValid('routeResult', { ...result, reasonCodes: [] })).toBe(false);
  });
});
