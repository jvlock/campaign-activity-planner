# Architecture

## Repository audit

1. **Stack:** pnpm workspace, Node 24, TypeScript 5.9, Express 5, React 19 + Vite, TanStack Query, Wouter, Tailwind, PostgreSQL, Drizzle, Zod, OpenAPI/Orval.
2. **Database state:** Replit PostgreSQL was reachable; it initially contained no application schema. The normalized planning schema is now applied.
3. **Migrations:** no prior application migrations existed. Drizzle owns schema definitions and generated migrations.
4. **Authentication:** no authentication was configured. The vertical slice uses a clearly labeled development actor. Production authentication and identity-to-role mapping remain external dependencies.
5. **Environment:** `DATABASE_URL` and standard PostgreSQL variables are available to the managed services. Secret values were not inspected or copied.
6. **Reusable UI:** the React scaffold includes Radix-derived UI primitives, form controls, dialogs, tabs, table, toast, tooltip, and responsive navigation primitives.
7. **Tests:** no application test runner was configured initially. Scheduling tests use Node's built-in test runner against a compiled test target.
8. **Governance API:** no usable Campaign Governance Foundation API or integration was available.
9. **Nurture Journey Builder:** no accessible source code, package, artifact, or connected repository was found in this project.
10. **Gaps:** authoritative governance, authentication, production RBAC, holiday provider, frequency-cap source, Salesforce, webinar, email, and Excel artifact storage integrations.

## Runtime

The browser calls `/api` through generated TanStack Query hooks. Express validates API inputs from the generated Zod package and persists planning records in PostgreSQL through Drizzle. Relative schedule logic is isolated in a pure domain module. The governance boundary is a typed provider interface; the active development adapter never claims authority.

## Domain ownership

- Campaign Governance Foundation: taxonomy, naming rules, campaign/activity codes, UTM rules, fiscal assignments, deprecation and supersession.
- Campaign Activity Planner: plans, activities, communications, destinations, schedules, journeys, content, approvals, QA, exports, and change history.

## Security posture

UUIDs are primary keys. Roles and permissions are modeled, but production authorization is not claimed until authentication is connected. Server routes are the enforcement point once identity is available. UTM PII validation is part of the planned governance adapter contract.