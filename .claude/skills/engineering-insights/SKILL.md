---
name: engineering-insights
description: Captures durable engineering insights into per-module INSIGHTS.md files (client / server / reviewer-core / e2e). Use during a session the moment a non-obvious pattern, mistake, decision, or piece of context surfaces, when running the /engineering-insights wrap-up at the end of a task or session, and before editing a module (read its INSIGHTS.md first). Trigger terms: insight, learning, lesson, retro, retrospective, wrap-up, "remember this", "note this down", "capture".
---

# Engineering Insights — capture loop

Persist non-obvious findings so knowledge compounds across sessions instead of
resetting with the context window. Each module owns an append-only `INSIGHTS.md`;
this skill reads it before work and appends to it after.

This is the L01 capture loop: **skill-triggered** (capture-as-you-go + a
`/engineering-insights` wrap-up). There is no automatic hook — if you don't run
the wrap-up, nothing gets captured, so do not skip it on a substantive session.

## When to capture

Capture on sessions that hit **a real problem, decision, or discovery** — roughly
anything non-trivial (>~30 min of work, or a surprise that cost time). Two modes:

- **As you go** — the moment something non-obvious surfaces (a fix that took
  digging, a constraint you didn't expect, a deliberate trade-off), capture it
  immediately so it isn't lost.
- **Wrap-up** — at the end of a task/session, run `/engineering-insights` to
  sweep the whole session for anything worth keeping.

Skip trivial edits (typos, renames, formatting) — they produce no insight.

## The 4 categories

Tag every entry with exactly one:

- **[Pattern]** — a reusable approach that worked well here.
- **[Mistake]** — an error made and how it was corrected (antipattern to avoid).
  Negative learnings are often the most valuable — do not skip them.
- **[Decision]** — an architectural/technical choice plus the reasoning behind it.
- **[Context]** — project-specific terminology, constraints, env quirks, or
  undocumented dependencies.

## Module routing

Write to the `INSIGHTS.md` of the module the work touched:

| Touched | File |
|---|---|
| Fastify API, DB, jobs, adapters, repo-intel | `server/INSIGHTS.md` |
| Next.js UI, hooks, vendored client contracts | `client/INSIGHTS.md` |
| Pure review engine, grounding, prompt pipeline | `reviewer-core/INSIGHTS.md` |
| Browser e2e flows | `e2e/INSIGHTS.md` |
| Repo-wide / spans multiple modules (shared contracts, conventions, env) | `INSIGHTS.md` (repo root) |

Put a finding in exactly one file (don't duplicate across modules). Use the root
`INSIGHTS.md` only when it genuinely spans modules — otherwise prefer the most
relevant module.

## Read before write

Before capturing — and before editing any module — **read that module's
`INSIGHTS.md` first**. This applies prior guidance and prevents duplicate or
contradictory entries. If a new finding contradicts an existing entry, do not
overwrite it: append a dated correction that supersedes it.

## Entry format

Append under the `<!-- Add entries below this line -->` marker, newest at the
bottom. Append-only — never rewrite history.

```
## <what> — <YYYY-MM-DD or lesson tag> · [Pattern | Mistake | Decision | Context]
**Why:** the non-obvious reason
**How to apply:** what to do / not do next time, with a concrete file:line anchor
```

## Anti-banality test

> If it would be obvious to anyone who reads the code, don't write it.

Entries must be specific enough that an agent reading them **cold** knows exactly
what to do or avoid. Be concrete; include the command/path/symbol.

- ❌ vague: "Promises can be tricky."
- ✅ useful: "`Promise.all()` on the ingest pipeline times out after ~30 items —
  use `Promise.allSettled()` with batches of 10. See `pipeline/walk.ts`."
- ❌ vague: "be careful with async state."
- ✅ useful: "Checkout state must go through the cart store, not local state —
  3 components share it. `cartStore.ts`."

## Wrap-up procedure

Copy this checklist when running `/engineering-insights`:

```
- [ ] 1. Identify which module(s) the session touched
- [ ] 2. Read each touched module's INSIGHTS.md
- [ ] 3. Sweep the session for [Pattern]/[Mistake]/[Decision]/[Context] findings
- [ ] 4. Drop anything that fails the anti-banality test or duplicates an entry
- [ ] 5. Append surviving entries (dated, categorized) to the right module file
- [ ] 6. Report what was added — or say "nothing notable to capture"
```

It is fine — and common — to capture nothing on a routine session. Don't invent
filler to feel productive.

## Maintenance

- **Append-only.** Correct stale entries with a dated note; never silently edit.
- **Keep it dense with signal.** Prune fixed bugs, duplicates, and
  never-needed-again entries periodically, before the file becomes contradictory
  noise. Split per-domain if a single file grows large.
- `INSIGHTS.md` is a **draft under human spot-check**, not gospel — a bad entry
  propagates to every future session until someone corrects it, so review early.
- It is **not** a substitute for real docs/architecture references, and not a
  crutch for bad tooling — if the agent keeps relearning the same thing, fix the
  root cause instead.

See [references.md](references.md) for sources behind these conventions.
