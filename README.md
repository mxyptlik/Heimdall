# Heimdall

Hosted and self-hostable model gateway (V1 scaffold, T001). See `CONTEXT.md`,
`docs/system-design.md`, `docs/implementation-plan.md`, and `brain.md`.

`deepseek-harness/` is an upstream reference checkout, not a Heimdall workspace.
It stays out of workspace globs, compilation, formatting, and publication.

## Pinned tooling (T001)

| Tool                   | Pinned version                    | Source                                                     |
| ---------------------- | --------------------------------- | ---------------------------------------------------------- |
| Node                   | 24.11.1 (engines `>=24.11.1 <25`) | verified `node --version` on dev host                      |
| pnpm                   | 11.19.0 (`packageManager`)        | verified `pnpm.cmd --version` on dev host                  |
| TypeScript             | 5.9.3                             | last stable 5.x; avoids TS 6/7 breaks while DSH uses 6.0.3 |
| Vitest                 | 4.1.8                             | matches proven upstream checkout tooling on this host      |
| Prettier               | 3.6.2                             | formatting/lint baseline                                   |
| Fastify                | 5.12.5                            | gateway HTTP adapter baseline (`@heimdall/gateway`)        |
| Ajv                    | 8.20.0                            | contract schema compilation baseline                       |
| PostgreSQL driver `pg` | 8.23.0                            | storage adapter baseline (real DB work lands in T020+)     |
| `@types/node`          | 24.11.1                           | matches runtime                                            |

## Local setup (Windows PowerShell; `pnpm.cmd` avoids the `.ps1` execution-policy block)

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd boundaries
pnpm.cmd typecheck
pnpm.cmd test
```

Copy `.env.example` to `.env` for local secrets. Never commit `.env` or values.

## Layout and boundaries

- `apps/gateway/src/main.ts` is the sole composition root; `src/modules/*/public.ts`
  are the only cross-module import targets.
- `packages/contracts` is the shared schema leaf; it imports nothing internal.
- `sdk/typescript` imports contracts only, never server internals.
- `integrations/deepseek-harness` imports the SDK plus supported public DSH
  packages only, never private agent-loop files or server internals.
- `scripts/check-boundaries.mjs` (`pnpm boundaries`) enforces the above plus
  workspace/`.gitignore` exclusion of `deepseek-harness/` and `.pnpm-store/`.
