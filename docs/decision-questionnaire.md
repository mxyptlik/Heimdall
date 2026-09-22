# Heimdall comprehensive decision questionnaire

This is the historical full questionnaire, not the current V1 work list. See [the active V1 list](./v1-todo.md) and [V2 backlog](./v2-backlog.md) for scope after founder answers. In particular, B4 task IDs and B7 multi-task rerouting are V2, regardless of the original recommendations below.

Answer in any convenient format. Use `default` to accept a recommendation, `unknown` to defer a decision, or `N/A` when a question does not apply. Question IDs are stable so answers can be supplied across multiple messages if necessary.

## A. Product and users

**A1. Primary buyer and operator.** Who deploys and pays for Heimdall first: individual developers, agent-framework builders, AI application teams, enterprises, or model/API providers?  
_Recommendation:_ AI application teams building coding agents.

**A2. First integration.** What exact coding agent or harness will be the first integration and evaluation environment?  
_Recommendation:_ Pick one controlled harness before supporting framework-specific adapters.

**A3. Product form.** Is Heimdall a hosted API, self-hosted service, embedded SDK, proxy compatible with an existing model API, or some combination?  
_Recommendation:_ Hosted gateway with an SDK and an OpenAI-compatible adapter; defer self-hosting unless a customer requires it.

**A4. Supported applications at launch.** Which ship in v1: coding agents, normal chat, RAG, or all three?  
_Recommendation:_ Build the core contract for all three, but validate and market v1 around coding agents.

**A5. Value hierarchy.** Rank these: quality, total cost, latency, reliability, privacy, determinism.  
_Recommendation:_ Quality floor first; then minimize expected total cost subject to latency and reliability targets.

**A6. Non-goals.** What must Heimdall explicitly avoid becoming in v1: agent planner, tool executor, workflow engine, model evaluator, observability platform, prompt manager, or provider marketplace?  
_Recommendation:_ Exclude planning, tool execution, and general workflow orchestration; include only the evaluation needed for routing.

## B. Request and session contract

**B1. Request payload.** Which fields are required: messages, goal, task ID, application type, available models, constraints, desired output schema, attachments, RAG context, tool-selection flag, tool catalog, tenant/user IDs, and metadata?  
_Recommendation:_ Require messages and policy/profile; make the rest explicit optional structured fields.

**B2. Goal source.** Does the caller supply a goal, does Heimdall infer it, or does an explicit goal override inference?  
_Recommendation:_ Caller goal wins; infer only when absent.

**B3. Application type.** Must callers declare `agent`, `chat`, or `rag`, or should Heimdall infer it?  
_Recommendation:_ Require a declared application profile because it changes routing and state semantics.

**B4. Task IDs.** What format, ownership, uniqueness, lifetime, and idempotency guarantees apply to caller-provided task IDs?  
_Recommendation:_ Caller-opaque string scoped to tenant, stable for the task, with a separate request ID per invocation.

**B5. No task ID.** What history does Heimdall receive to infer continuity: full conversation, compact state, recent turns, or a caller-maintained summary?  
_Recommendation:_ Structured compact state plus recent turns; allow full history but do not require it.

**B6. Task-boundary classification.** What signals define a new task, and what confidence threshold establishes one? Does a major goal change within one user message split into multiple tasks?  
_Recommendation:_ Classify objective continuity, not topic similarity; uncertain means continue, as already decided.

**B7. Compound requests.** Can one request contain several independent tasks? If so, does Heimdall return multiple routing decisions or one model capable of all parts?  
_Recommendation:_ Return an explicit compound-task signal in v1 and choose one model; defer task decomposition because Heimdall is not the planner.

**B8. Stateless mode.** Must every request be independently routable without Heimdall storing session state?  
_Recommendation:_ Support stateless requests first; offer optional managed state later.

**B9. Streaming contract.** Does Heimdall proxy token streams, return a provider stream directly, or return only routing metadata and a final response?  
_Recommendation:_ Proxy a normalized stream so the application integrates once.

**B10. Compatibility API.** Which provider API should the first adapter emulate, if any?  
_Recommendation:_ OpenAI Responses API style, while retaining a native Heimdall endpoint for routing metadata.

## C. Unit of routing and model continuity

**C1. Initial selection unit.** Is the selected model attached to a task, conversation turn, agent run, or model invocation?  
_Recommendation:_ Attach it to a task, as the current decisions imply.

**C2. Same-task reevaluation request.** How does the caller request reevaluation: boolean flag, reason code, new constraints, or a separate endpoint?  
_Recommendation:_ `reevaluate_model` plus a required reason code and updated evidence.

**C3. Reevaluation reasons.** Which caller reasons are supported: no progress, bad output, context growth, new modality, new risk level, time pressure, budget change, provider error, or user request?  
_Recommendation:_ Support all as typed reasons; log them separately.

**C4. Mandatory gateway override.** If the retained model becomes unavailable, exceeds its context window, loses required capabilities, or is forbidden by policy, may Heimdall switch without a caller request?  
_Recommendation:_ Yes. These are eligibility failures, not progress judgments.

**C5. Model upgrade and downgrade.** Can reevaluation move both upward and downward, or only escalate capability?  
_Recommendation:_ Allow both, but require clear expected savings before downgrading mid-task.

**C6. Context transfer.** When switching models, what conversation, summaries, tool results, and provider-specific state must transfer? Who produces the compacted context?  
_Recommendation:_ Caller supplies canonical task state; Heimdall normalizes provider-specific messages and reports dropped/translated fields.

**C7. Stickiness cost.** Should provider prompt-cache benefits and context-transfer tokens count in the decision to switch?  
_Recommendation:_ Yes, as explicit switching costs.

**C8. User-selected model.** Can an end user force, prefer, exclude, or cap models? Does a forced model disable routing?  
_Recommendation:_ Support hard allow/deny and soft preference; an explicit force bypasses selection but retains eligibility checks.

## D. Tool-selection contract

**D1. Tool-selection activation.** Confirm that the caller explicitly enables tool selection and supplies only tools already authorized for that request.  
_Recommendation:_ Yes, matching the current decision.

**D2. Catalog shape.** What must each tool contain: stable ID, name, natural-language description, JSON schema, permissions, side-effect class, latency, monetary cost, reliability, data residency, examples, version, and tags?  
_Recommendation:_ Require ID, description, input schema, side-effect class, and version; make operational metadata optional but encouraged.

**D3. Selection output.** Should Heimdall return tool IDs only, ranked tools with scores, reasons, rejected tools, or the filtered definitions ready for the model?  
_Recommendation:_ Return the filtered definitions plus IDs, ranking evidence, and a no-tools-needed result.

**D4. Tool count.** Is there a hard maximum or token budget for selected tool definitions?  
_Recommendation:_ Use a definition-token budget and an optional count cap rather than count alone.

**D5. Tool recall.** Should Heimdall optimize for a small set or include plausible extras to reduce omission risk?  
_Recommendation:_ Optimize against measured task success with a mild cost for extra schema tokens; do not force an arbitrary minimum.

**D6. Tool refresh.** Confirm that enabled tool selection runs before every model invocation using current task state. Can a cache skip the call when relevant state and catalog versions are unchanged?  
_Recommendation:_ Yes to both.

**D7. Missing-tool recovery.** Can the selected model emit a structured `additional_tool_needed` request, or can only the caller decide to retry selection?  
_Recommendation:_ Support both; the caller remains authoritative.

**D8. Tool arguments.** Does Heimdall ever produce or validate tool-call arguments, or only filter definitions?  
_Recommendation:_ Only filter definitions in v1; the selected model produces arguments and the caller validates/executes them.

**D9. Side effects.** Should mutating tools require stricter selection confidence or always remain available when authorized?  
_Recommendation:_ Selection may use risk metadata, but execution authorization must stay with the caller.

**D10. Dependencies.** Can tools declare prerequisite tools, mutually exclusive tools, or bundles?  
_Recommendation:_ Support dependency/bundle metadata if real catalogs need it; do not infer operational dependencies from prose alone.

**D11. Large catalogs.** At what size does Heimdall use hierarchical shortlist-and-rerank instead of one classification call?  
_Recommendation:_ Decide from accuracy and latency tests; TypeSafe Choice has a documented 255-option ceiling, but practical limits may be lower.

**D12. RAG distinction.** Is retrieval represented as a tool, pre-supplied context, or either depending on the caller?  
_Recommendation:_ Either; make the distinction explicit because it changes tool selection and cost accounting.

## E. Model catalog and eligibility

**E1. Catalog ownership.** Who adds and maintains models: Heimdall, each tenant, automated provider discovery, or all three?  
_Recommendation:_ Heimdall base catalog with tenant overrides and allowlists.

**E2. Provider scope.** Which providers and local runtimes must v1 support?  
_Recommendation:_ Choose two hosted providers plus one local/open-model endpoint to test portability without exploding scope.

**E3. Model identity.** Are report cards version-specific, alias-specific, configuration-specific, or model-family-wide?  
_Recommendation:_ Version and configuration specific; aliases resolve to versions at decision time.

**E4. Configuration identity.** Are reasoning effort, temperature, max tokens, structured-output mode, service tier, region, and quantization separate candidates?  
_Recommendation:_ Treat materially different cost/quality/latency configurations as separate candidate profiles.

**E5. Hard eligibility.** Confirm the pre-ranking filters: required modality, context fit, tool support, output-schema support, provider/region policy, availability, data policy, and caller allowlist. What else is mandatory?  
_Recommendation:_ Apply all before semantic ranking.

**E6. Multimodality.** Which inputs matter first: text, images, audio, video, files? How are mixed-modality context sizes measured?  
_Recommendation:_ Text and images first; represent other modalities as hard unsupported until tested.

**E7. Context fit.** Use advertised maximum context or a smaller empirically safe context? Reserve output and tool-schema tokens?  
_Recommendation:_ Use an empirically safe input budget and reserve output/tool capacity.

**E8. Tool capability.** Is generic tool calling enough, or must a model be evaluated for the specific selected tools and schemas?  
_Recommendation:_ Record generic support as eligibility and measured catalog-specific success as quality evidence.

**E9. Structured output.** Must Heimdall guarantee a common JSON-schema behavior across providers?  
_Recommendation:_ Normalize supported schemas, expose limitations, and never claim guarantees stronger than the provider/model evidence.

**E10. Unknown metadata.** If price, latency, or capability data is missing, exclude the model, use a conservative default, or explore it?  
_Recommendation:_ Exclude on missing hard capabilities; use conservative uncertainty for soft metrics and permit controlled exploration.

**E11. No eligible model.** What should happen: return a typed error, choose a designated fallback, ask the caller to relax constraints, or route to the strongest allowed model?  
_Recommendation:_ Return a typed `no_eligible_model` with failed constraints; optionally use an explicit caller-configured fallback only.

## F. Report-card evidence

**F1. Capability taxonomy.** What canonical task families should report cards use for coding: explanation, search, bug diagnosis, editing, refactoring, test generation, repository-scale reasoning, shell use, code review, planning, and others?  
_Recommendation:_ Start with a small taxonomy derived from real traffic and allow multi-label tasks.

**F2. Specialization source.** Is specialization vendor-declared, benchmark-derived, human-curated, learned from traffic, or a combination?  
_Recommendation:_ Preserve source and confidence for every claim; never collapse them into an unattributed label.

**F3. Benchmarks.** Which public and private benchmarks count, and how do you prevent contamination or benchmark gaming?  
_Recommendation:_ Use public results only as priors; prioritize held-out, workload-specific evaluations.

**F4. Quality metric.** What counts as coding-task success: tests pass, patch accepted, judge score, no regressions, time to resolution, or a composite?  
_Recommendation:_ Use executable outcomes when possible, then human/judge review for tasks without tests.

**F5. Cost fields.** Track input, cached input, output, reasoning, request, image/audio, tool, and batch prices separately?  
_Recommendation:_ Yes; store effective-dated price schedules instead of one scalar cost.

**F6. Latency fields.** Track queue time, time to first token, generation rate, completion time, and tail percentiles by region and service tier?  
_Recommendation:_ Yes; route on the latency measure relevant to the application.

**F7. Reliability fields.** Track rate limits, availability, timeouts, malformed responses, tool-call validity, and provider errors?  
_Recommendation:_ Yes, with rolling windows and sample counts.

**F8. Intelligence.** Do you still want a single intelligence score? If so, exactly what decision uses it?  
_Recommendation:_ Do not use one universal score; use task-conditioned quality estimates.

**F9. Data provenance.** Must every report-card field carry source, observed time, sample size, confidence interval, and expiration?  
_Recommendation:_ Yes for measured fields; at minimum source and timestamp for declared fields.

**F10. Refresh.** What events refresh a card: timer, provider release, price change, drift detection, incident, or sufficient new outcomes?  
_Recommendation:_ All, with field-specific refresh rules.

**F11. Cold-start model.** How does a new model receive traffic before enough evidence exists?  
_Recommendation:_ Controlled exploration under a tenant policy and never for high-risk tasks by default.

**F12. Retirement.** What removes or quarantines a model?  
_Recommendation:_ Provider retirement, policy failure, sustained regression, or insufficient reliability; preserve historical cards for audit.

## G. Request understanding

**G1. Required semantic judgments.** Which are truly needed before selection: task continuity, intent/domain, complexity, risk/importance, modality needs, context needs, tool need, action types, output type, latency sensitivity, and quality sensitivity?  
_Recommendation:_ Keep only features that measurably improve routing over simpler baselines.

**G2. Intent taxonomy.** Is intent a closed global taxonomy, application-specific taxonomy, or free-form description?  
_Recommendation:_ Small global primitives plus application-specific labels; avoid one enormous taxonomy.

**G3. Goal definition.** Does this mean selecting a caller-defined goal category, extracting success criteria, or generating a plan?  
_Recommendation:_ Extract/choose goal and success criteria; planning remains outside Heimdall.

**G4. Action types.** Can search, RAG, tool use, and generation coexist as independent flags rather than one exclusive category?  
_Recommendation:_ Yes.

**G5. Importance/risk.** Is task importance supplied by the caller, inferred by Heimdall, or both? Which wins?  
_Recommendation:_ Caller policy wins; inference may raise a warning but must not silently lower declared importance.

**G6. Complexity.** Is complexity predicted before execution, updated after evidence, or both? Does it influence initial model selection only?  
_Recommendation:_ Initial prediction plus caller-requested reevaluation evidence; do not automatically switch for inferred struggle under the current decision.

**G7. Atomic questions.** Which classifications run together from the original state, and which require a second stage because they depend on retrieved data or candidate shortlists?  
_Recommendation:_ Batch independent judgments; stage only real data dependencies.

**G8. Classifier failure.** If the routing classifier times out, errors, or returns low confidence, what fallback is used?  
_Recommendation:_ A caller-configured safe default model and no optional tools unless tool selection has a separate reliable fallback.

**G9. Classifier provider.** Is TypeSafe/Jev required, preferred, replaceable, or just the first implementation?  
_Recommendation:_ Make the decision engine replaceable and evaluate Jev against deterministic and learned baselines.

**G10. Adversarial input.** How will Heimdall prevent user text or retrieved content from manipulating routing and tool selection?  
_Recommendation:_ Treat request content as data, keep policies/catalog metadata outside it, use hard code checks, and red-team the classifier.

## H. Selection objective and policy

**H1. Definition of best.** Is selection an ordered policy, weighted score, constrained optimization, Pareto choice, or learned policy?  
_Recommendation:_ Hard constraints, then minimize expected total cost subject to a task-specific quality floor and latency SLO.

**H2. Quality floor.** Relative to what baseline is quality preserved: strongest allowed model, caller-selected baseline, current production model, or absolute success target?  
_Recommendation:_ Caller/profile-specific baseline with a maximum tolerated regression and confidence interval.

**H3. Cost scope.** Does total cost include classifier calls, input/output, cached tokens, tools, retries, verification, fallbacks, duplicated calls, and engineering overhead?  
_Recommendation:_ Include every runtime marginal cost; report infrastructure overhead separately.

**H4. Latency objective.** Optimize time to first token, time to final answer, time to first valid tool call, or task completion time?  
_Recommendation:_ Application profile chooses; coding agents should emphasize time to useful action/task completion.

**H5. Reliability objective.** Is availability a hard constraint or part of expected cost/latency?  
_Recommendation:_ Minimum reliability as a hard constraint, then account for residual failure probability in expected utility.

**H6. Risk tiers.** What task tiers require stronger floors, human review, or disallow exploration?  
_Recommendation:_ Caller-defined tiers with conservative defaults for destructive code/tool actions and security-sensitive work.

**H7. Policy profiles.** Do callers choose presets such as cheapest, balanced, fastest, highest quality, or define numeric constraints?  
_Recommendation:_ Provide explainable presets plus advanced explicit constraints.

**H8. Tie breaking.** If candidates are effectively equal, prefer cheaper, faster, more reliable, already-current, same provider, or more observed?  
_Recommendation:_ Retained/current model first mid-task; otherwise cheaper, then more reliable evidence.

**H9. Uncertainty penalty.** How should sparse or noisy model evidence affect rank?  
_Recommendation:_ Use conservative lower confidence bounds for quality and upper bounds for cost/latency.

**H10. Exploration.** What traffic percentage may go to non-optimal candidates for learning, and who controls it?  
_Recommendation:_ Tenant-controlled, off by default for production/high-risk profiles.

**H11. Explainability.** What explanation must each decision expose: selected model, rejected constraints, estimated cost/quality/latency, alternatives, classifier signals, and catalog versions?  
_Recommendation:_ Return a concise reason and machine-readable decision trace; protect proprietary policy internals if needed.

**H12. Determinism.** Should identical inputs/catalog versions always select the same model, outside exploration and live health changes?  
_Recommendation:_ Yes, for reproducibility.

## I. Cache design

**I1. Cache layers.** Confirm separate caches for report-card data, request-understanding features, tool selection, model decisions, and provider responses. Which belong in v1?  
_Recommendation:_ Report-card and decision-feature caches first; response caching only as an explicit application feature.

**I2. Catalog cache.** Since the model catalog is small, should all active cards reside in memory with a durable source of truth?  
_Recommendation:_ Yes.

**I3. Decision key.** What exact normalized fields define equivalent routing work?  
_Recommendation:_ Policy/profile, task features, hard requirements, context bucket, selected-tool requirements, tenant allowlist, and catalog/model versions; never raw prompt similarity alone.

**I4. Semantic reuse.** Should similar requests reuse a decision directly, use it only as a prior, or never reuse semantically?  
_Recommendation:_ Use similar cases as a prior; reapply current eligibility and policy.

**I5. Tool-selection key.** Include task state digest, catalog version, permissions, tool-selection policy, and invocation phase?  
_Recommendation:_ Yes.

**I6. TTLs.** What expires quickly versus slowly?  
_Recommendation:_ Live health seconds/minutes, observed latency minutes, prices/cards hours until event invalidation, learned quality until version/data drift, decision entries tied to all dependencies.

**I7. Invalidation.** Which events invalidate decisions: model release, alias movement, price change, provider incident, policy change, tool version, permission change, benchmark update, or caller feedback?  
_Recommendation:_ All relevant dependencies via versioned keys rather than broad deletion.

**I8. Negative cache.** Cache provider failures or no-eligible-model results?  
_Recommendation:_ Briefly, with error-specific TTLs; never let one transient failure cause long exclusion.

**I9. Tenant isolation.** Can cache entries cross tenants?  
_Recommendation:_ Only non-sensitive public model metadata; routing features and decisions remain tenant-scoped unless explicitly anonymized and authorized.

**I10. Privacy.** May prompts, embeddings, summaries, tool outputs, or hashes be stored in cache? For how long and under what deletion rules?  
_Recommendation:_ Store derived minimal features by default; make content retention opt-in with clear TTL and deletion support.

**I11. Cache observability.** Track hit rate, stale-hit incidents, saved latency/cost, and outcome quality by cache path?  
_Recommendation:_ Yes.

## J. Invocation, retries, fallbacks, and hedging

**J1. Invocation ownership.** Confirm Heimdall sends the selected model request and returns/proxies its response, while the caller executes tools.  
_Recommendation:_ Yes, matching the current gateway boundary.

**J2. Provider normalization.** Which message roles, tool-call formats, structured outputs, token accounting, finish reasons, and errors form the common contract?  
_Recommendation:_ Define a loss-aware native schema and adapters; report unsupported/dropped provider fields.

**J3. Retry policy.** Which failures retry the same model, with what maximum attempts and total deadline?  
_Recommendation:_ Retry transient transport/rate failures within an explicit total budget; do not retry semantic failures automatically.

**J4. Failure fallback.** After retry exhaustion, may Heimdall automatically invoke another eligible model, or must the caller request reevaluation?  
_Recommendation:_ Automatic fallback for provider/transport failure if the caller enables it; progress/quality fallback remains caller-triggered.

**J5. Context overflow.** Summarize, truncate, choose a larger model, or return an error? Who controls the policy?  
_Recommendation:_ Never silently truncate. Use caller policy: supplied compaction, eligible larger model, or typed error.

**J6. Output limit.** How does Heimdall estimate required output tokens and handle truncation?  
_Recommendation:_ Caller supplies limit/profile; detect truncation and return a typed finish reason without autonomous continuation unless enabled.

**J7. Five-second idea.** Do you still want delayed parallel invocation? If yes, for which profiles?  
_Recommendation:_ Defer hedging from v1 until real tail-latency data shows value.

**J8. Hedge trigger.** If adopted, is the threshold based on missing first token, missing complete response, missing valid tool call, or predicted deadline miss?  
_Recommendation:_ Application-specific predicted deadline miss, not a universal five seconds.

**J9. Hedge candidates.** May the second candidate be cheaper/weaker, faster/equal-quality, or only a verified fallback?  
_Recommendation:_ Only candidates that independently satisfy the quality floor.

**J10. Hedge winner.** First response, first valid response, verifier-selected response, or model-priority response? What happens to the loser and its bill?  
_Recommendation:_ First valid response under deterministic validation; cancel the loser when possible and count all incurred cost.

**J11. Tool-call hedging.** Can hedged model attempts emit tool calls?  
_Recommendation:_ Keep attempts read-only until one wins; never allow two attempts to cause tool side effects.

**J12. Streaming and fallback.** Once tokens have streamed to the user, can Heimdall switch models?  
_Recommendation:_ No transparent switch after visible output; surface interruption/restart explicitly.

**J13. Provider outage.** Is there a tenant-configured provider priority or geographic failover policy?  
_Recommendation:_ Yes, independent from semantic model ranking.

## K. Output quality and feedback

**K1. Output verification.** Is Heimdall responsible for evaluating model outputs, or only selecting/invoking models?  
_Recommendation:_ Add optional narrow verification signals, but keep application-specific correctness checks with the caller in v1.

**K2. Coding evidence.** Will the caller return test results, lint/typecheck results, patch acceptance, user corrections, and completion state to Heimdall?  
_Recommendation:_ Yes via a structured outcome endpoint.

**K3. Outcome labels.** What canonical outcomes exist: success, partial, failed, abandoned, model error, tool error, caller error, user rejected?  
_Recommendation:_ Define these separately so model quality is not blamed for infrastructure or tool failures.

**K4. Attribution.** How will you assign failure among router, selected model, tool omission, prompt/context, tool execution, and external systems?  
_Recommendation:_ Store stage-specific evidence and allow unknown/multiple causes.

**K5. Explicit feedback.** Can users rate answers, override the selected model, or report wrong routing?  
_Recommendation:_ Support all, but do not treat raw thumbs-up as ground-truth task success.

**K6. Online learning.** May production outcomes automatically change routing, or only update offline candidate policies after review?  
_Recommendation:_ Offline evaluation and gated promotion first.

**K7. Data consent.** Can tenant traffic train global routing policies?  
_Recommendation:_ Opt-in only, with anonymization and contractual clarity.

**K8. Feedback delay.** How are outcomes linked when task success appears much later than selection?  
_Recommendation:_ Stable task/request/decision IDs with late outcome updates.

## L. Evaluation and launch criteria

**L1. Baselines.** Which routing baselines must Heimdall beat: always strongest, always cheapest, static rules, random eligible, provider auto-router, and current production choice?  
_Recommendation:_ Compare against all relevant simple baselines; the strongest and static-rule baselines are essential.

**L2. Dataset.** Where will the first representative coding-task dataset come from, and how will you prevent train/test leakage?  
_Recommendation:_ Mix historical real tasks with held-out authored tasks; keep a final untouched chronological/repository split.

**L3. Sample unit.** Evaluate isolated prompts, full task traces, or both?  
_Recommendation:_ Both; optimize on full tasks because per-turn savings can increase total task cost.

**L4. Success metrics.** Set target values for quality regression, cost reduction, routing overhead p50/p95/p99, task latency, reliability, tool recall, and abstention/no-route rate.  
_Recommendation:_ Do not launch on a vague “no intelligence loss”; choose numerical gates with uncertainty intervals.

**L5. Cost metric.** Compare per request, per successful task, and per accepted patch?  
_Recommendation:_ Primary metric: cost per successful task; request-level cost is diagnostic.

**L6. Latency metric.** Compare router overhead separately from end-to-end task time?  
_Recommendation:_ Yes, including cold and warm cache paths.

**L7. Quality judge.** Who judges outputs without executable tests, and how do you calibrate judge bias across model families?  
_Recommendation:_ Blinded human rubric plus multiple/judge-calibrated model assessments for scale.

**L8. Counterfactuals.** Will each evaluation task run against every candidate model/configuration to learn true alternatives?  
_Recommendation:_ For a bounded offline set, yes; otherwise routing cannot be evaluated reliably from chosen-model outcomes alone.

**L9. Ablations.** Will you test whether each feature—intent, complexity, tools, benchmarks, cache—actually improves results?  
_Recommendation:_ Yes; remove features that do not beat latency/cost overhead.

**L10. Shadow mode.** Will Heimdall first recommend without controlling production routing?  
_Recommendation:_ Yes, then canary traffic with strict rollback gates.

**L11. Regression suite.** What cases must never regress: long context, ambiguous follow-ups, multimodal requirements, no eligible model, provider outage, tool omission, prompt injection, price changes?  
_Recommendation:_ All.

**L12. Launch gate.** What exact evidence declares v1 successful?  
_Recommendation:_ Statistically bounded quality non-inferiority versus the production baseline plus material cost reduction and acceptable tail latency.

## M. Security, privacy, and governance

**M1. Secrets.** Can prompts/tool schemas contain credentials or sensitive values, and where are they redacted?  
_Recommendation:_ Tool definitions never contain secrets; caller/provider adapters inject credentials outside model-visible content.

**M2. Data routing policy.** Can sensitive data leave a tenant, region, cloud, or local machine?  
_Recommendation:_ Encode this as hard eligibility constraints.

**M3. Retention.** What are default retention periods for prompts, decisions, traces, and outcomes?  
_Recommendation:_ Minimal metadata by default; tenant-configurable content logging and deletion.

**M4. Encryption and tenancy.** What isolation, encryption, and key-management model is required?  
_Recommendation:_ Tenant isolation at every stateful layer; encryption in transit and at rest; enterprise keys later if needed.

**M5. Policy authority.** Which wins when global, tenant, application, and user policies conflict?  
_Recommendation:_ Global safety/legal constraints, then tenant, application, and user preference, with conflicts returned explicitly.

**M6. Audit.** How long must routing decisions be reproducible, and must catalog/policy versions be retained?  
_Recommendation:_ Persist immutable decision records and referenced versions for the contractual audit period.

**M7. Abuse.** How will you prevent customers from using model-selection metadata to probe restricted models or provider capacity?  
_Recommendation:_ Authorize catalog visibility and sanitize public explanations.

**M8. Tool authorization.** Confirm Heimdall never expands beyond the caller-supplied authorized catalog and never treats selection as execution approval.  
_Recommendation:_ Yes.

## N. Observability and operations

**N1. Decision trace.** Which IDs and fields are logged for every route?  
_Recommendation:_ Tenant, application, task, request, decision, policy/catalog/model versions, eligibility results, selected tools/model, estimates, actual usage, latency, errors, and outcome linkage.

**N2. Metrics.** Which dashboards and alerts are required at launch?  
_Recommendation:_ Quality proxy/outcomes, cost per success, routing latency, provider latency/error, fallback, no-route, cache, tool recall, and drift.

**N3. SLOs.** What uptime and routing-overhead SLOs apply?  
_Recommendation:_ Set by application profile; publish measured percentiles rather than “snap of a finger.”

**N4. Drift.** What signals detect model, traffic, pricing, latency, or classifier drift?  
_Recommendation:_ Rolling outcome and feature distributions with version-aware alerts.

**N5. Rollback.** Can a policy/model-card update be atomically rolled back?  
_Recommendation:_ Yes, using versioned immutable releases.

**N6. Manual controls.** Can operators disable a model/provider/tool, pin a policy, or drain traffic immediately?  
_Recommendation:_ Yes, with audit logs and expiry for temporary overrides.

**N7. Degraded mode.** What happens if the decision engine or catalog store is down?  
_Recommendation:_ Use a locally cached policy and caller-configured default; never silently broaden model/tool permissions.

**N8. Rate limits.** Are quotas enforced per tenant, application, provider, model, and classifier?  
_Recommendation:_ Yes, with backpressure and typed errors.

## O. API, SDK, and developer experience

**O1. Languages.** Which SDKs ship first?  
_Recommendation:_ TypeScript and Python.

**O2. Core endpoints.** Do you want separate endpoints for route-only, route-and-invoke, tool-select, outcome feedback, catalogs, policies, and health?  
_Recommendation:_ Yes internally; expose a simple route-and-invoke path plus advanced endpoints.

**O3. Dry run.** Can callers request a decision without invoking a model?  
_Recommendation:_ Yes, essential for evaluation, shadow mode, and debugging.

**O4. Idempotency.** Which operations accept idempotency keys, especially model invocation and feedback?  
_Recommendation:_ Both; tool execution stays outside Heimdall.

**O5. Timeouts/cancellation.** Can callers provide a total deadline and cancel in-flight classifier/model calls?  
_Recommendation:_ Yes.

**O6. Budget constraints.** Can callers supply per-request/task money and token budgets? Are they hard limits or preferences?  
_Recommendation:_ Support hard caps and soft targets separately.

**O7. Response metadata.** What is visible by default versus debug mode?  
_Recommendation:_ Selection, usage, cost estimate/actual, model version, selected tools, finish reason by default; full trace only in authorized debug mode.

**O8. Error taxonomy.** Which typed errors are required?  
_Recommendation:_ Invalid request, no eligible model, classifier unavailable, provider unavailable, context overflow, budget exceeded, policy denied, catalog stale, and normalized provider error.

**O9. Local testing.** Will SDKs include deterministic fake providers and fixed routing policies?  
_Recommendation:_ Yes.

**O10. Migration.** How easily can an existing direct-provider application adopt Heimdall?  
_Recommendation:_ Compatibility adapter plus explicit documentation of semantic differences.

## P. Commercial and organizational decisions

**P1. Pricing.** Charge per request, routed token, savings share, subscription, or enterprise contract?  
_Recommendation:_ Defer final pricing until savings and operating cost are measured; start with transparent usage pricing in pilots.

**P2. Savings claim.** Against which baseline may Heimdall claim savings, and who verifies it?  
_Recommendation:_ Customer-chosen baseline using auditable actual costs and matched outcomes.

**P3. Provider relationships.** Is Heimdall bring-your-own-key, reseller, or both?  
_Recommendation:_ BYOK first to reduce billing and procurement complexity.

**P4. Conflict of interest.** If Heimdall earns different margins across providers/models, how is unbiased routing guaranteed?  
_Recommendation:_ Optimize against customer-visible policy and disclose commercial incentives.

**P5. Support promise.** What happens when routing causes a regression or higher bill?  
_Recommendation:_ Decision trace, configurable safeguards, rapid rollback, and no absolute savings guarantee.

**P6. Open versus proprietary.** Which parts are open: schemas, SDKs, evaluator, report cards, routing policy, or none?  
_Recommendation:_ Open SDKs and schemas; decide policy/report-card openness based on distribution strategy.

## Q. Remaining terminology

**Q1. Product spelling.** Confirm `Heimdall` as canonical.  
_Recommendation:_ Yes, matching the workspace and latest usage.

**Q2. Gateway result.** What should the combined model/tool decision be called: route, execution profile, dispatch plan, or something else?  
_Recommendation:_ `Route decision`.

**Q3. Model report card.** Keep this term, or use model profile/candidate profile?  
_Recommendation:_ `Model profile` for operational data and `evaluation report` for evidence; “report card” risks mixing facts and scores.

**Q4. Intelligence.** Replace this term with task-conditioned quality except in marketing copy?  
_Recommendation:_ Yes.

**Q5. Importance.** Does this mean business priority, harm risk, quality sensitivity, or all three separately?  
_Recommendation:_ Separate them.

**Q6. Response speed.** Which canonical measures replace it?  
_Recommendation:_ Routing overhead, time to first token, time to first valid action, and completion latency.

**Q7. Repository.** Confirm `model catalog` and `tool catalog`, reserving repository for code/data repositories.  
_Recommendation:_ Yes.

## R. Final coherence checks

**R1.** Can a caller disable model invocation and request route-only behavior?  
_Recommendation:_ Yes.

**R2.** Can a caller disable all semantic classification and pin a model while still using normalized invocation?  
_Recommendation:_ Yes, useful for rollout and debugging.

**R3.** Does a new task always trigger selection, even when a model is explicitly pinned?  
_Recommendation:_ No; pinning bypasses selection until its scope ends.

**R4.** If tool selection is enabled but the request needs no tools, should the model receive an empty tool set?  
_Recommendation:_ Yes, with `no_tools_needed` in metadata.

**R5.** If the caller requests reevaluation for lack of progress, may Heimdall return the same model?  
_Recommendation:_ Yes, when evidence says another model would not improve expected utility; return the reason.

**R6.** If the task stays the same but hard requirements change, does eligibility force reevaluation?  
_Recommendation:_ Yes.

**R7.** Is model selection allowed to depend on selected tools, and tool selection on model capabilities? If both, how is the cycle resolved?  
_Recommendation:_ Jointly score compatible model/tool-set pairs after hard filtering, or use a bounded two-pass process; never an unbounded loop.

**R8.** Does Heimdall choose prompts/system instructions, or forward caller content unchanged apart from provider normalization?  
_Recommendation:_ Keep application prompts caller-owned; Heimdall may add a transparent routing/tool-use envelope only.

**R9.** Does Heimdall own conversation memory?  
_Recommendation:_ No in v1; accept caller-provided canonical state.

**R10.** What is the smallest v1 vertical slice you want built after this interview?  
_Recommendation:_ Route-only and route-and-invoke for text coding tasks across a small model catalog, caller-controlled tool selection, task stickiness, dry-run traces, and outcome feedback—without hedging or online learning.
