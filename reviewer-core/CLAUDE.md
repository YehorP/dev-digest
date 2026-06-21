# reviewer-core — @devdigest/reviewer-core (pure engine)

> Before changing files here, read `reviewer-core/INSIGHTS.md` first (engineering-insights capture loop).

The review engine. **PURE**: no DB, no GitHub, no filesystem access. The only side effect is an LLM call through an injected `LLMProvider`. Consumed by the server (local studio reviews) and the CI agent-runner (future lessons) as raw TypeScript source via tsconfig path alias — this package never emits JS; its `build` is a type-check only.

## Entry point
`src/index.ts` — all public exports. Consumers import from `@devdigest/reviewer-core` (alias resolves to `src/index.ts`).

## Key files
- `src/review/run.ts` — `reviewPullRequest()`: the engine entry point. assemble prompt → single-pass or map-reduce per file → reduce → grounding gate → `ReviewOutcome`.
- `src/prompt.ts` — `assemblePrompt()`: builds the message array from (system + skills + memory + specs + callers + repoMap + prDescription + diff). Wraps untrusted sections with delimiter guards.
- `src/grounding.ts` — **the trust gate**. A finding is kept ONLY if its `[start_line, end_line]` intersects a real diff hunk in the correct file. `FULL_FILE_KINDS` (`secret_leak`, `lethal_trifecta`, `phantom`, `hook`) only require the file to be present. Score is recomputed from surviving findings so verdict + list + score always agree.
- `src/review/reduce.ts` — `reduceReviews()`: merges partial reviews from map-reduce; takes worst verdict, mean score. `sliceDiff()` splits a unified diff to one file.
- `src/llm/openrouter.ts` — `OpenRouterProvider`: the one OpenAI-compatible structured provider. Shared by server (openrouter path) and CI runner. Owns session grouping.
- `src/llm/structured.ts` — `parseWithRepair()`: Zod → JSON Schema → LLM structured output with retry/repair on parse failure.

## Review flow
```
reviewPullRequest(input)
  selectMode(strategy, diff)   → 'single-pass' | 'map-reduce'
  assemblePrompt(parts + diff) → { messages, assembly }
  llm.completeStructured(...)  → Review (per chunk, or whole diff)
  reduceReviews(partials)      → merged Review
  groundFindings(findings, diff) → { kept, dropped }
  scoreFromFindings(kept)      → recomputed score
```

## Gotchas
- `@devdigest/shared` resolves to `../server/src/vendor/shared/index.ts` via tsconfig alias — NOT a copy. When shared types change, reviewer-core picks them up automatically.
- `zod` is pinned to reviewer-core's own `node_modules` (tsconfig `paths` entry) to avoid `instanceof ZodError` failures caused by duplicate Zod instances across packages.
- `reviewPullRequest` is a pure function. The caller (server's `run-executor.ts`) owns all I/O: repo-intel context resolution, persistence, SSE streaming, run tracing.
- `onEvent` callback and `checkCancelled` are optional. CI runner supplies neither; server supplies both.
- Map-reduce only fires when diff is **both** large (>`mapThresholdLines`) **and** multi-file. Single large file = single-pass.

## Do not touch
- **No I/O in this package** — never add `import fs`, `import { db }`, GitHub client, or any network call to this package. The only allowed side effect is the injected `LLMProvider`. If you need I/O, it belongs in the caller (`server/src/modules/reviews/run-executor.ts`).
- `src/llm/openrouter.ts` — shared with the future CI agent-runner. Changes to the provider interface or session-grouping logic affect both consumers. Do not add server-specific dependencies here.
- `src/index.ts` — the public API surface. Do not remove or rename exports; the server and (future) CI runner both import from this file. Additions are fine; removals are breaking.
- The `@devdigest/shared` alias points to `server/src/vendor/shared/` — do not add a local copy or change the alias to point elsewhere.

## Read when
- full pipeline diagram → `reviewer-core/README.md`
- why pure/impure split, grounding as post-step, map-reduce threshold decisions → `reviewer-core/INSIGHTS.md` (review pipeline entry)
- why Zod is pinned + dual-instance problem → `../INSIGHTS.md` (shared contracts entry)
- non-obvious past decisions or fixes → `reviewer-core/INSIGHTS.md`
