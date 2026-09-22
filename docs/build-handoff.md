# Build handoff clarifications

Recorded 2026-09-22. Read with the implementation plan, system design and `../brain.md`. These clarify execution; they do not add product scope.

## Source authority and older research

Follow the agent environment's governing instructions and applicable repository instructions. Within project requirements, a newer explicit user decision supersedes an older recommendation. `decision-answers.md` and `../CONTEXT.md` capture product decisions; `system-design.md` describes the accepted engineering baseline; `implementation-plan.md` owns task status and dependencies; `../brain.md` owns execution evidence and change history. `v2-backlog.md` preserves exclusions. `v1-todo.md` is an overview, not a second task-status ledger.

Research is evidence, not additional scope. In particular, `research/typesafe-review.md` discusses possible difficulty and goal classifications from the early investigation. Complexity prediction and goal definition were subsequently excluded from V1. Do not implement them because an older example mentions them. Historical DSH integration questions are addressed by the design proposals and the T007 feasibility gate, not by assuming those proposals already work.

If sources conflict, identify the exact conflict and its dates. Resolve routine engineering differences with evidence and a recorded decision; ask the user if the resolution changes accepted product behavior or cannot be determined. Do not silently treat a newer timestamp as authorization to override an explicit user decision.

## Starting state is historical, not a command to reset

At the documentation handoff, no Heimdall runtime task was complete. The nested `deepseek-harness/` was an installed upstream checkout, not Heimdall's implementation. Its build and web launch were previously observed; current process health is unknown. Reinspect files, Git state and current task records before working. Never discard implementation added after this handoff or reinstall/reclone the harness merely to recreate the original state.

The original workspace is `C:\Users\User\Desktop\Heimdall`, using PowerShell. Another agent may receive this repository elsewhere: resolve paths from its actual root, avoid hard-coded machine paths, and use commands suitable for its shell. Keep the upstream checkout and `.pnpm-store` outside root workspace globs, scans, formatting and package publication. Do not rely on upstream transitive dependencies as Heimdall's undeclared runtime or test dependencies.

## Completion and external gates

The implementation plan is authorization for engineering scope, not evidence of access to credentials, a paid evaluation budget, production tenants, a chosen project license, or permission to publish. Use fake providers and deterministic fixtures for keyless development. Implement live integration paths even if their actual live verification must remain blocked; label that distinction precisely.

When a task is blocked, record the exact missing prerequisite and continue other dependency-ready work. Do not mark its dependent task DONE using an unfinished mock in place of the required acceptance evidence. If finer separation is useful, create stable child task IDs and preserve the parent completion gate as the plan permits. A local, tested build and a measured production-ready V1 are separate milestones; T053 cannot pass while mandatory live evaluation/pilot gates remain unmet.

Actual candidate models, numeric quality/latency gates and live prices are not hidden decisions waiting to be recovered from conversation. They are explicit selection/calibration tasks. Approved sources are OpenRouter metadata/pricing, official capability documentation, and held-out coding evaluations; public benchmarks are supporting evidence only. Start with a small licensed reproducible dataset and configurable shortlist. Never invent production scores or turn synthetic fixtures into measured evidence.

No additional unrecorded product requirements were identified during this handoff review. The reusable coding-agent instruction is in `../BUILD_PROMPT.md`.
