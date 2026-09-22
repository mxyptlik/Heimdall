// T006 acceptance: adapter contract fixtures for interleaved tool calls,
// empty finish, late usage, malformed frames, abort, provider error, and
// tool deltas as commit events.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { StreamEvent } from '../src/index.js';
import { firstCommitSeq, isCommitEvent, isTerminalEvent } from '../src/stream.js';
import { validatorFor } from '../src/validate.js';

const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'invocation');

interface StreamFixture {
  name: string;
  description: string;
  events: unknown[];
  valid: boolean;
  firstCommitSeq: number | null;
}

function loadFixtures(): { file: string; fixture: StreamFixture }[] {
  return readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => ({
      file,
      fixture: JSON.parse(readFileSync(join(FIXTURE_DIR, file), 'utf8')) as StreamFixture,
    }));
}

describe('invocation fixtures', () => {
  it('covers every required adapter scenario', () => {
    const names = loadFixtures().map(({ fixture }) => fixture.name);
    for (const required of [
      'interleaved-tool-calls',
      'empty-finish',
      'late-usage',
      'malformed-frames',
      'abort',
      'provider-error',
      'tool-delta-commit',
    ]) {
      expect(names).toContain(required);
    }
  });

  it.each(loadFixtures().map(({ file, fixture }) => [file, fixture] as const))(
    'fixture %s validates as documented',
    (_file, fixture) => {
      const validate = validatorFor('streamEvent');
      const results = fixture.events.map((e) => validate(e));
      if (fixture.valid) {
        expect(results.every(Boolean)).toBe(true);
        const events = fixture.events as StreamEvent[];
        expect(firstCommitSeq(events)).toBe(fixture.firstCommitSeq);
        expect(events.filter(isTerminalEvent).length).toBeLessThanOrEqual(1);
      } else {
        expect(results.some((r) => !r)).toBe(true);
      }
    },
  );

  it('ends the abort fixture committed but unterminated', () => {
    const abort = loadFixtures().find(({ fixture }) => fixture.name === 'abort');
    if (!abort) throw new Error('abort fixture missing');
    const events = abort.fixture.events as StreamEvent[];
    expect(firstCommitSeq(events)).toBe(0);
    expect(events.some(isTerminalEvent)).toBe(false);
  });

  it('orders late usage after the finish event', () => {
    const late = loadFixtures().find(({ fixture }) => fixture.name === 'late-usage');
    if (!late) throw new Error('late-usage fixture missing');
    const events = late.fixture.events as StreamEvent[];
    const finishSeq = events.find((e) => e.kind === 'finish')?.seq;
    const usageSeq = events.find((e) => e.kind === 'usage')?.seq;
    expect(finishSeq).toBeDefined();
    expect(usageSeq).toBeDefined();
    if (finishSeq !== undefined && usageSeq !== undefined) {
      expect(usageSeq).toBeGreaterThan(finishSeq);
    }
  });

  it('treats every tool-call delta as a commit event', () => {
    const validate = validatorFor('streamEvent');
    const fragment = {
      attempt: 'att_fixture007',
      seq: 0,
      kind: 'tool_call',
      callId: 'call-9',
      argumentsFragment: '{"par',
    };
    expect(validate(fragment)).toBe(true);
    expect(isCommitEvent(fragment as StreamEvent)).toBe(true);
  });
});
