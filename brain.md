# Heimdall execution memory

Last updated: 2026-09-22. This file records verified progress and the reasons decisions change. It is not a claim that planned software exists.

## Read first

1. [Implementation plan](docs/implementation-plan.md): executable task cards, current status, prerequisites and acceptance criteria.
2. [System design](docs/system-design.md): modules, interfaces, invariants, diagrams and failure behavior.
3. [CONTEXT.md](CONTEXT.md): domain language and product boundary.
4. [Decision answers](docs/decision-answers.md): founder choices; [V2 backlog](docs/v2-backlog.md): preserved exclusions.

The latest explicit user decision wins over an older recommendation. Do not silently change a decision to make an implementation easier. The plan is the current task-status source; this file is its execution/evidence history. Update both after a task changes state.

## Current checkpoint

- Phase: T005 complete; native request/result schemas and canonical hashing committed.
- Heimdall application code: workspace (T001) + contracts primitives/generation (T002) + catalog/access domain (T003/T004) + request/result/canonical (T005). No routing/selection/invocation logic yet.
- Mandatory implementation work: T001–T005 DONE; T006–T053 TODO. Optional later work: T054 and T055, both TODO and disabled by default.
- Next READY tasks: T006 needs T002+T005 — READY now. T008 needs T002+T005 — READY now. T009 needs T002 — READY (independent manifest work). T010 needs T003+T004+T005 — READY now. T007 needs T002+T005+T006 — blocked on T006. Dependency-ready now: T006, T008, T009, T010.
- Active implementation owner/task: none (T005 closed 2026-09-22).
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

### V-20260922-02 — T001 workspace/tooling/boundaries
- Task(s): T001.
- Source revision / working-tree state: Heimdall git root initialized 2026-09-22, commit `09c151b` (root commit, includes planning baseline + T001 scaffold); `deepseek-harness/` at `ddefc45`, clean, untouched; `.pnpm-store/` outside repo.
- Commands and working directory (`C:\Users\User\Desktop\Heimdall`, via `pnpm.cmd` to avoid the `.ps1` execution-policy block):
  - `pnpm.cmd install --frozen-lockfile` — exit 0; 6 workspace projects, 110 packages.
  - `node scripts/check-boundaries.mjs` — exit 0; 12 source files scanned, workspace globs exclude DSH/store.
  - Negative test: appended `import '@heimdall/gateway'` to `sdk/typescript/src/index.ts` → checker exit 1 with `sdk forbidden import`; restored file → exit 0. This caught and fixed a real gap: bare side-effect imports were initially undetected (added `bare` import pattern to the checker).
  - `pnpm.cmd ls --recursive --depth -1` — exit 0; lists root + 5 `@heimdall/*` packages only, no DSH entry.
  - `pnpm.cmd lint` (scoped prettier check) — exit 0. Full-repo `prettier --check .` fails on pre-existing planning docs and 109 archived typesafe-source snapshots; lint scope intentionally covers only T001-owned trees so the baseline docs are not reformatted (recorded choice, not a failure to fix).
  - `pnpm.cmd typecheck` (`tsc -b` project references) — exit 0.
  - `pnpm.cmd test` (vitest 4.1.8, no test files yet) — exit 0 via `passWithNoTests`.
  - Secret sweep (grep for `sk-`, private-key, `AKIA`, `ghp_`, `xox*` across `apps/`, `sdk/`, `scripts/`) — no matches. `.env.example` holds names only; no `.env` file exists.
- Artifact paths: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.base.json`, `tsconfig.json`, `vitest.config.ts`, `README.md`, `.env.example`, `.gitignore`, `.prettierrc`, `.prettierignore`, `.github/workflows/ci.yml`, `apps/gateway/`, `packages/contracts/`, `packages/testkit/`, `sdk/typescript/`, `integrations/deepseek-harness/`, `scripts/check-boundaries.mjs`.
- Pinned versions (see README): Node 24.11.1, pnpm 11.19.0, TypeScript 5.9.3 (deliberate 5.x choice; DSH uses 6.0.3, TS 7.0.2 latest avoided for ecosystem stability), Vitest 4.1.8 (matches proven upstream tooling), Prettier 3.6.2, Fastify 5.12.5, Ajv 8.20.0, pg 8.23.0, @types/node 24.11.1.
- Limitations / untested paths: no gateway/route/sdk behavior exists yet (T002+); CI workflow file not executed on a remote runner (no remote configured, nothing pushed); cross-module deep-import rule and connector DSH-internal rules are syntactically enforced but have no violating fixture in-tree beyond the manual negative test; Windows host only — Linux container check deferred to T049.

### V-20260922-03 — T002 contract primitives and error vocabulary

- Task(s): T002.
- Source revision / working-tree state: Heimdall commit `3813f65` (on top of `a9a822e`); `deepseek-harness/` at `ddefc45`, clean, untouched.
- Commands and working directory (`C:\Users\User\Desktop\Heimdall`, via `pnpm.cmd`):
  - `pnpm.cmd --filter @heimdall/contracts generate` — exit 0; emits `src/generated/types.ts`, `src/generated/root-schema.ts`, `openapi/components.json` (25 schemas, OpenAPI 3.1.0).
  - `pnpm.cmd --filter @heimdall/contracts gen:check` — exit 0; committed files byte-match regeneration.
  - `pnpm.cmd --filter @heimdall/contracts test` — exit 0; 4 files, 29 tests pass (16 primitives, 5 content, 6 errors, 2 generation).
  - `pnpm.cmd --filter @heimdall/contracts typecheck` (`tsc -b` + `tsc --noEmit -p tsconfig.tests.json`) — exit 0.
  - Root gate — exit 0: `pnpm.cmd typecheck`, `pnpm.cmd boundaries` (16 source files), `pnpm.cmd lint`, `pnpm.cmd test` (29 tests via workspace run).
  - Secret sweep across `packages/contracts` — no keys/tokens/credentials (only prose mentions of task-ID exclusion).
- Artifact paths: `packages/contracts/src/schemas/heimdall.v1.json` (single source, 25 `$defs`), `src/generated/`, `openapi/components.json`, `src/validate.ts`, `src/errors.ts`, `test/*.test.ts` (4 files), `VERSIONING.md`, `scripts/generate.mjs`, `tsconfig.tests.json`.
- Fixes during verification (history preserved, not erased): timestamp regex tightened to range-check fields after a test caught shape-only acceptance; generator now prettier-formats the OpenAPI JSON so committed output always matches; Ajv CJS constructor crosses via `createRequire` behind a minimal structural interface after proving Ajv default-export types do not resolve under nodenext/TS 5.9 (runtime import verified); a failed `tsc -b` with tests under `rootDir: src` emitted stray in-place `.js/.d.ts` — deleted, emit config now strictly `src`-only with tests typechecked via `tsconfig.tests.json`.
- Engineering choices (within accepted design, no product change): single-file schema source; embedded root schema keeps `dist` self-contained; `extensions` reserved with zero allowed keys in v1; currency as 3-letter pattern (full allowlist deferred to T032); timestamp shape plus field ranges with Feb-30-class dates documented as consumer concern; ERROR_CATALOG default retryability per code with recorded reasons.
- Limitations / untested paths: request/result composition belongs to T005 (no RouteRequest yet); catalog/policy/usage composites intentionally absent (T003/T004/T006 own them); Ajv validated in-process JSON values only — no HTTP transport test yet (T029+); Windows host only.

### V-20260922-04 — T003 candidate profiles + T004 policy resolution

- Task(s): T003, T004 (parallel work packages, distinct file ownership).
- Source revision / working-tree state: Heimdall commit `6093164` (on top of `3ae54ba`); `deepseek-harness/` at `ddefc45`, clean, untouched.
- Commands and working directory (`C:\Users\User\Desktop\Heimdall`, via `pnpm.cmd`):
  - `pnpm.cmd --filter @heimdall/contracts generate` + `gen:check` — exit 0; schema grows 25 → 50 `$defs`, OpenAPI components regenerated deterministically.
  - `pnpm.cmd typecheck` (root `tsc -b`, all projects) — exit 0.
  - `pnpm.cmd --filter @heimdall/gateway typecheck` (`tsc -b` + tests project) — exit 0.
  - `pnpm.cmd test` (workspace) — exit 0; 6 files, 54 tests (29 contracts + 13 access-policy + 12 catalog-profiles).
  - `pnpm.cmd lint`, `pnpm.cmd boundaries` (18 source files) — exit 0.
  - Secret sweep across `apps/gateway` — no matches.
- Artifact paths: schema additions in `heimdall.v1.json` + regenerated `generated/`/`openapi/`; `apps/gateway/src/modules/catalog/domain/profiles.ts`; `apps/gateway/src/modules/access/domain/policy.ts`; `apps/gateway/test/*.test.ts`; `apps/gateway/tsconfig.tests.json`; `data/catalog/synthetic-profiles.v1.json` (3 synthetic records: 2 hosted families + 1 local).
- Fixes during verification: fixture path needed three directory ups (test → gateway → apps → root); gateway tests initially consumed stale contracts `dist` (fixed by build-before-test ordering, no code change); package entrypoint was missing generated-type re-exports (`export * from './generated/types.js'` added to contracts `index.ts`); strict-null errors in tests/domain fixed without casts (`riskRank` guard, `parseNanos` undefined guard, `first`/`second` fixture helpers, explicit `PolicyRule` annotation); a failed `tsc -b` with tests under `rootDir: src` emitted stray in-place `.js/.d.ts` — deleted (see also V-20260922-03 pattern).
- Engineering choices (within accepted design, no product change): `policyRule` complete per level + partial `policyOverride` with narrowing-only merge (subset allowlists, union denials, min caps, max floors, subset egress, no pin replacement, frozen quality reference); tenant level required in resolver inputs with empty override `{}` as default; tenant bound from authenticated parameter only; money/fraction compared as exact scaled BigInt nanos; fixture gating via required `fixture` flag + `allowFixture` option; `detectConflicts` defines quarantine inputs, enforcement deferred to T021 publication; quality reference immutable across levels.
- Scope preserved: no request/result schemas (T005), no storage/publication (T020/T021/T022), no usage composites (T006), snapshot publication mechanics deferred to T021.
- Limitations / untested paths: resolver is pure/in-process — no HTTP/admin transport (T022/T029); policy versions are opaque IDs with no rotation semantics yet (T022); candidate `revision` recorded but snapshot immutability untested without storage (T021); Windows host only.

### V-20260922-05 — T005 request schemas and canonical hashing

- Task(s): T005.
- Source revision / working-tree state: Heimdall commit `eade6c5` (on top of `c0daaaa`); `deepseek-harness/` at `ddefc45`, clean, untouched.
- Commands and working directory (`C:\Users\User\Desktop\Heimdall`, via `pnpm.cmd`):
  - `pnpm.cmd --filter @heimdall/contracts generate` + `gen:check` — exit 0; schema grows 50 → 71 `$defs`, OpenAPI components regenerated deterministically.
  - `pnpm.cmd --filter @heimdall/contracts test` — exit 0; 6 files, 47 tests (18 new: 13 request + 5 canonical).
  - `pnpm.cmd --filter @heimdall/contracts typecheck`, `pnpm.cmd typecheck` — exit 0.
  - Root gate — exit 0: `pnpm.cmd lint`, `pnpm.cmd boundaries` (19 source files), `pnpm.cmd test` (8 files, 72 tests workspace-wide).
  - Secret sweep on new files — no matches.
- Artifact paths: 21 new request/result `$defs` in `heimdall.v1.json` + regenerated `generated/`/`openapi/`; `packages/contracts/src/canonical.ts`; `test/route-request.test.ts`; `test/canonical.test.ts`.
- Fixes during verification: Ajv strict mode rejects `then: { required: [...] }` without sibling `properties` (strictRequired) — restructured to a self-contained `enabledToolSelection` `$ref` instead of weakening strictness; test helper typed as `Message` (was widened `string` role); key-shuffle test rebuilt manually (JSON replacer arrays drop nested keys).
- Engineering choices (within accepted design, no product change): enabled selection requires a catalog (possibly empty) via if/then; disabled selection with a catalog is pass-through; routing state carries no permissions/policy/tenant/task fields (rejected as unknown); tenant has no body field; canonical form sorts object keys and preserves array order (messages, tool definitions); SHA-256 hex digests for prepared-route binding; side-effect classes read/write/external; per-invocation budget/deadline optional at schema with transport defaults deferred to T029.
- Scope preserved: no routing service logic (T027), no prepared-route tokens (T028), cost estimation optional until T011, tool relevance semantics deferred to T014.
- Limitations / untested paths: validation is in-process only — no HTTP transport test (T029+); Windows host only.

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

```text
Task ID / title: T001 — Workspace, tooling, and module boundaries
Owner: implementation engineer
Status transition and date: TODO -> IN_PROGRESS -> DONE, 2026-09-22
Dependencies verified: none (only dependency-free task in the graph)
Files / commit: Heimdall git root init + commit 09c151b (scaffold + planning baseline; DSH/store/node_modules/dist ignored, DSH checkout untouched at ddefc45)
Behavior delivered: pinned workspace (Node 24.11.1, pnpm 11.19.0, TS 5.9.3, Vitest 4.1.8, Prettier 3.6.2, Fastify 5.12.5, Ajv 8.20.0, pg 8.23.0); 5 member packages; 8 gateway module public.ts entrypoints; boundary checker enforcing SDK/contract/connector/gateway isolation + workspace exclusion; scoped lint/typecheck/test scripts; CI skeleton; README setup guide; .env.example names only
Verification record IDs: V-20260922-02
Remaining limitations: no runtime behavior yet; CI file unexecuted remotely; Linux host check deferred to T049
Decision changes: routine engineering choices only (TS 5.9.3 pin; prettier lint scoped to owned trees) — no product decision changed
Next READY tasks: T002
```

```text
Task ID / title: T005 — Canonical request, tools, and continuity data
Owner: implementation engineer
Status transition and date: TODO -> IN_PROGRESS -> DONE, 2026-09-22
Dependencies verified: T002 DONE, T004 DONE (request primitives + policy shapes)
Files / commit: commit eade6c5 (8 files in packages/contracts; DSH checkout untouched at ddefc45)
Behavior delivered: 21 request/result $defs (messages, tool definitions with essential/bundle metadata, enabled/disabled toolSelection with if/then catalog requirement, reevaluation reasons, permission-free routingState, budgets/deadlines, pins, routeResult with fallbacks/reasons/versions/retention); canonicalize + digestCanonical (sorted keys, significant array order, SHA-256); 18 new tests covering chat/RAG/coding fixtures, tool-selection semantics, state smuggling rejection, tenant/task exclusion, hash rules
Verification record IDs: V-20260922-05
Remaining limitations: in-process validation only (transport T029+); cost estimation optional until T011; relevance semantics T014
Decision changes: routine engineering choices only (listed in V-20260922-05) — no product decision changed
Next READY tasks: T006, T008, T009, T010
```

```text
Task ID / title: T003 — Candidate profile and evidence schemas
Owner: implementation engineer
Status transition and date: TODO -> IN_PROGRESS -> DONE, 2026-09-22
Dependencies verified: T002 DONE (contract primitives + generation pipeline)
Files / commit: commit 6093164 (shared with T004; distinct files: schema profile $defs + catalog domain + fixture + catalog tests)
Behavior delivered: 16 profile $defs (capabilityState with first-class unknown, evidenceKind, candidateId/revisionId, modelRef with alias-resolution flag, modalitySupport, toolSupport, safeCapacity, endpointPolicy, priceSchedule, evidenceRecord, candidateProfile with required fixture flag); validateCatalogUpload (schema + unique IDs + fixture gate); capabilityFromExplicit (absent evidence stays unknown); detectConflicts (quarantine inputs, enforcement T021); synthetic fixture (2 hosted families + local, unmistakably synthetic); 12 tests
Verification record IDs: V-20260922-04
Remaining limitations: snapshot publication/rollback deferred to T021; no real candidate data (T032)
Decision changes: routine engineering choices only (listed in V-20260922-04) — no product decision changed
Next READY tasks: T005, T009
```

```text
Task ID / title: T004 — Effective policy schemas and resolver
Owner: implementation engineer
Status transition and date: TODO -> IN_PROGRESS -> DONE, 2026-09-22
Dependencies verified: T002 DONE
Files / commit: commit 6093164 (shared with T003; distinct files: schema policy $defs + access domain + access tests)
Behavior delivered: 13 policy $defs (tenantId, policyVersion, riskTier, fraction, egressRule with independent classifier egress, qualityBaseline, latencyLimits, reliabilityFloor, budgetPolicy, modelPin, complete policyRule, partial policyOverride, effectivePolicy with version provenance); resolvePolicy pure restrictive intersection (narrow-only merge, explicit POLICY_DENIED conflicts, final pin recheck, deterministic, tenant from authenticated identity); exact BigInt money/fraction comparison; 13 tests
Verification record IDs: V-20260922-04
Remaining limitations: transport/admin/quota/secrets deferred to T022/T029; opaque versions without rotation (T022)
Decision changes: routine engineering choices only (listed in V-20260922-04) — no product decision changed
Next READY tasks: T005, T009
```

```text
Task ID / title: T002 — Contract primitives and error vocabulary
Owner: implementation engineer
Status transition and date: TODO -> IN_PROGRESS -> DONE, 2026-09-22
Dependencies verified: T001 DONE (commit a9a822e; workspace/boundaries/toolchain)
Files / commit: commit 3813f65 (16 files in packages/contracts + lockfile; DSH checkout untouched at ddefc45)
Behavior delivered: single-source JSON Schema (25 $defs: IDs, money, token counts, timestamps, profiles, all 6 modalities, extensions, 17-code error envelope); generated TS types + embedded root schema + OpenAPI 3.1.0 components (deterministic, drift-checked); strict Ajv2020 validation rejecting unknown/task-ID/oversized/unsafe/invalid-currency input; ERROR_CATALOG with per-code default retryability; VERSIONING.md (additive vs breaking rules); 29 behavior tests
Verification record IDs: V-20260922-03
Remaining limitations: no RouteRequest yet (T005); catalog/policy/usage composites out of scope (T003/T004/T006); no transport test (T029+)
Decision changes: routine engineering choices only (listed in V-20260922-03) — no product decision changed
Next READY tasks: T003, T004, T009
```

Append one entry per meaningful attempt or completed task below the template; do not replace this section with an unsupported completion summary.

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

The next implementation agent should begin T002 (contract primitives and error vocabulary) on top of commit `09c151b`, then follow the plan's dependency order. Use task acceptance criteria as the completion test. Update this file and the task checkbox together. This planning request does not authorize claiming any application task complete or publishing packages/services.
