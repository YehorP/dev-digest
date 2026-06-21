# server — @devdigest/api (Fastify :3001)

> Before changing files here, read `server/INSIGHTS.md` first (engineering-insights capture loop).

HTTP API + persistence layer. Owns: routes, business logic, DB, background jobs, SSE bus, adapters (git/github/llm/codeIndex/depgraph). Does NOT own: pure review logic (→ reviewer-core), UI (→ client).

## Key entry points
- `src/server.ts` — listen + graceful shutdown
- `src/app.ts` — `buildApp()`: wires Zod type-provider, security plugins, DI container, global error handler, registers feature modules
- `src/platform/container.ts` — **DI root**. One instance per app. Lazily constructs every adapter; tests inject via `ContainerOverrides`
- `src/modules/index.ts` — static plugin registry. Add a module here + create `modules/<name>/routes.ts`
- `src/db/schema/` — per-domain Drizzle schemas (core, agents, pulls, reviews, repo-intel, runs, …)

## Module anatomy (repeat for every feature)
```
modules/<name>/
  routes.ts      HTTP endpoints + Zod request/response schemas
  service.ts     business logic; reaches into Container for adapters
  repository.ts  ALL SQL via Drizzle — no SQL elsewhere
  helpers.ts     pure transforms (no I/O)
  constants.ts   literals
```

## Platform layer (`src/platform/`)
- `container.ts` — DI; lazy adapter construction; `invalidateSecretCaches()` after key changes
- `jobs.ts` — `JobRunner` (p-queue, concurrency=3, timeout=120s, retries=2). Handlers registered by `kind`; enqueue persists a `jobs` row. CLONE → INDEX chaining happens here.
- `sse.ts` — `RunBus`: in-memory EventEmitter per runId; buffers events for late SSE subscribers; `complete()` fires the done signal and clears the emitter. SINGLETON (`runBus` export).
- `errors.ts` — `AppError`, `NotFoundError`, `ConfigError`. Always throw these, not plain Errors.
- `config.ts` — `loadConfig()`: Zod-validated env. Secrets (API keys) are deliberately absent — only `SecretsProvider` reads them.
- `run-logger.ts` — structured logger that fans events into the runBus + the Fastify logger simultaneously.

## Adapters (`src/adapters/`)
All implement interfaces from `@devdigest/shared`. Concrete classes: `SimpleGitClient`, `OctokitGitHubClient`, `RipgrepCodeIndex`, `OpenAIProvider`, `AnthropicProvider`, `OpenRouterProvider` (from reviewer-core), `OpenAIEmbedder`, `AstgrepSymbolParser`, `DepCruiseGraph`, `TiktokenTokenizer`.

## Repo-intel (`src/modules/repo-intel/`)
Dual-path design — read tier tags before trusting a method's data source:
- `T1` = best-effort ripgrep (no persistent index)
- `T2` = persistent index built by `pipeline/full.ts` → `repo_symbols`, `file_edges`, `file_rank` tables
- `T3` = repo-map cache + rank-driven enrichment

Pipeline: `pipeline/walk.ts` (file walk) → `pipeline/rank.ts` (graphology PageRank) → `pipeline/repo-map.ts` (token-budgeted text skeleton) → persisted to DB.

## Gotchas
- `runBus` is a module-level singleton. Tests that mock SSE must account for shared state.
- `db/schema/*.ts` includes tables for unbuilt lessons (eval/ci/knowledge/skills). No routes yet — expected.
- `ReviewService.runReview` is fire-and-forget (`void executor.executeRuns(...)`). HTTP returns before any LLM call.
- `invalidateSecretCaches()` must be called after settings save — otherwise stale LLM/GitHub clients serve new keys.
- Stale-run reaper (`ReviewService.reapStaleRuns`) runs on boot BEFORE the server accepts requests. Single-instance assumption only.

## Do not touch
- `src/db/migrations/` — never hand-edit SQL files. Modify `db/schema/*.ts`, then `pnpm db:generate` and review. Running `db:migrate` applies; there is no rollback.
- `src/vendor/shared/` — source of truth for `@devdigest/shared`. Any change here MUST be manually mirrored to `client/src/vendor/shared/` (no sync script).
- `platform/container.ts` — composition root only. No business logic here; services belong in `modules/<name>/service.ts`.
- `src/adapters/mocks.ts` — test-only mock adapters. Never import in production code paths.
- `db/schema/eval.ts`, `schema/ci.ts`, `schema/knowledge.ts`, `schema/skills.ts` — tables for unbuilt course lessons. Schema is present; do not wire routes or services until the lesson lands.
- `platform/sse.ts` `runBus` singleton — do not create additional instances. Tests that need SSE must reset state via the existing API, not construct a second bus.

## Read when
- repo-intel internals (pipeline, tiers, degraded paths) → `src/modules/repo-intel/README.md` + `server/INSIGHTS.md` (repo-intel tiers entry)
- why reviews are fire-and-forget (not JobRunner) → `server/INSIGHTS.md` (fire-and-forget entry)
- editing shared contracts → `../INSIGHTS.md` (shared contracts entry)
- full API route map → `server/README.md`
- DB-backed vs hermetic test split → `TESTING.md`
- non-obvious past decisions or fixes → `server/INSIGHTS.md`
