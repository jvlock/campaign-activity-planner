# Campaign Activity Planner

Campaign Activity Planner is a generic campaign and activity planning platform. Its first complete, versioned activity template is Webinar. Campaign Governance Foundation remains authoritative for taxonomy, naming, codes, UTM rules, fiscal assignments, and supersession.

## Current vertical slice

- Campaign plans with immutable UUIDs, lifecycle state, ownership, and governance references
- Versioned Webinar activity template
- Guided webinar setup and generated email communications
- Business-day-aware relative scheduling
- Calendar/journey workspace backed by the same records
- Communication content editing, destination assignment, readiness checks, approvals, and audit events
- Event reschedule impact preview with sent and pinned item protections
- Development GovernanceProvider adapter with explicit pending-authority labeling

## Run

- `pnpm --filter @workspace/api-server run dev`
- `pnpm --filter @workspace/campaign-activity-planner run dev`
- `pnpm run typecheck`
- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/db run push`

## Important boundary

No live Campaign Governance Foundation, Salesforce, webinar platform, email delivery platform, or holiday service is configured. Development-generated titles are not authoritative. Records created locally display **Governance status: Pending authoritative assignment**.

See `docs/` for architecture, data model, governance contract, decisions, testing, and traceability.