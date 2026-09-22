# Heimdall execution memory

Last updated: 2026-09-22. This file records verified progress and the reasons decisions change. It is not a claim that planned software exists.

## Read first

1. [Implementation plan](docs/implementation-plan.md): executable task cards, current status, prerequisites and acceptance criteria.
2. [System design](docs/system-design.md): modules, interfaces, invariants, diagrams and failure behavior.
3. [CONTEXT.md](CONTEXT.md): domain language and product boundary.
4. [Decision answers](docs/decision-answers.md): founder choices; [V2 backlog](docs/v2-backlog.md): preserved exclusions.

The latest explicit user decision wins over an older recommendation. Do not silently change a decision to make an implementation easier. The plan is the current task-status source; this file is its execution/evidence history. Update both after a task changes state.

## Current checkpoint

- Phase: implementation planning and document validation completed.
- Heimdall application code: not scaffolded or implemented.
- Mandatory implementation work: T001–T053, all TODO. Optional later work: T054 and T055, both TODO and disabled by default.
- Next READY task: T001 (workspace/tooling/module boundaries). After it passes, T002. The plan lists the next independent branches after their shared contracts exist.
- Active implementation owner/task: implementation engineer / T001 (workspace/tooling/module boundaries), IN_PROGRESS 2026-09-22. Do not mark a runtime task IN_PROGRESS merely because planning documents were written.
- Existing upstream reference: `deepseek-harness/`, initially pinned to `ddefc45`; verify current HEAD and working tree before connector work.
- Open setup blockers: none for keyless scaffolding. Paid evaluation, exact candidate choice, release license and credentials are handled by their explicit future tasks.
- Current web-server uptime is unknown. A successful launch was observed during setup; do not assume it is still running after a restart or new session.

## Verified work ledger

| Entry | Date | Completed work | Evidence | Limits |
| --- | --- | --- | --- | --- |
| PRE-01 | 2026-09-20–22 | Product interview, accepted recommendations and V1 exclusions recorded | `CONTEXT.md`, `docs/decision-answers.md`, `docs/v2-backlog.md` | Numerical quality/SLO values require evaluation |
| PRE-02 | 2026-09-20 | Prior complete indexed TypeSafe documentation review | `docs/research/typesafe-review.md`, source snapshots and manifest | 109 indexed pages; no live API performance validation |
| PRE-03 | 2026-09-21 | DeepSeek Harness checkout, dependencies and upstream build | Setup session: Git shallow fetch/checkout `ddefc45`; `pnpm install --frozen-lockfile` exit 0; build exit 0 and 248 client artifacts | Archive workaround was superseded by real shallow Git checkout; no Heimdall connector exists |
| PRE-04 | 2026-09-21 | DSH web startup and integration reconnaissance | Setup session launched `pnpm dsh web --no-open`; server returned auth-required/redirect responses; `docs/research/deepseek-harness-integration.md` | No paid model completion or full browser workflow claimed; do not record temporary access token here |
| PRE-05 | 2026-09-22 | Founder accepted remaining recommendations and data-source approach | Conversation approval; sources in design section 4 | Preserve explicit V2/commercial/hedging deferrals and F11/G7 stars |
| PRE-06 | 2026-09-22 | Modular-monolith system design, bottom-up implementation plan and execution-memory baseline authored | `docs/system-design.md`, `docs/implementation-plan.md`, this file | Runtime tasks are all unchecked; document checks recorded separately |

## Verification records

### V-20260922-01 — Planning artifact validation

- Scope: `docs/implementation-plan.md`, `docs/system-design.md`, `brain.md`; uncommitted documentation baseline, no Heimdall application code.
- Execution: Node ESM validation script supplied through PowerShell stdin in `C:\Users\User\Desktop\Heimdall`; used existing upstream JSDOM and Mermaid installations without installing dependencies.
- Result: exit 0; 55 unique task cards contain status, dependencies, ownership, work and acceptance evidence; all dependencies resolve and the graph is acyclic; T001 is the only dependency-free task; 17 local links resolve; code fences balance; all six Mermaid diagrams parse.
- Correction during validation: the first sequence-diagram parse failed on semicolons in message labels. Reworded those labels and reran the complete check successfully. Also made feedback HTTP and SDK dependencies explicit before the successful run.
- Limits: diagrams were syntax-parsed, not visually rendered. No application tests, provider calls, paid evaluations or connector execution were performed. Upstream build evidence above is historical setup evidence, not a test of Heimdall.

For future records use:

```text
ID: V-YYYYMMDD-NN
Task(s):
Source revision / working-tree state:
Command and working directory:
Result: exit code and relevant assertions
Artifact paths:
Limitations / untested paths:
```

Never store keys, temporary browser access tokens, raw customer prompts, or sensitive outputs in this file. Reference a redacted artifact instead.

## Decision and change ledger

| ID | Date | Decision or change | Previous state | Why / evidence | Affected tasks |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | 2026-09-22 | Use a modular monolith with explicit module interfaces and one gateway deployment | Architecture had not been fixed | User explicitly requested modular monolith; reduces operational surface while enforcing ownership | T001, T020, T027, T049 |
| DEC-002 | 2026-09-22 | Separate top-level `sdk/` with TypeScript first and Python parity later | SDK existed only as a product requirement | User explicitly requested separate SDK folder; package consumers must not import server internals | T002, T035, T048, T051 |
| DEC-003 | 2026-09-22 | Planning defaults: strict TypeScript, Node, Fastify, PostgreSQL, bounded local caches | Concrete server stack unspecified | Engineering choice supporting existing JS harness/SDK and one deployable; exact versions selected in T001 | T001, T020, T024, T029 |
| DEC-004 | 2026-09-22 | Populate profiles from OpenRouter metadata/pricing, official capability sources and held-out coding evidence | Source combination proposed | Founder explicitly selected recommended source combination; public benchmarks remain supporting evidence | T003, T009, T032, T041 |
| DEC-005 | 2026-09-22 | Start with a small licensed reproducible coding dataset and configurable candidate shortlist | No supplied task corpus or candidate names | Founder selected this approach; exact sources/models are reproducible selection tasks, not guessed seed facts | T009, T032, T041 |
| DEC-006 | 2026-09-22 | DSH uses prepare-before-log invocation with an external plugin | A generic gateway adapter was initially the likely seam | DSH freezes/logs model/tool metadata before dispatch; preparation and finalization must be proved by keyless spike | T007, T028, T037, T038 |
| DEC-007 | 2026-09-22 | DSH fallback is automatic but coordinated with its per-attempt logging; chat combined mode can recover internally | Gateway fallback previously described without the DSH attribution detail | One recorded DSH attempt must identify the actual candidate; avoid hidden retries or mislabelled history. Product fallback authority stays with Heimdall | T007, T030, T039, T040 |
| DEC-008 | 2026-09-22 | Distinguish enforceable budget bounds from uncertain provider billing; preserve possibly-started attempts after crashes | Hard caps were accepted without a complete failure model | PostgreSQL and remote provider calls are not one atomic transaction; cancellation may still incur cost | T012, T023, T030, T050 |
| DEC-009 | 2026-09-22 | Semantic estimates stay behind a Jev port; deterministic policy owns arithmetic and hard checks | Jev chosen as replaceable classifier | Verified docs expose typed judgments and specific limitations; confidence is not empirical task success | T008, T010, T025, T042 |
| DEC-010 | 2026-09-22 | Preserve deferred scope and starred reviews | Founder accepted all remaining recommendations | Acceptance did not explicitly reverse task-ID/rerouting V2 deferral or hedging/commercial exclusions | T042, T054, T055; V2 backlog |

DEC-006/007 are implementation proposals gated by T007, not claims that all required upstream hooks are already sufficient. If the spike disproves them, record the smallest alternative here and update the design before implementation spreads.

### Required template for a changed decision

```text
Change ID and date:
Previous decision and source:
New decision:
Reason and observed evidence:
Authority: explicit user decision / engineering choice within accepted scope
Affected task IDs and interfaces:
Migration, compatibility, rework and rollback impact:
Checks required before dependent work resumes:
Supersedes: earlier ID (keep the earlier entry)
```

## Task execution log

No Heimdall implementation tasks have started. Append one entry per meaningful attempt or completed task; do not replace this section with an unsupported completion summary.

```text
Task ID / title:
Owner:
Status transition and date:
Dependencies verified:
Files / commit:
Behavior delivered:
Verification record IDs:
Remaining limitations:
Decision changes:
Next READY tasks:
```

## Known gates and reminders

- T007: prove access to pending DSH input and exact prepared-request binding before freezing the connector API. Model-only endpoint replacement does not implement tool filtering.
- T009/T032: record dataset rights, actual model versions/aliases, prices and capability sources; never invent quality scores to fill missing metadata.
- T025/T042: recheck Jev limits/model/SDK versions and calibrate questions. The SDK timeout is per attempt; one total request deadline must bound all work.
- T045/T046: define measured numerical release gates. No fixed savings or latency guarantee exists yet.
- T051: project license must be chosen before public distribution; commercial pricing remains deferred.
- F11/T055: exploration stays off until its starred review and evidence pass. G7/T042: test true question independence before treating batching as equivalent.
- V2: formal task IDs and compound-task splitting. Outside current build: goal definition, complexity prediction, parallel hedging, response/negative caching, planning and tool execution.

## Handoff summary

Reusable implementation instruction: [BUILD_PROMPT.md](BUILD_PROMPT.md). Execution clarifications: [build handoff](docs/build-handoff.md). Added 2026-09-22 after reviewing the existing plan, design, domain context and research. These clarify document authority, superseded research examples, portable setup and external completion gates; they do not alter product scope or start implementation.

The next implementation agent should begin T001, establish the workspace without enrolling the upstream harness, and then T002. Use task acceptance criteria as the completion test. Update this file and the task checkbox together. This planning request does not authorize claiming any application task complete or publishing packages/services.
