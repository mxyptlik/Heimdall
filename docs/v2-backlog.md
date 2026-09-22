# Heimdall V2: explicitly deferred work

These items were removed from the active V1 plan by the founder's scope instruction. Their presence here preserves the idea without treating it as V1 work.

- **B4 — Caller-supplied task IDs.** Decide the ID format, tenant scope, lifetime, task-boundary semantics, and how IDs interact with per-invocation request IDs. This supersedes a later ambiguous acceptance of the original B4 recommendation; the founder's explicit “remove things I asked you to defer to V2” resolves the conflict in favor of deferral.
- **B7 — Compound-task decomposition and separate model routing.** V1 uses the most capable eligible model for a compound request; V2 may split it into sub-tasks and route them separately.

Goal definition (G3) and complexity estimation (G6) were explicitly excluded from V1, but the founder has not assigned either to V2. They are intentionally absent from the committed V2 backlog until that timing is decided.
