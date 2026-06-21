# DevDigest — context map

Local-first AI PR reviewer. Course starter: minimal but works end-to-end
(add repo → clone+index → import PRs → agent reviews diff → grounded findings).
Comments tagged `T1/T2/T3` and `L01..L08` mark unbuilt course lessons — not dead code.

## Stack
- Node ≥22 · pnpm ≥10 · TypeScript 5.7 ESM (run via tsx in dev, no build step)
- server: Fastify 5 + Zod type-provider · Drizzle ORM · Postgres + pgvector (Docker)
- client: Next.js 15 App Router · React 19 · TanStack Query · Tailwind v4
- engine: reviewer-core — pure TS, zero I/O, only injected LLMProvider as side effect
- NOT a pnpm workspace: 4 packages, own package.json+lockfile, cross-package code shared via tsconfig path aliases (consumed as raw .ts source)

## Package map
- `server/`        Fastify API :3001       → server/CLAUDE.md
- `client/`        Next.js studio :3000    → client/CLAUDE.md
- `reviewer-core/` pure review engine      → reviewer-core/CLAUDE.md
- `e2e/`           agent-browser e2e flows → e2e/CLAUDE.md
- `@devdigest/shared` = Zod contracts. SOURCE OF TRUTH at `server/src/vendor/shared/`. reviewer-core aliases to it. client has a vendored copy (see Gotchas).

## Dev commands
```sh
./scripts/dev.sh              # Postgres (Docker) + API + web  [--no-seed --db-only --no-client]
cd server && pnpm db:migrate  # MUST run manually — migrations are never auto-applied on boot
cd server && pnpm db:seed     # idempotent demo data (optional)
cd server && pnpm test        # unit: exclude *.it.test.ts  /  integration: only *.it.test.ts
```

## Non-default conventions
- Module shape: `routes.ts → service.ts → repository.ts` (+ helpers/constants). Pure SQL only in repository.ts.
- All adapters (git, github, llm, codeIndex…) resolved via `platform/Container`; depend on interfaces from `@devdigest/shared`, never concrete classes. Tests inject via `ContainerOverrides`.
- Secrets ONLY via `SecretsProvider` — never read from `process.env` or `AppConfig` in feature code.
- `AppError` (+ subclasses) for typed HTTP errors; the global error handler in `app.ts` converts them to the `{ error: { code, message, details } }` envelope.

## Gotchas
- **Migrations not auto-applied** — `relation "x" does not exist` on first run = run `cd server && pnpm db:migrate`.
- **Vendored shared contract drift** — `client/src/vendor/shared/` is a physical copy of `server/src/vendor/shared/`. They have already diverged in 5 files. There is no sync script. Keep contracts in sync by hand when editing either side.
- **Fire-and-forget reviews** — `runReview` returns runIds immediately; the actual work runs via `void executor.executeRuns(...)`. The `runBus` is in-memory only. A mid-run crash = orphaned run (reaped on next boot). Not multi-replica safe.
- **Dual Zod instances** — because shared is vendored, `instanceof z.ZodError` can fail across module boundaries. The error handler does shape-based fallback detection; reviewer-core pins its own zod.
- **Schema tables for unbuilt lessons** — `db/schema/` contains eval/ci/knowledge/skills tables with no routes yet. Expected; part of the course scaffold.

## Do not touch
- `server/src/db/migrations/` — never hand-edit SQL. Generate only: `cd server && pnpm db:generate`, then review the output.
- `server/src/vendor/shared/` and `client/src/vendor/shared/` — always edit BOTH sides together. They are not linked; drift silently breaks the client contract.
- `skills-lock.json` — managed by the Claude Code harness. Do not edit manually.
- Tables in `db/schema/` tagged for unbuilt lessons (`eval`, `ci`, `knowledge`, `skills`) — schema ships in the starter; do not add routes or services for them until the relevant lesson.
- `scripts/dev.sh` and `scripts/e2e.sh` — course-distributed scripts; changes affect every student environment.

## Read when
- changing review behaviour or the prompt pipeline → `reviewer-core/README.md` + `reviewer-core/src/grounding.ts` + `reviewer-core/INSIGHTS.md` (review pipeline entry)
- touching repo-intel (tiers, indexer, degraded paths) → `server/src/modules/repo-intel/README.md` + `server/INSIGHTS.md` (repo-intel tiers entry)
- editing shared contracts or vendored types → `INSIGHTS.md` (shared contracts entry)
- touching JobRunner, clone/index chaining, or review fire-and-forget → `server/INSIGHTS.md` (fire-and-forget entry)
- editing test split (unit vs `*.it.test.ts` vs e2e) → `TESTING.md`
- editing or writing agent system prompts → `docs/agent-prompts/README.md`
- architecture diagram or flow overview → `README.md` (## Architecture section)
- non-obvious past decisions or fixes → each package's `INSIGHTS.md`

## Engineering insights (capture loop)
Per-module `INSIGHTS.md` files (plus a repo-wide root `INSIGHTS.md` for
cross-cutting findings) accumulate non-obvious findings across sessions
(Pattern / Mistake / Decision / Context). Managed by the `engineering-insights` skill.
- **Before implementing in a module**, READ that module's `INSIGHTS.md` first
  (`client` / `server` / `reviewer-core` / `e2e`; repo-wide → root `INSIGHTS.md`)
  and note any entry relevant to the task. Treat entries as high-confidence
  guidance unless told otherwise.
- **During work**, when something non-obvious surfaces, capture it via the
  `engineering-insights` skill (append-only; never overwrite).
- **At session end**, run `/engineering-insights` to do the wrap-up capture.
