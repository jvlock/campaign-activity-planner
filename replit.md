# Campaign Activity Planner

A generic campaign and activity planning platform with a versioned Webinar template.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- API contract: `lib/api-spec/openapi.yaml`
- Data model: `lib/db/src/schema/planning.ts`
- Governance boundary: `artifacts/api-server/src/lib/governance.ts`
- Schedule engine: `artifacts/api-server/src/lib/scheduling.ts`
- Web app: `artifacts/campaign-activity-planner`
- Product documents: `docs/`

## Architecture decisions

- Campaign Governance Foundation is authoritative; do not copy its taxonomy, naming, code, UTM, fiscal, or supersession logic.
- Development governance outputs are never final and must remain visibly pending.
- Webinar extends the generic Campaign Activity model.
- Calendar and journey views must project the same records.

## Product

Plan campaigns and Webinar activities, generate relative communication schedules, edit content, inspect readiness, preview rescheduling impact, and review governance/audit status.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Re-run OpenAPI codegen after every API specification change.
- Production RBAC is not complete until authentication is connected.
- Do not claim any external marketing platform is integrated until configured and verified.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
