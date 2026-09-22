# Contract version policy (T002)

Single schema source: `src/schemas/heimdall.v1.json` (`$id`
`https://heimdall/schemas/contracts/v1`, an internal identifier, not a
resolvable URL). `src/generated/` and `openapi/components.json` are derived by
`pnpm --filter @heimdall/contracts generate`; never edit them by hand. CI
regenerates and fails on drift (`gen:check`).

## Change classes

- **Patch (no version bump):** descriptions, comments, and test-only fixture
  changes. Generated output must be byte-identical or the change is minor.
- **Minor (additive, stays `/v1`):** new optional property, new `$defs` entry,
  new allowed `extensions` key, loosened constraint (larger `maxLength`,
  wider numeric range), new OpenAPI component. Old payloads still validate;
  new payloads may require newer consumers.
- **Major (new `/vN` schema):** required property added, property
  removed/renamed, constraint narrowed, type changed, error code removed or
  redefined, `$id` version bump. Old and new payloads validate under different
  schema versions; the gateway accepts only its pinned version.

## Rules

- `additionalProperties: false` on every object: unknown fields fail instead
  of being silently dropped. `taskId`/`task_id`/`taskID` never exist in V1.
- Unknown `errorCode` values fail validation by design; consumers upgrade
  instead of guessing.
- Money is always `{ currency, amount }` with decimal-string amounts; binary
  floats never appear in contracts.
- Size bounds (`maxLength`, `maxItems`, `maxProperties`) are contract-level
  DoS limits and may only grow in a minor change.
