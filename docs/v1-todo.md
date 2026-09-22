# Heimdall V1: active to-do list

The executable task checklist is now [implementation-plan.md](./implementation-plan.md), with [system-design.md](./system-design.md) and [brain.md](../brain.md) for architecture and verified progress. The overview below preserves scope; do not maintain a second conflicting execution status here.

Updated 2026-09-22 from the founder's acceptance of the remaining recommendations. Product direction is ready for an implementation plan; the items below are engineering design, calibration, and build work, not unanswered founder questions. Decisions are in [decision-answers.md](./decision-answers.md). Deferred work is in [v2-backlog.md](./v2-backlog.md).

## Engineering design to include in the implementation plan

- [ ] **DeepSeek connector:** choose the profile/plugin seam and prove route attribution, selected tool visibility, retry ownership, and stream behavior with a keyless spike. See [integration findings](./research/deepseek-harness-integration.md).
- [ ] **Request and continuity schema:** define caller-carried compact routing state and prior model, objective-continuity features, normalized stream events, and how chat/RAG route per invocation without formal task IDs.
- [ ] **Candidate catalog:** name the two hosted providers and one local/open endpoint for V1 portability checks, with OpenRouter as the primary invocation path; version materially distinct model configurations.
- [ ] **Selection math:** implement hard eligibility, profile-specific quality floor, confidence bounds, expected total cost, and first-slice per-invocation hard/soft budget accounting. Calibrate numerical values from held-out tasks.
- [ ] **Evidence schema:** preserve provenance and uncertainty across vendor claims, benchmarks, curation, held-out evaluations, and consented outcomes.

## Further implementation specifications

- [ ] **Caching:** encode versioned decision keys; implement model-profile and decision-feature caches first; use similar cases only as ranking evidence; no negative or provider-response caching.
- [ ] **Invocation:** map OpenRouter messages/streams/tool calls/usage/errors and actual model identity; keep Heimdall's ranked fallback authoritative and respect DSH's retry/stream boundaries.
- [ ] **Tool/model coupling:** implement bounded two-pass compatibility checking with an explicit failure when essential tools cannot be included.
- [ ] **Budgets and tests:** specify conservative admission/reservation/actual-cost reconciliation; ship deterministic fake providers and fixed-policy mode.
- [ ] **Evaluation:** construct held-out coding-task traces, baselines, counterfactuals, quality judging, feature ablations, shadow/canary sequence, and numerical launch gates. Complexity is excluded from V1 ablations.
- [ ] **Operations:** calibrate SLOs, retention periods, quotas, rollback triggers, and supported SDK versions before hosted release.

## Starred for revisit, without blocking the first plan

- [ ] **F11* — Cold-start exploration:** opt-in, eligible traffic, amount, stopping rule, and promotion gate before implementing it.
- [ ] **G7* — Concurrent judgments:** dependency graph and measured latency/cost before freezing the pipeline.
- [ ] **J7–J11* — Delayed parallel invocation:** deferred from the current build, including trigger, winner, cancellation/billing, and tool-call safety. The five-second example is not a policy.

## Deferred beyond the current build

- **P1–P6 — Commercial model:** postpone pricing and business details. Decide license/packaging before public open-source distribution.

## Build from the accepted decisions

- [ ] Implement a hosted, open-source/self-hostable gateway with an SDK and OpenAI-compatible adapter; keep provider marketplace behavior outside V1.
- [ ] Implement route-only and route-and-invoke paths for coding-agent, chat, and RAG callers, with coding agents as the first evaluated workload.
- [ ] Integrate the controlled DeepSeek harness, then add other harness adapters incrementally.
- [ ] Implement optional caller-enabled tool filtering; return only selected authorized tool definitions, including an empty set when appropriate, and leave execution to the caller.
- [ ] Implement model profiles, hard eligibility, task-conditioned quality evidence, cost estimation, and the chosen routing policy.
- [ ] Build report-card/catalog and decision-feature caches first. Keep tool-selection and final-decision caches separate; omit provider-response and negative caches in V1.
- [ ] Use OpenRouter as the primary invocation path, with native adapters only to cover verified gaps. Automatically invoke the next-ranked eligible model after bounded retry exhaustion, before any user-visible stream commitment.
- [ ] Implement coding-task model retention, caller-requested progress reevaluation, and mandatory reevaluation for ineligibility/unavailability, without a V1 task-ID contract.
- [ ] Evaluate against strongest-model, cheapest-model, and static-rule baselines before making quality or savings claims.

## Explicit exclusions from V1

The V1 plan contains no formal caller task IDs, multi-task decomposition/rerouting, goal-definition stage, complexity estimator, delayed parallel model invocation, provider-response or negative caching, agent planner, tool executor, workflow engine, prompt manager, general observability platform, or provider marketplace. Later timing for goal definition, complexity, and hedging is not yet assigned; see the V2 backlog for items explicitly placed there.
