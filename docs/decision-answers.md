# Heimdall decision answers

This file records founder answers to the comprehensive questionnaire. `Partial` means the answer settles part of the question while leaving a material detail unresolved.

2026-09-22 implementation-planning additions: the founder requested a modular monolith, a separate SDK folder, bottom-up executable tasks, UML system design, and `brain.md` progress/change history. The founder approved initial model-profile data from OpenRouter catalog/pricing, official provider capability sources, and our held-out coding evaluations, with public benchmarks as supporting evidence. The founder also approved a small licensed reproducible coding dataset and configurable model shortlist; concrete dataset/model selection and paid experiments are separate implementation tasks. See [system design](system-design.md) and [implementation plan](implementation-plan.md).

## A. Product and users

**A1 — Answered.** Initial users include AI application teams, agent frontend builders, individual developers, and enterprises. Coding-agent builders are a central initial audience. The order in which these segments will be served is not yet stated.

**A2 — Answered.** The first controlled integration and evaluation environment is [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness), the DeepSeek Harness (`dsh`) plugin-based agent harness. It was checked out locally at commit `ddefc45` for initial study. Later harness integrations may be added through connectors; the exact plugin/API integration point remains to be selected.

**A3 — Answered.** Heimdall is a hosted gateway with an SDK and an OpenAI-compatible adapter. It is also open source and may be self-hosted. The boundary between the hosted control plane and self-hosted components remains to be designed.

**A4 — Answered.** V1 provides building blocks for coding agents, ordinary chat applications, and RAG applications. Coding agents are the first validation and emphasis area.

**A5 — Resolved at policy level.** Hard privacy, capability, authorization, quality, reliability, and application latency requirements are gates. Among eligible candidates, minimize expected total cost. “Intelligence” is represented by task-conditioned quality/capability evidence, not a separate universal score. Exact floor and latency values are profile parameters calibrated in evaluation.

**A6 — Answered.** V1 is not an agent planner, tool executor, workflow engine/orchestrator, prompt manager, general observability platform, or provider marketplace. Model evaluation is performed only as a consequence of improving routing and is not a separate V1 product.

## B. Request and session contract

**B1 — Answered by default, subject to V1 API design.** Require messages and a routing policy/profile. Application type, available models, constraints, output schema, attachments, RAG context, tool-selection flag, tool catalog, tenant/user IDs, and metadata are structured optional fields. A formal task-ID field and goal-definition stage are outside V1. Caller-supplied goal text may remain ordinary context; the exact V1 request schema is still to be designed.

**B2 — Answered by default.** A caller-supplied goal overrides inference; infer only when absent. Goal *definition* as a routing stage is excluded from V1 under G3, so this field is treated as caller context rather than a separately generated artifact.

**B3 — Answered by default.** The caller declares an application profile because agent, chat, and RAG integrations have different routing and state semantics.

**B4 — Deferred to V2.** Caller-supplied task IDs and their format, scope, lifetime, and idempotency contract are not V1 work. The founder explicitly asked to remove V2-deferred items from the active V1 plan, resolving the prior contradictory B4 acceptance in favor of the earlier V2 deferral.

**B5 — Recommendation accepted.** Without a task-ID contract, infer continuity from caller-supplied structured compact state plus recent turns; accept full history without requiring it. Return the selected model and revised compact routing state for the caller to pass on the next coding-agent invocation. This state is data, not a formal task identifier; exact fields and serialization are implementation design.

**B6 — Answered by default.** When continuity must be inferred, classify objective continuity rather than topic similarity; uncertainty means continuation. The threshold still requires empirical calibration.

**B7 — V1 decision plus V2 deferral.** When one request contains multiple tasks, use the most capable eligible model for the entire request. Decomposition and separate routing of sub-tasks are V2 work.

**B8 — Answered by default.** Support stateless requests first; managed state is deferred.

**B9 — Recommendation accepted.** Heimdall proxies a normalized stream so each calling application integrates once. Model attribution, usage, finish reason, and errors must remain observable. No transparent model switch after user-visible output begins.

**B10 — Answered by default.** Use an OpenAI Responses API-style compatibility adapter while retaining a native Heimdall endpoint for routing metadata.

## C. Unit of routing and model continuity

**C1 — Answered with override.** For coding-agent use, attach the selected model to the task. For chat, RAG, other agents, and other application types, select per model invocation unless a later application-specific profile states otherwise.

**C2 — Answered by default.** A same-task caller reevaluation request uses `reevaluate_model` plus a typed reason and updated evidence.

**C3 — Answered by default.** Typed reasons include no progress, bad output, context growth, new modality, new risk level, time pressure, budget change, provider error, and user request.

**C4 — Answered by default.** Heimdall may switch without a caller request when the retained model becomes ineligible, unavailable, unable to fit required context, or forbidden by policy. These are eligibility failures rather than judgments about progress.

**C5 — Answered by recommendation.** Caller-requested reevaluation may upgrade, downgrade, or retain the current model. A mid-task downgrade requires the cheaper candidate to satisfy the quality floor and offer meaningful savings after context-transfer and lost prompt-cache costs.

**C6 — Answered by default.** The caller supplies canonical task state; Heimdall normalizes provider-specific messages and reports dropped or translated fields during a switch.

**C7 — Answered by default.** Prompt-cache benefits and context-transfer tokens count as model-switching costs.

**C8 — Answered by default.** Support hard model allow/deny constraints and soft preferences. An explicit model pin bypasses selection while retaining eligibility checks.

## D. Tool-selection contract

**D1 — Confirmed.** The caller explicitly enables tool selection and supplies only tools authorized for the request.

**D2 — Answered by default.** Require stable ID, description, input schema, side-effect class, and version. Permissions, latency, monetary cost, reliability, residency, examples, and tags are optional operational metadata.

**D3 — Answered by default.** Return filtered definitions plus stable IDs, ranking evidence, and an explicit no-tools-needed result.

**D4 — Answered by recommendation.** Limit selected tool-definition tokens first, with an optional tool-count cap; report when essential definitions cannot fit rather than silently omit them.

**D5 — Answered by default.** Optimize selected-set size against measured task success with a mild penalty for tool-schema tokens; do not require an arbitrary minimum number of tools.

**D6 — Answered by default.** When enabled, reconsider tools before every model invocation. Skip repeated selection when relevant task state and catalog versions are unchanged.

**D7 — Answered by default.** Support both a structured `additional_tool_needed` signal from the model and caller-initiated reselection; the caller remains authoritative.

**D8 — Answered by default.** In V1 Heimdall filters tool definitions only. The selected model produces arguments, and the caller validates and executes them.

**D9 — Answered by default.** Selection may consider side-effect risk metadata, but execution authorization remains with the caller.

**D10 — Answered by default.** Support explicit dependency and bundle metadata only when actual catalogs require it; do not infer operational dependencies from descriptions alone.

**D11 — Answered by default.** Choose shortlist/rerank thresholds from accuracy and latency tests. The documented 255-option TypeSafe ceiling is an upper bound, not a target.

**D12 — Answered by default.** Retrieval may be either a tool or caller-supplied context; the request declares which because cost accounting and tool selection differ.

## E. Model catalog and eligibility

**E1 — Answered by default.** Use a Heimdall-maintained base catalog with tenant overrides and allowlists.

**E2 — Answered by default.** V1 targets two hosted providers plus one local/open-model endpoint; exact providers remain to be named.

**E3 — Answered by default.** Model profiles are version- and configuration-specific. Resolve aliases to concrete versions at decision time.

**E4 — Recommendation accepted.** Treat a model plus materially different reasoning effort, output mode, service tier, region, quantization, or other cost/quality/latency-affecting configuration as a distinct candidate profile. Do not multiply candidates for settings with no measured material effect.

**E5 — Answered by default.** Before ranking, filter by required modality, context fit, tool support, output-schema support, provider/region policy, availability, data policy, and caller allowlist.

**E6 — Answered with override.** Account for every input modality in the design: text, images, audio, video, files/documents, and mixed-modality requests. A modality/configuration remains ineligible until its support has been verified.

**E7 — Answered by recommendation.** Use empirically safe input capacity rather than the advertised maximum, reserving tokens for system content, selected tool definitions, and output.

**E8 — Answered by default.** Generic tool-calling support is an eligibility signal; measured success with specific catalogs and schemas is quality evidence.

**E9 — Answered by default.** Normalize supported structured-output schemas, expose limitations, and do not claim guarantees beyond the evidence for the provider/model configuration.

**E10 — Recommendation accepted.** Missing hard capability evidence excludes a candidate. Missing price, quality, or latency evidence receives conservative uncertainty; unknown-price models cannot be claimed cheapest. Controlled low-risk, tenant-authorized exploration may gather evidence under F11, which remains starred before implementation.

**E11 — Answered with override.** When no candidate satisfies every desired constraint, route to the strongest allowed model or an explicit fallback that satisfies the minimum requirements. Hard safety, authorization, modality, and data-policy requirements may not be relaxed silently.

**E12 — Answered by default.** Retire or quarantine a candidate after provider retirement, policy failure, sustained regression, or inadequate reliability; preserve historical profiles for audit.

## F. Model-profile evidence

**F1 — Answered by default.** Begin with a small coding-task taxonomy derived from real traffic, allowing a task to carry several labels.

**F2 — Recommendation accepted.** Combine vendor declarations, public benchmarks, human curation, held-out evaluations, and consenting traffic outcomes without collapsing them into an unattributed specialization label. Every claim retains source, date, scope, sample size where applicable, and confidence/uncertainty.

**F3 — Answered by default.** Treat public benchmarks as priors and prioritize held-out workload-specific evaluations.

**F4 — Answered by default.** Prefer executable outcomes such as passing tests and regression checks; use human or calibrated judge review where executable evidence is unavailable.

**F5 — Answered by default.** Track effective-dated input, cached-input, output, reasoning, request, modality, tool, and batch prices separately.

**F6 — Answered by default.** Track queue time, time to first token, generation rate, completion time, and tail percentiles by region/service tier; route using the measure required by the application profile.

**F7 — Answered by default.** Track rate limits, availability, timeouts, malformed responses, tool-call validity, and provider errors with sample counts and rolling windows.

**F8 — Answered by default.** Do not use a universal intelligence score. Use task-conditioned quality estimates.

**F9 — Answered by default.** Measured fields carry source, observation time, sample size, uncertainty, and expiry. Declared fields carry at least source and timestamp.

**F10 — Answered by default.** Refresh fields after scheduled intervals, releases, price changes, drift, incidents, and enough new outcomes, using field-specific rules.

**F11 — Accepted in principle, starred for revisit.** Verify hard capabilities and evaluate offline, then permit small amounts of tenant-authorized, low-risk traffic to collect evidence; do not explore by default on high-risk work. The founder explicitly asterisked this answer: remind them to revisit the exploration amount, opt-in, and promotion rule before implementation.

**F12 — Answered by default.** Retire/quarantine based on provider retirement, policy failure, sustained regression, or reliability, while preserving history.

## G. Request understanding

**G1 — Answered with override.** V1 request judgments are task continuity, intent/domain, risk/importance, modality needs, context needs, tool need, action types, and output type. Complexity is excluded from V1.

**G2 — Answered by default.** Use small global intent primitives plus application-specific labels rather than one huge taxonomy.

**G3 — Deferred from V1.** Do not include goal definition as a V1 routing stage.

**G4 — Answered by default.** Search, RAG, tool use, and generation are independent flags that may coexist.

**G5 — Answered by default.** Caller-declared importance/risk policy wins. Inference may raise a warning but may not silently lower declared importance.

**G6 — Answered with override.** Do not predict or use complexity in V1.

**G7 — Accepted in principle, starred for revisit.** Batch independent judgments over the same available state; use another stage only when earlier results create necessary input, evidence, or options. The founder explicitly asterisked this answer: revisit the actual dependency graph and measured latency/cost before implementation.

**G8 — Answered by default.** If classification fails, use a caller-configured safe default model; expose no optional tools unless tool selection has its own reliable fallback.

**G9 — Answered with override.** The semantic decision engine is replaceable. TypeSafe/Jev is an initial implementation to evaluate against deterministic and learned baselines, not a permanent dependency.

**G10 — Answered by default.** Treat user/retrieved content as data, keep policies and catalog metadata outside it, enforce hard checks in code, and red-team routing/tool selection.

## H. Selection objective and policy

**H1 — Answered by recommendation.** First remove candidates violating hard requirements and required quality/reliability/latency floors; among survivors select the one with the lowest expected total cost. The cost-estimation method remains open and must be tied to the unit of work and predicted downstream attempts.

**H2 — Recommendation accepted.** Use a caller/profile-specific reference model or production policy as the quality baseline. Set a maximum tolerated regression and confidence interval per profile before launch; the numerical values require calibration on representative tasks.

**H3 — Answered by default.** Runtime total cost includes classification, model tokens, cached tokens, tools, retries, verification, fallbacks, and duplicate attempts; infrastructure overhead is reported separately.

**H4 — Answered by default.** The application profile chooses the latency objective. Coding-agent profiles emphasize time to useful action and task completion.

**H5 — Answered by default.** Enforce a minimum reliability threshold, then include remaining failure probability in expected utility.

**H6 — Answered by recommendation.** Use caller-defined risk tiers. Higher tiers require stronger quality evidence and reliability, disallow or constrain exploration, and can require caller-side validation or review. Heimdall does not execute tools or grant execution permission.

**H7 — Answered by default.** Provide explainable presets such as cheapest, balanced, fastest, and highest quality, plus advanced numeric constraints.

**H8 — Answered by default.** Mid-task ties prefer the retained model. Otherwise prefer lower cost, then stronger reliability evidence.

**H9 — Recommendation accepted.** For sparse/noisy evidence, compare a lower confidence bound for quality and upper bounds for cost/latency. The confidence method and thresholds are implementation/evaluation parameters, not an invitation to bypass hard requirements.

**H10 — Answered by default.** Exploration is tenant-controlled and off by default for production and high-risk profiles.

**H11 — Answered by default.** Return a concise human-readable reason and machine-readable decision trace, with sensitive/proprietary policy details protected where necessary.

**H12 — Answered by default.** Identical inputs and versioned dependencies yield the same decision except for enabled exploration or live-health changes.

## I. Caching

**I1 — Answered with override.** Keep distinct report-card/catalog, decision-feature, tool-selection, and final-decision caches. Build the report-card and decision-feature caches first; do not cache provider responses in V1. Tool-selection caching may follow once its correctness is demonstrated.

**I2 — Answered by default.** Keep active model profiles in memory with a durable, versioned source of truth.

**I3 — Recommendation accepted.** Final-decision cache keys include normalized policy/profile, task features and continuity state, hard requirements, context bucket, selected-tool requirements, tenant allowlist, and catalog/model versions. Raw prompt similarity alone cannot establish equivalence. Exact encoding is implementation design.

**I4 — Recommendation accepted.** Similar historical cases may inform candidate ranking or estimated quality as a prior, but current hard eligibility and policy must still be checked. Do not directly reuse an old final route from semantic similarity.

**I5–I7 — Answered by default.** Tool-selection keys include state, catalog/version, permissions, policy, and phase; use layer-specific freshness rules and invalidate on relevant model, tool, permission, policy, price, health, or evidence changes.

**I8 — Answered with override.** Do not cache negative results, including provider failures or no-eligible-model outcomes.

**I9–I11 — Answered by default.** Isolate tenant-sensitive cache entries, minimize stored content under explicit retention/deletion rules, and measure cache hit, staleness, savings, and quality by path.

## J. Invocation and recovery

**J1 — Answered by default.** Heimdall invokes the selected model and proxies/returns its response; the caller executes tools.

**J2 — Answered with override.** Use OpenRouter as the primary inference aggregation/normalization path. Preserve a Heimdall common contract for roles, tool calls, structured outputs, usage, finish reasons, and errors; add native provider adapters only where OpenRouter is insufficient. Provider-side server tools must not silently execute caller-owned tools.

**J3 — Answered by default.** Retry transient failures on the same model within bounded attempts and an overall deadline.

**J4 — Answered with override.** After same-model retry exhaustion, Heimdall automatically invokes the next highest-ranked eligible model, subject to the current hard requirements, budget, deadline, and streaming boundary.

**J5–J6 — Answered by default.** The caller controls overflow policy; never silently truncate required context. Reserve and estimate output capacity, and surface truncation explicitly.

**J7–J11 — Starred and deferred.** Delayed parallel invocation, trigger, hedge candidates, winner/cancellation, and tool-call hedging are out of the current build. Revisit as one experiment after the sequential fallback path works. The illustrative five-second cutoff is not a policy.

**J12–J13 — Answered by default.** Do not transparently switch models after user-visible stream output begins. Apply tenant-configured provider/geographic failover within eligibility and data policy.

## K. Outcome feedback

**K1 — Answered with override.** Heimdall selects and invokes models. Output verification and tool execution remain with the caller.

**K2–K8 — Answered by default.** Accept optional caller-reported outcomes, errors, corrections, and model overrides; distinguish failure sources; require consent for cross-tenant learning; review and gate policy updates rather than changing production routing from raw feedback alone.

## L. Evaluation and launch

**L1–L12 — Recommendations accepted.** Compare relevant simple baselines, at least always-strongest and static rules; mix real and held-out authored coding tasks with an untouched chronological/repository split; evaluate calls and whole tasks; define numerical quality, cost, latency, reliability, tool-recall, and no-route gates with uncertainty intervals; use cost per successful task as the primary cost metric; separate router overhead from end-to-end time and cold from warm cache; use blinded human review plus calibrated model judges where tests cannot decide; run bounded offline counterfactuals; ablate V1 features and remove ones that do not earn their overhead; run shadow mode then canary with rollback gates; cover long context, ambiguous continuity, modalities, no eligible model, outages, tool omission, injection, and price changes; launch only with bounded quality non-inferiority against the profile's production baseline, material cost reduction, and acceptable tail latency. Complexity is excluded from V1 ablations. Dataset construction, sample sizes, and numerical thresholds are implementation/evaluation work, not unresolved product direction.

## M. Security and governance

**M1–M8 — Answered by default.** Redact secrets, enforce tenant/region/data policy, minimize retention, encrypt and isolate tenant data, define restrictive policy precedence, retain versioned audit evidence, limit catalog probing, and never expand beyond caller-authorized tools.

## N. Operations

**N1–N8 — Answered by default.** Record versioned decision traces and gateway metrics, define SLOs and drift checks, support atomic rollback and operator disables, use a safe degraded mode, and enforce layered quotas. V1 traces use request/decision identifiers and caller-carried continuity state, not a formal task-ID contract.

## O. Developer contract

**O1–O5 — Answered by default.** Ship a TypeScript SDK first, then Python; expose route-only, route-and-invoke, optional tool-select, outcome, catalog/policy, and health surfaces; support dry runs, idempotency where needed, caller deadlines, and cancellation.

**O6 — Recommendation accepted.** Support distinct hard money/token caps and soft targets. First slice enforces per-invocation caps, with optional caller-supplied remaining task budget; no managed task ledger or V1 task ID. Admit each model attempt only if its conservative estimated maximum fits the remaining hard cap, reserve fallback spend within the same cap, and report actual usage and any unavoidable provider-accounting overrun. Soft targets influence ranking without overriding hard floors. Stop a stream at the cap when technically possible and return a typed budget result; exact accounting/overshoot behavior must be tested against provider usage semantics.

**O7–O8 — Answered by default.** Return concise routing metadata by default with richer traces in debug mode; use typed errors for policy, eligibility, provider, budget, timeout, and cancellation failures.

**O9 — Recommendation accepted.** Ship deterministic fake-provider fixtures and a fixed-routing-policy mode in the SDK/test package, with gateway integration tests for streams, tool calls, usage, timeouts, errors, cancellation, and fallback. Tests must run without paid provider calls.

**O10 — Answered by default.** Keep adoption close to direct-provider calls through a compatible adapter, documented differences, and incremental opt-in.

## P. Commercial and open-source model

**P1–P6 — Deferred.** Do not make commercial decisions now. Open-source/self-hostable intent remains, but exact licensing and packaging must be decided before distribution.

## Q. Terms

**Q1–Q7 — Answered by default.** Canonical product name is Heimdall. Call the combined selection a route. Use model profile as the canonical structured record, with “report card” as a familiar label; use task-conditioned quality rather than universal intelligence. Separate business importance, harm risk, and quality sensitivity. Define speed with concrete latency measures. Use model catalog and tool catalog.

## R. Coherence checks

**R1–R6, R8–R10 — Answered by default.** Route-only, pinned-model normalized invocation, empty selected tools, same-model reevaluation, and mandatory eligibility reevaluation are supported. A pin persists across task boundaries unless policy or eligibility forbids it. Caller owns prompts and conversation memory. The first build is a narrow text coding-agent slice, with schema/eligibility designed for the agreed broader modalities and application types.

**R7 — Recommendation accepted with V1 choice.** Model and tool selection may depend on each other. Use a bounded two-pass process in V1: identify required tools and candidate models, then check compatibility and rerank once; if no compatible pair remains, return an explicit no-route or essential-tool-capacity error. Never iterate until convergence without a fixed bound. Compare with joint eligible-pair scoring later if measurements justify it.
