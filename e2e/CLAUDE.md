# e2e — @devdigest/e2e (agent-browser flows)

> Before changing files here, read `e2e/INSIGHTS.md` first (engineering-insights capture loop).

Deterministic browser end-to-end tests. NO LLM calls — all review behaviour is stubbed or skipped. Tests the real stack: Postgres + server :3001 + client :3000 must all be running.

## How it works
- `run.ts` — driver. Reads flow JSON files from `specs/`, executes steps via `agent-browser.json` config.
- `specs/*.flow.json` — declarative test flows. Each step is `{ action, selector/url/value, assert? }`. These ARE the product specs for the UI.
- `lib/assert.ts` — assertion helpers used by the driver.
- `agent-browser.json` — agent-browser runtime config (browser launch, viewport, timeouts).

## Flows (what they cover)
| File | Scenario |
|---|---|
| `01-app-boot.flow.json` | App loads, nav renders |
| `02-repo-pulls-detail.flow.json` | Repo list → pull detail page |
| `03-agents.flow.json` | Agent list, create, edit |
| `04-pr-findings.flow.json` | Run review → findings appear |
| `05-pr-diff.flow.json` | Diff viewer renders correctly |
| `06-onboarding.flow.json` | Add repo flow |
| `07-settings.flow.json` | Settings page, key save |

## Running
```sh
./scripts/e2e.sh   # spins up full stack + runs all flows
```
Needs Docker (Postgres) + `GITHUB_TOKEN` in env.

## Gotchas
- No LLM in e2e — review runs are seeded/stubbed. Don't add real LLM assertions here.
- The `specs/` folder here is JSON browser flows, not product requirement docs.
- Flow steps are brittle to selector changes — prefer `data-testid` attributes over text/CSS selectors.

## Do not touch
- **No real LLM calls in flows** — all review behaviour must be seeded/stubbed. Adding live LLM assertions makes the suite non-deterministic and breaks CI.
- `specs/*.flow.json` format — the JSON step schema is consumed by the `agent-browser` runner. Do not invent new action types without updating the driver in `run.ts` and the runner config in `agent-browser.json`.
- `agent-browser.json` — runtime config for the browser agent. Do not change viewport/timeout defaults without verifying all 7 flows still pass; timings are tuned to the seed data.

## Read when
- flow format and available actions → `e2e/README.md`
- CI setup for e2e → `TESTING.md` (e2e-web.yml row)
- non-obvious past decisions → `e2e/INSIGHTS.md`
