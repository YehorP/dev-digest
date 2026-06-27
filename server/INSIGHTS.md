# server — engineering insights

Captured by the `engineering-insights` skill. NOT derivable from reading the code:
hidden constraints, "we tried X and it broke Y", gotchas found at runtime,
deliberate trade-offs. One entry = one short block. Append-only — never overwrite;
correct a stale entry with a dated note. Read this file before changing files in
this module.

Format:
## <what> — <date or lesson tag> · [Pattern | Mistake | Decision | Context]
**Why:** the non-obvious reason
**How to apply:** what to do / not do next time

---

<!-- Add entries below this line -->

## Reviews are fire-and-forget, not JobRunner — 2026-06-20 (migrated) · [Decision]
**Why:** reviews need SSE streaming (live per-run event bus) + per-run cancellation; JobRunner has neither, and bolting them on would over-engineer the clone/index use case. So reviews take a separate, simpler path.
**How to apply:** keep reviews on `void executor.executeRuns(...)`, NOT JobRunner. Accept the costs below and treat the stack as single-instance.

### What exists: JobRunner (p-queue + jobs table)
`platform/jobs.ts` wraps p-queue with a Postgres `jobs` table. Every job gets a row with status (`queued → running → done/failed`), attempt count, and error text. Concurrency=3, timeout=120s, retries=2 with backoff. Used for: `clone`, `index`, `refresh`, `resync` (slow, background, retriable).

### What reviews use: fire-and-forget void
`ReviewService.runReview` creates the `agent_run` rows immediately (so the client gets runIds to subscribe to), then calls `void executor.executeRuns(...)` — not enqueued via JobRunner, not persisted to the `jobs` table.

**Cost accepted:**
- A mid-run server crash orphans the run. The stale-run reaper on boot recovers status rows but cannot replay the partial results.
- The in-memory `runBus` does not survive a restart — live SSE clients disconnect.
- Not multi-replica safe: two API instances would both try to reap each other's runs. Documented as a single-instance assumption.

### Why JobRunner has no priority queue
All background work is treated equally (FIFO within the concurrency limit). A future lesson (L07) adds multi-agent parallelism and may need prioritisation, but for the starter the simplicity of a flat queue is deliberate.

### Chaining: clone → index
After a successful clone, `RepoService.runCloneJob` enqueues `INDEX_JOB_KIND` as a follow-up. Best-effort chain: if the index handler isn't registered (e.g. `repo-intel` module not wired) the enqueue throws and is silently swallowed — the clone result is preserved. Trigger a manual reindex via `POST /repos/:id/reindex`.

## Repo-intel tiers (T1/T2/T3) + degraded-by-default — 2026-06-20 (migrated) · [Decision]
**Why:** repo-intel is built incrementally across lessons; each tier ships a working (if limited) implementation behind the same interface so a missing index never breaks a review.
**How to apply:** read a method's inline `T1/T2/T3` tag before trusting its data source. Never let an intel failure throw — return a `degraded: true` result instead.

### Why tiers (T1 / T2 / T3)
- **T1** — best-effort, ephemeral. ripgrep + ast-grep on the live clone at call time. No persistent index. `rank: 0` everywhere. Fast to ship, correct enough to be useful.
- **T2** — persistent index. `pipeline/full.ts` walks files, extracts symbols + import edges, runs graphology PageRank, persists to `repo_symbols` / `file_edges` / `file_rank`. Blast radius and caller signatures use the DB, not ripgrep on every call.
- **T3** — repo-map cache + rank-driven enrichment. Pre-rendered token-budgeted repo skeleton in `repo_map_cache`. Hot-file rank notes injected into the review prompt.

Every method in `RepoIntelService` has inline `T1/T2/T3` comments marking which path is active. When touching a method, read the tier tag to understand its real data source.

### Degraded-by-default contract
Every facade method returns a valid but `degraded: true` result instead of throwing. Array methods return `[]`; object methods return a struct with `degraded: true` and a `reason` string.

**Why:** a repo-intel failure must never break a review. Reviews are the core product; intel is enrichment. If the index is missing, stale, or the flag is off, the prompt falls back to the pre-enrichment shape automatically — no conditional logic in the caller.

**Acceptance test (from code comments):** `REPO_INTEL_ENABLED=false` must produce a byte-identical prompt to the pre-T1 baseline. The per-agent `agent.repoIntel=false` toggle has the same guarantee.

### `REPO_INTEL_ENABLED` flag
Global off-switch. When false, every facade method short-circuits to `[]` / degraded before doing any work. Per-agent override (`agents.repo_intel`) takes precedence and skips enrichment for that agent only, independently of the global flag.

## `completeAgentRun`'s value-object type is declared in TWO places — 2026-06-21 · [Mistake]
**Why:** the `values` shape is written out twice — inline in `modules/reviews/repository/run.repo.ts` (`completeAgentRun`) AND re-declared in the `ReviewRepository` wrapper in `modules/reviews/repository.ts`. Adding a field to one compiles locally but fails typecheck at the *call site* (`run-executor.ts`) with a misleading "Object literal may only specify known properties" pointing at the executor, not the repo.
**How to apply:** when adding a persisted run field (hit this adding `cost_usd`, then the `critical/warning/suggestion_count` columns), update BOTH the inline type in `run.repo.ts` and the wrapper type in `repository.ts`, PLUS the `.set({})` in `run.repo.ts`, PLUS the `listRunsForPull` row mapping. Four edits, not one.

## Per-PR list metrics are derived "latest run per agent", not denormalized — 2026-06-21 · [Pattern]
**Why:** `score`, `cost_usd`, and the per-severity findings counts on `GET /repos/:id/pulls` are computed on read in `modules/pulls/routes.ts` (~line 122): one query over `reviews` left-joined to `agent_runs`, ordered `createdAt desc`, taking the first-seen row per `(prId, agentId)` = each agent's latest review run, then summed = the "latest review batch" (matches the PR-detail accordions). There is no per-PR denormalized column for these.
**How to apply:** to add another per-PR list metric, extend that single query + the existing JS grouping loop — don't add a DB column or a second query. Emit `null` for never-reviewed PRs (client renders "—"); never coerce to 0.
