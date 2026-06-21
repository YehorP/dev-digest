# reviewer-core — engineering insights

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

## Review pipeline design decisions (pure engine, grounding, map-reduce) — 2026-06-20 (migrated) · [Decision]
**Why:** the same engine is reused by the local studio (server) and the future CI agent-runner, which have different I/O; keeping `reviewer-core` pure means neither consumer untangles the other's code, and the engine stays fully unit-testable without mocks.
**How to apply:** never add I/O to `reviewer-core` — the caller (`run-executor.ts`) owns it. Ground once on the merged result; derive score from surviving findings; keep `onEvent`/`checkCancelled` optional.

### Pure engine / impure shell split
`reviewer-core` has zero I/O. The only side effect is the injected `LLMProvider`. The server's `run-executor.ts` owns everything else: repo-intel context resolution, diff loading, SSE streaming, DB persistence, run tracing.

**Trade-off accepted:** the caller (`run-executor.ts`) is necessarily large because it owns all the I/O that surrounds a review. Intentional — complexity is concentrated in one place rather than scattered.

### Grounding as a post-step, not per-LLM-call
Citation grounding (`groundFindings`) runs ONCE on the merged result, not after each map-reduce chunk.

**Why:** in map-reduce mode, reducing first then grounding once is cheaper and produces a consistent final set. Grounding per-chunk would drop findings that are valid across the full diff context but look like mismatches on a single-file slice.

**Score recomputation:** score is derived from findings that SURVIVED grounding, not the model's self-reported number. This keeps verdict, findings list, and score in agreement even when grounding drops items.

### Map-reduce threshold
Fires only when diff is BOTH large (>`mapThresholdLines`, default 400 lines) AND multi-file. A single large file stays single-pass.

**Why:** map-reduce splits context; for a single file the model benefits from seeing the whole diff at once (hunks reference each other). Multi-file large diffs are the case where per-file chunking actually improves signal quality.

### `onEvent` / `checkCancelled` are optional
The CI runner supplies neither. The studio supplies both (SSE streaming + cancel button). Keeping them optional means the engine works in both contexts without conditional logic inside it. The contract: if you don't supply a callback, events are silently dropped and cancellation is never checked.

## OpenRouter "Premature close" on long generations = the OpenAI SDK transport, not idle/timeout — 2026-06-21 · [Context]
**Why:** real reviews fail with `Invalid response body … Premature close (code=ERR_STREAM_PREMATURE_CLOSE)` thrown from `llm/openrouter.ts`. Isolated it with a controlled probe (raw Node `fetch` vs the `openai` SDK, identical key/model/request): raw `fetch` completes an 8000-token / ~200s generation fine, while the `openai` SDK dies mid-body at ~140–210s. Root cause: slow models (deepseek v3/v4 ≈ 40 tok/s) make a full structured review a multi-minute request, and the SDK's HTTP layer is fragile on long OpenRouter responses. Two things that DON'T fix it (both tested): (1) SDK **streaming** (`stream:true`) — still premature-closes; (2) raising the 90s `timeoutMs` — failures happen *past* 90s, so the abort is a connection reset, not the timeout firing.
**How to apply:** do NOT "fix" this by switching `completeStructured` to SDK streaming — that edit is ineffective. Either run a fast model, or replace the `this.client.chat.completions.create(...)` call with a direct `fetch` to `${baseURL}/chat/completions` (raw fetch is the only transport proven resilient here; accumulate the response, keep the `parseWithRepair` loop + `usage.cost` extraction).

**Update 2026-06-21:** done. `OpenRouterProvider` no longer uses the `openai` SDK for completions — `completeStructured` now POSTs via `postChatCompletion()` (raw `fetch`, `AbortController` timeout, backoff retries on 429/5xx). The `openai` dep stays only because `structured.ts` still uses `openai/helpers/zod` for schema conversion. SDK client field removed.
