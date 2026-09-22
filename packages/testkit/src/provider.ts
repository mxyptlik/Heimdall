// Deterministic fake provider and stream harness (T017). Scripted scenarios
// replay exact event orders for keyless SDK, connector, and invocation tests:
// text/tool streams, usage, errors, delays, disconnects, cancellation, and
// actual-model mismatch. Requests are recorded with raw prompt text redacted
// to block lengths. This package is private and test-only: its provider id is
// namespaced so it can never be selected as a production provider.
import type {
  ActualModel,
  AttemptId,
  CandidateId,
  HeimdallError,
  RouteRequest,
  StreamEvent,
  UsageRecord,
} from '@heimdall/contracts';
import type { FakeClock } from './clock.js';

/** Namespaced test-only provider identity. Never a production route. */
export const TESTKIT_PROVIDER_ID = 'testkit-fake';

export function isTestOnlyProvider(provider: string): boolean {
  return provider === TESTKIT_PROVIDER_ID || provider.startsWith('testkit-');
}

export type StreamStep =
  | { readonly kind: 'events'; readonly events: StreamEvent[] }
  | { readonly kind: 'fail'; readonly error: HeimdallError }
  | { readonly kind: 'disconnect' }
  | { readonly kind: 'mismatch'; readonly actual: ActualModel }
  | { readonly kind: 'delay'; readonly ms: number };

export interface FakeScenario {
  readonly name: string;
  readonly steps: StreamStep[];
  readonly usage?: UsageRecord;
}

export interface FakeInvokeRequest {
  readonly attemptId: AttemptId;
  readonly candidateId: CandidateId;
  readonly toolIds: string[];
  readonly request: RouteRequest;
  /** Pre-dispatch abort. Conservative certainty: possibly_started. */
  readonly aborted?: boolean;
}

export interface RedactedMessage {
  readonly role: string;
  readonly blocks: { type: string; chars: number }[];
}

export interface RecordedRequest {
  readonly scenario: string;
  readonly attemptId: AttemptId;
  readonly candidateId: CandidateId;
  readonly toolIds: string[];
  readonly messages: RedactedMessage[];
  readonly atMs: number;
}

export interface FakeRunResult {
  readonly events: StreamEvent[];
  readonly recorded: RecordedRequest;
  readonly actualModel: ActualModel;
  /** True when the stream ended without a terminal event. */
  readonly disconnected: boolean;
}

function redactMessages(request: RouteRequest): RedactedMessage[] {
  return request.messages.map((message) => ({
    role: message.role,
    blocks: message.content.map((block) => {
      if (block.type === 'text') return { type: 'text', chars: block.text.length };
      if (block.type === 'mixed') {
        return { type: 'mixed', chars: block.parts.length };
      }
      return { type: block.type, chars: 0 };
    }),
  }));
}

/**
 * Run one scripted attempt synchronously. Delays advance the fake clock;
 * nothing waits on real timers. Event order replays exactly as scripted.
 */
export function runFakeScenario(
  scenario: FakeScenario,
  invoke: FakeInvokeRequest,
  clock: FakeClock,
  provider: string = TESTKIT_PROVIDER_ID,
): FakeRunResult {
  const recorded: RecordedRequest = {
    scenario: scenario.name,
    attemptId: invoke.attemptId,
    candidateId: invoke.candidateId,
    toolIds: [...invoke.toolIds],
    messages: redactMessages(invoke.request),
    atMs: clock.now(),
  };
  if (invoke.aborted === true) {
    const error: HeimdallError = {
      code: 'CANCELLED',
      message: 'aborted before dispatch',
      retryable: false,
      certainty: 'possibly_started',
    };
    return {
      events: [{ attempt: invoke.attemptId, seq: 0, kind: 'error', error }],
      recorded,
      actualModel: { provider, model: invoke.candidateId },
      disconnected: false,
    };
  }

  const events: StreamEvent[] = [];
  let actualModel: ActualModel = { provider, model: invoke.candidateId };
  let disconnected = false;
  let terminal = false;
  let maxSeq = -1;
  const nextSeq = (): number => {
    maxSeq += 1;
    return maxSeq;
  };
  for (const step of scenario.steps) {
    if (step.kind === 'events') {
      for (const event of step.events) {
        events.push(event);
        if (event.seq > maxSeq) maxSeq = event.seq;
        if (event.kind === 'finish' || event.kind === 'error') terminal = true;
      }
    } else if (step.kind === 'fail') {
      events.push({ attempt: invoke.attemptId, seq: nextSeq(), kind: 'error', error: step.error });
      terminal = true;
      break;
    } else if (step.kind === 'disconnect') {
      disconnected = true;
      break;
    } else if (step.kind === 'mismatch') {
      actualModel = step.actual;
    } else {
      clock.advance(step.ms);
    }
  }
  if (scenario.usage && !disconnected && !terminal) {
    events.push({
      attempt: invoke.attemptId,
      seq: nextSeq(),
      kind: 'usage',
      usage: scenario.usage,
    });
  }
  return { events, recorded, actualModel, disconnected };
}
