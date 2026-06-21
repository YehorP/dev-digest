# repo-wide — engineering insights

Captured by the `engineering-insights` skill. Cross-cutting / repo-wide findings
that don't belong to a single module (shared contracts, repo-wide conventions,
env quirks). Module-specific insights live in `<module>/INSIGHTS.md`. NOT
derivable from reading the code. One entry = one short block. Append-only — never
overwrite; correct a stale entry with a dated note.

Format:
## <what> — <date or lesson tag> · [Pattern | Mistake | Decision | Context]
**Why:** the non-obvious reason
**How to apply:** what to do / not do next time

---

<!-- Add entries below this line -->

## Shared contracts: vendored copy rationale, drift risk & dual-Zod — 2026-06-20 (migrated) · [Decision]
**Why:** the project is deliberately not a pnpm workspace (each package runs independently with its own lockfile), so `@devdigest/shared` is vendored at `server/src/vendor/shared/` and consumed via tsconfig path aliases instead of a published package.
**How to apply:** when editing either `vendor/shared/`, grep the matching file on the other side and mirror the change by hand — there is no sync script or CI check yet. Don't rely on `instanceof ZodError` across package boundaries.

### Why vendored, not a published package
`@devdigest/shared` (Zod contracts + interfaces) lives at `server/src/vendor/shared/` and is consumed via tsconfig path aliases. There is no separate published npm package.

A published internal package would require either a workspace or a local registry — both add operational overhead that distracts from the course. **Cost accepted:** the client cannot alias to the server's source directly (different TS compilation context, different `baseUrl`), so `client/src/vendor/shared/` is a physical copy.

### The drift problem
`reviewer-core` aliases to `server/src/vendor/shared/` — zero drift, always in sync. The client copy (`client/src/vendor/shared/`) has already diverged in 5 files:
- `adapters.ts`
- `contracts/trace.ts`
- `contracts/knowledge.ts`
- `contracts/eval-ci.ts`
- `contracts/productionize.ts`

Current drift is comments only, so runtime behaviour is unchanged. But there is no sync script and no CI check — future structural drift would silently break the client's type assumptions about server responses. A future L08 lesson adds a `scripts/sync-shared.sh` check to CI.

### Dual Zod instance problem
Because `shared` is vendored and each package has its own `node_modules`, two separate copies of `zod` can be loaded in the same Node process. This breaks `instanceof ZodError` across the boundary.

**Workarounds in place:**
1. `app.ts` error handler does shape-based ZodError detection as fallback (`maybeZod.name === 'ZodError' && Array.isArray(maybeZod.issues)`).
2. `reviewer-core/tsconfig.json` pins `zod` to its own `node_modules` explicitly, ensuring it never accidentally resolves to the server's copy.

## node/pnpm are not on the default tool PATH (Windows dev box) — 2026-06-21 · [Context]
**Why:** the Bash and PowerShell tools start without node/pnpm/corepack on PATH (`pnpm: command not found`). They live at `C:\Program Files\nodejs\node.exe` and `%APPDATA%\npm\pnpm`. Also: `reviewer-core` has no local `typescript`, and its `pnpm typecheck` runs `pnpm install` first, which can `EPERM` on a locked `node_modules/openai` while the dev server is running.
**How to apply:** prefix PowerShell commands with `$env:Path = "C:\Program Files\nodejs;$env:APPDATA\npm;$env:Path";` before any `pnpm`/`node`. To typecheck reviewer-core changes, run `pnpm -s typecheck` from `server/` (it compiles reviewer-core through the path alias) — don't run tsc in `reviewer-core/` directly. Server typecheck currently has 2 pre-existing unrelated errors in `db/migrate.ts` and `db/seed.ts` (`string | undefined`); ignore those, they're not yours.
