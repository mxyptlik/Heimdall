// Normalized stream-event helpers (T006). Commitment is conservative: any
// externally emitted assistant, reasoning, or tool-call content — including
// tool argument fragments — commits the attempt. After commitment the gateway
// never splices another model into the same answer. Terminal sequencing,
// retry, and fallback belong to later invocation tasks.
import type { StreamEvent } from './generated/types.js';

/** True when the event is caller-visible content and commits the attempt. */
export function isCommitEvent(event: StreamEvent): boolean {
  return event.kind === 'text' || event.kind === 'reasoning' || event.kind === 'tool_call';
}

/** True for terminal events: exactly one closes an attempt. */
export function isTerminalEvent(event: StreamEvent): boolean {
  return event.kind === 'finish' || event.kind === 'error';
}

/** Sequence numbers of the first commit event, or null when uncommitted. */
export function firstCommitSeq(events: StreamEvent[]): number | null {
  for (const event of events) {
    if (isCommitEvent(event)) return event.seq;
  }
  return null;
}
