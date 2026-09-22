# Heimdall: initial brief and unresolved decisions

Captured 2026-09-20 from the founder's description and updated during the interview. Confirmed decisions are separated from proposals.

## Confirmed product boundary

Hemdall is a model gateway: it selects and invokes models. It also selects suitable tools for the work, but does not execute them; the calling agent owns tool execution. The founder confirmed this boundary in the first interview answer.

The founder chose filtered access: the selected model receives only the tool definitions Hemdall selects for that invocation. Hemdall reconsiders this tool set each iteration, but retains the current model by default rather than selecting a model from scratch on every call. Specific model-switch triggers remain open.

A compact snapshot of the original goal, progress, recent tool calls and results, available tools, and constraints has been recommended as selection input; the precise contract is not yet settled. Planning responsibilities, tool-call argument generation, and any explicit mechanism for requesting an omitted tool remain open.

For V1, coding-agent integrations retain a selected model for the task, while chat, RAG, other agents, and other application profiles select per model invocation. Caller-supplied task IDs are deferred to V2. Heimdall infers continuity from caller-supplied context; when uncertain, it retains the current model. The cross-invocation retained-model state contract remains open. A compound request uses the most capable eligible model for all parts; sub-task decomposition and rerouting are deferred to V2.

For lack of progress within a continuing task, Heimdall waits for the calling application to request model reevaluation rather than triggering it automatically. Mandatory handling for a model that becomes ineligible, unavailable, or unable to fit the context remains unresolved.

V1 request understanding includes task continuity, intent/domain, risk/importance, modality needs, context needs, tool need, independent action-type flags, and output type. Goal definition and complexity estimation are excluded. The decision engine is replaceable; TypeSafe/Jev is an initial implementation rather than a permanent dependency.

The founder has accepted by recommendation model upgrade/downgrade with switching costs (C5), a tool-definition token budget with optional count cap (D4), empirically safe context limits (E7), constrained minimum-cost selection after hard filtering (H1), and caller-defined risk tiers (H6). Cold-start exploration (F11) and batching independent judgments (G7) are accepted in principle but explicitly starred for revisit. Model-configuration identity (E4), missing catalog data (E10), specialization evidence (F2), quality-floor baseline (H2), and uncertainty penalty (H9) remain under discussion.

## Confirmed product and audience decisions

- Initial users: AI application teams, agent frontend builders, individual developers, and enterprises.
- First controlled integration: the DeepSeek harness. Later harnesses may be supported through connectors.
- Delivery: hosted gateway, SDK, and OpenAI-compatible adapter.
- Distribution: open source, with self-hosting supported.
- Application scope: provide the building blocks for coding-agent, chat, and RAG applications at launch, while validating first around coding agents.
- Partial value order: quality, then intelligence/task capability, then latency. Cost, reliability, privacy, and determinism have not yet been placed.
- V1 non-goals: agent planning, tool execution, workflow orchestration, prompt management, general observability, and a provider marketplace.
- Model evaluation is an internal product-improvement function, not a standalone V1 offering.

## Product intent

Coding agents are the initial workload. Heimdall also serves ordinary chat applications and RAG applications; these do not necessarily require tool selection. The calling application explicitly enables or disables tool selection and supplies its authorized tool catalog when enabled. Heimdall selects suitable tools from that catalog, potentially none; disabled requests skip tool selection. The exact API representation remains open. Use the founder's latest spelling, Heimdall; earlier captured descriptions use Hemdall.

Route work to a model with sufficient capability so that routine work does not unnecessarily incur frontier-model costs. Account for the goal, available tools, modality, reasoning demands, context size, specialization, task importance, pricing, and response speed. Preserve useful intelligence and responsiveness; measurable acceptance criteria are still to be agreed.

## Proposed workflow

User request → intent classification → goal interpretation, action identification, and tool identification → model selection → response.

The founder proposes evaluating goal, action, and tool requirements concurrently where possible, with later updates when one result supplies useful information to another. Whether intent classification itself needs a separate first call is open.

Action examples include search, tool use, direct generation, and retrieval-augmented generation. These may overlap within a task and must not be assumed to be mutually exclusive categories.

## Proposed supporting data

- A tool catalog containing tools and descriptions of their capabilities.
- Model report cards containing capabilities, specialization, benchmarks, modality, reasoning support, context capacity, prices, and latency information.
- A cache to avoid repeatedly looking up report-card information and possibly to reuse routing choices for recurring task configurations.

## Tentative latency behavior

If a selected model has not responded after an illustrative five seconds, launch the next-best candidate while the original continues. The founder explicitly has not committed to this behavior or cutoff.

This is a proposal for overlapping attempts, distinct from retrying after a failure or escalating after a quality check. Its scope, budget, selection rule, streaming behavior, and treatment of tool side effects are unresolved.

## Interview sequence

The founder initially requested one question at a time, then explicitly changed the interview format: ask every remaining Heimdall question in one comprehensive questionnaire. Update domain documentation as answers settle the design.

1. Product boundary resolved: model gateway with tool selection and external tool execution. Filtered tools are reconsidered each iteration; the current model is retained by default. Caller task IDs and sub-task rerouting are outside V1. Model-switch conditions and selection-input contracts remain open.
2. Initial workload resolved: coding agents, while also supporting normal chat and RAG applications with optional tool selection. Task continuity uses caller IDs when supplied and Heimdall classification otherwise. Initial customer and detailed integration contract remain open.
3. Quality baseline and acceptable regression, including uncertain or unsupported requests.
4. Latency definition, target, and total task budget.
5. Sources and freshness of model evidence; capabilities versus measured performance.
6. Independent classification questions and genuinely dependent stages.
7. Selection objective, hard constraints, and fallback behavior.
8. Model and tool catalog responsibilities, permissions, and missing capabilities.
9. Cache types, keys, invalidation, and fresh provider health checks.
10. Output verification, quality escalation, failure retries, and overlapping attempts.
11. Feedback collection and evaluation against simple baselines.

No architecture decision record has been adopted yet.
