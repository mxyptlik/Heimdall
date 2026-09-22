# Heimdall

Heimdall is a model gateway for coding agents, ordinary chat applications, and retrieval-augmented generation applications, with optional tool selection and external tool execution. Coding agents are the initial workload; measurable quality and latency targets remain unresolved.

## Language

**Calling application**:
The agent, chat application, or RAG application using Heimdall for model invocation and optional tool selection while retaining responsibility for any tool execution.
_Avoid_: Calling agent when referring to all integrations.

**Task**:
A piece of work whose model invocations share an objective and retain a selected model by default.

**Task boundary**:
The transition to a new piece of work, inferred from the supplied context in V1 and optionally identified by a caller-provided task ID in V2.

**Tool selection**:
Heimdall's optional identification of suitable tools for the work, distinct from executing those tools.

**Selected tool set**:
The tools whose definitions Heimdall exposes to the selected model for an invocation.

**Model profile** (also called a report card):
A record of a model's capabilities, specialization, benchmark evidence, supported modalities, context capacity, pricing, and response speed.
_Avoid_: Intelligence score as a synonym for the entire report card.

**Route**:
The combined selection of an eligible model and, when enabled, caller-authorized tools for one invocation.

**Tool catalog**:
A collection of available tools and descriptions of the work each tool supports.
_Avoid_: Repository when referring to this catalog rather than a source-code repository.

## Relationships

- Heimdall considers **Model profiles** when selecting a model for work.
- When needed, Heimdall performs **Tool selection** using a **Tool catalog**; model routing also supports requests without tool selection.
- The **Calling application** explicitly enables or disables **Tool selection** and supplies its authorized **Tool catalog** when enabled; Heimdall may select no tools when none fit.
- The **Calling application** executes any tools; Heimdall selects and invokes the model.
- **Tool selection** determines the **Selected tool set**; the model sees only that set's tool definitions for the invocation.
- When tool selection applies, Heimdall reconsiders the **Selected tool set** before each model invocation as the work develops.
- Heimdall retains the current model across agent iterations by default; reconsidering tools does not require selecting a new model.
- A new **Task boundary** triggers fresh model selection, which may select the same model again.
- In V1, Heimdall infers whether incoming coding-agent work continues the current **Task** or begins another from the context supplied by the **Calling application**.
- When inferred **Task boundary** evidence is uncertain, Heimdall retains the current model by default.
- Within a continuing task, lack of progress does not cause automatic model reevaluation; Heimdall waits for the **Calling application** to request it.

## Product boundary

- Heimdall is delivered as a hosted gateway with an SDK and an OpenAI-compatible adapter.
- OpenRouter is the primary model-invocation aggregation path; native provider adapters may cover verified gaps. Heimdall retains responsibility for its own ranking and fallback choice.
- Heimdall is open source and may be self-hosted.
- The first controlled integration harness is `deepseek-ai/deepseek-harness` (`dsh`), initially checked out at commit `ddefc45`; later harness integrations may use connectors.
- V1 provides building blocks for coding-agent, chat, and RAG applications, with coding agents as the first validation focus.
- Initial users include AI application teams, agent frontend builders, individual developers, and enterprises.
- V1 excludes agent planning, tool execution, workflow orchestration, prompt management, and general observability.
- A provider marketplace is outside V1.
- Model evaluation exists only as an internal means of improving routing, rather than a standalone V1 product.

## V1 routing behavior

- Coding-agent integrations retain a selected model for the task; chat, RAG, and other profiles select per model invocation.
- A compound request uses the most capable eligible model for all contained work.
- V1 request understanding includes task continuity, intent/domain, risk/importance, modality needs, context needs, tool need, action types, and output type.
- Goal definition and complexity estimation are excluded from V1.
- The semantic decision engine is replaceable; TypeSafe/Jev is an initial candidate implementation.
- All modalities are represented as requirements, including text, image, audio, video, files, and mixed inputs; unverified support makes a model configuration ineligible.
- If no preferred candidate meets every desired constraint, Heimdall uses the strongest allowed model or an explicit fallback that meets the minimum requirements. It never relaxes hard safety, authorization, modality, or data-policy constraints silently.
- Select by hard eligibility and required quality/reliability/latency floors, then lowest expected total cost among survivors.
- Build separate model-profile and decision-feature caches first; keep tool-selection and final-decision caches separate. V1 does not cache provider responses or negative results.
- Retry transient same-model failures within a deadline, then invoke the next highest-ranked eligible model. Do not transparently change model after user-visible stream output begins.
- Heimdall does not verify model outputs; it may accept optional outcome evidence from the calling application.
- Coding-agent callers return the retained model and compact routing state on the next invocation; uncertainty about a task boundary means continuation. Chat and RAG select per invocation.
- Heimdall proxies a normalized response stream. If a same-model retry fails before visible output, Heimdall may invoke the next ranked eligible model within the deadline and budget.
- A caller/profile-specific quality baseline and maximum tolerated regression gate routing; sparse evidence uses conservative quality, cost, and latency bounds. The exact numerical thresholds come from evaluation.
- Hard money/token caps and soft targets are distinct. The first slice enforces per-invocation caps and accepts an optional caller-supplied remaining task budget.
- Optional model/tool coupling uses a bounded two-pass compatibility check, never unbounded recursive reselection.
- The first coding-agent integration is the DeepSeek Harness plugin/profile system; DSH owns its agent loop, tools, and history.

## Example dialogue

> **Dev:** "Does a chat application need tools to use Heimdall?"
> **Domain expert:** "No. Heimdall can select and invoke a model without tool selection; when tools are selected, the calling application executes them."

## Remaining implementation details and deferred work

- Product direction is resolved sufficiently to plan V1. Exact wire schemas, DeepSeek Harness plugin seams, candidate provider names, cache-key encoding, latency/SLO values, and numerical quality thresholds are engineering and evaluation tasks.
- The founder starred low-risk cold-start exploration (F11) and batched independent judgments (G7) for revisit before implementing those features. Delayed parallel invocation (J7–J11) is starred and deferred from the current build.
- Caller-supplied task IDs and compound-task splitting/rerouting are V2. Goal definition and complexity estimation are excluded from V1 without a later version assigned.
- Commercial decisions in Section P are deferred. Open-source licensing and packaging must be resolved before public distribution.
- “Confidence” in a routing judgment is distinct from measured downstream task success; both require calibration on representative task traces.
