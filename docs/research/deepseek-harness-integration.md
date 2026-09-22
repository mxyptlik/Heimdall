# DeepSeek Harness integration reconnaissance

Source: local checkout of `deepseek-ai/deepseek-harness` at `ddefc45` (2026-09-21). This is an integration finding, not an implementation decision.

DeepSeek Harness (`dsh`) is the first coding-agent host for Heimdall. DSH itself owns the agent loop, session history, tool execution, permissions, and UI. Heimdall remains the model gateway: it selects and invokes a model and may recommend/select which caller-authorized tool definitions the model sees. It does not execute DSH tools.

## Existing seams

- `docs/architecture.md` describes plugin composition through `dsh` profiles and states that model adapters register on `ctx.llm`. Use a profile patch or installed plugin, not a fork of the agent loop, for the first integration.
- `docs/cookbook/adding-an-llm-adapter.md` specifies an adapter registered with `ctx.llm.registerAdapter()`. `options.provider` chooses the adapter and `options.model` chooses a provider model. A Heimdall adapter could carry DSH's provider-neutral request to the Heimdall gateway, then translate Heimdall's response stream back into DSH `StreamChunk`s. It must preserve raw JSON tool-call arguments, usage-before-finish ordering, cancellation, and stable errors.
- `packages/core/agent/src/model-selection.ts` shows a paired `system-prompt/assemble` and `agent/request` integration. The latter can replace provider/model before `prepareCall()` and before pending user/system input is committed. If Heimdall chooses models dynamically, its decision must be reconciled with this existing model-selection listener and with DSH's logged route; simply changing a provider behind an unchanged header would make attribution incorrect.
- `packages/llm/llm/README.md` says requests are frozen before `llm/stream`; that hook observes a request but cannot safely change the selected model or tools. DSH's `llm-retry` package owns retry at durable agent-step boundaries. Heimdall fallback must be coordinated with this retry path to avoid duplicated retries and inaccurate usage attribution.
- `docs/subsystems/tools.md` describes `ctx.tools.schemas(scope)` and `ToolRestriction`. DSH owns tool execution. A scope restriction can filter inherited tools, but scope-owned registrations are exempt and the reserved PTC transport is special. Thus optional Heimdall tool selection needs a separate, explicit integration with DSH's assembly/tool visibility rules; merely returning selected names from the model adapter does not filter the model-visible tool set.

## Questions for implementation design

1. Where should the route decision occur so Heimdall sees the relevant task state and tool catalog before DSH freezes/logs a request, while DSH records the actual selected model and provider?
2. Should the first slice route through a single `heimdall` adapter that internally invokes OpenRouter, or use `agent/request` to select among DSH adapters? The former is simpler for gateway invocation but needs accurate actual-model attribution; the latter uses DSH's native route logging but may duplicate provider normalization.
3. How should Heimdall's task-retention state map to DSH session/turn/step information without introducing V1 task IDs?
4. How should Heimdall's next-ranked-model fallback interact with `dsh-llm-retry` and with DSH's no-switch-after-visible-stream rule?
5. How can optional selected-tool definitions be applied before request assembly, including scoped tools and PTC mode, while leaving permission checks and execution in DSH?

These questions should be answered with a thin keyless adapter/prototype before committing to the production connector.
