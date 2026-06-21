# client — @devdigest/web (Next.js :3000)

> Before changing files here, read `client/INSIGHTS.md` first (engineering-insights capture loop).

Next.js 15 App Router studio. Owns: UI, routing, data fetching. Does NOT own: any business logic (all state lives on the server).

## Key entry points
- `src/app/` — App Router pages. Route map in `client/README.md`.
- `src/lib/api.ts` — typed fetch client (`apiFetch`, `api.get/post/put/patch/del`). All server calls go through here. Base URL = `NEXT_PUBLIC_API_BASE` (default `http://localhost:3001`).
- `src/lib/hooks/` — TanStack Query hooks per domain (`agents.ts`, `reviews.ts`, `repo-intel.ts`, `trace.ts`). Data fetching lives here, not in components.
- `src/vendor/shared/` — **copy** of server's Zod contracts (see Gotchas). Import types from here.
- `src/vendor/ui/` — vendored design-system primitives (Button, Badge, Card, Modal, Tabs, …). Do not redesign ad hoc — extend the kit.

## File conventions
- Page components: `src/app/<route>/page.tsx` (RSC by default)
- Feature UI: `src/app/<route>/_components/<Name>/<Name>.tsx` with co-located `index.ts`, `styles.ts`, `constants.ts`, `helpers.ts`
- Shared non-route UI: `src/components/<name>/`
- Hooks: `src/lib/hooks/<domain>.ts`
- i18n strings: `messages/en/<feature>.json` via `next-intl`

## Data flow
```
page.tsx (RSC)
  → TanStack Query hook (src/lib/hooks/)
    → apiFetch (src/lib/api.ts)
      → Fastify :3001
```
SSE (live run events): `EventSource` on `/runs/:id/events`; wired in `src/lib/hooks/trace.ts`.

## Gotchas
- `src/vendor/shared/` is a PHYSICAL COPY of `server/src/vendor/shared/`. Already diverged in 5 files (`adapters.ts`, `contracts/trace.ts`, `contracts/knowledge.ts`, `contracts/eval-ci.ts`, `contracts/productionize.ts`). When changing a shared contract, update BOTH sides manually.
- `src/vendor/ui/` is vendored — treat as an internal library. Don't scatter one-off primitives; add to the kit instead.
- There is no API proxy in Next.js — browser talks directly to `:3001`. CORS is configured server-side to allow `http://localhost:3000`.
- TanStack Query v5: `useQuery` options object API only (no positional overloads). `queryKey` arrays must be stable (use constants from `src/lib/hooks/`).

## Do not touch
- `src/vendor/shared/` — copy of `server/src/vendor/shared/`. Never add types here that don't exist on the server side. When editing, mirror changes to `server/src/vendor/shared/` manually.
- `src/vendor/ui/` — vendored design-system kit. Do not scatter one-off primitive components outside of it; extend the kit or use existing primitives. Do not delete or rename exports — other feature components depend on them.
- `messages/en/*.json` files for unbuilt features (`blast`, `eval`, `ci`, `memory`, `conventions`, `onboarding`, `skills`, `compose`, `conformance`, `agentPerformance`) — i18n strings ship ahead of the feature. Do not remove; do not rename keys.
- `next.config.mjs` — minimal intentionally. Do not add rewrites/proxies to route through Next.js to the API; the browser calls `:3001` directly.

## Read when
- UI route map and component tree → `client/README.md`
- UI kit primitives → `src/vendor/ui/README.md`
- why contracts are vendored + how to sync them safely → `../INSIGHTS.md` (shared contracts entry)
- non-obvious past decisions or fixes → `client/INSIGHTS.md`
