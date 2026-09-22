// Deterministic fake clock (T017). Time advances only when tests say so:
// delays consume fake milliseconds without real timers, keeping keyless
// suites fast and reproducible.
export interface FakeClock {
  now(): number;
  advance(ms: number): void;
}

export function createFakeClock(startMs = 0): FakeClock {
  if (!Number.isInteger(startMs) || startMs < 0) {
    throw new Error('fake clock starts at a non-negative integer');
  }
  let nowMs = startMs;
  return {
    now: () => nowMs,
    advance: (ms: number) => {
      if (!Number.isInteger(ms) || ms < 0)
        throw new Error('fake clock advances by non-negative integers');
      nowMs += ms;
    },
  };
}
