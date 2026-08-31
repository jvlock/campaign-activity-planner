# Governance integration

## Contract

`GovernanceProvider` supports:

- `searchCampaigns`
- `getCampaign`
- `createDraftCampaignRequest`
- `getTaxonomy`
- `getTaxonomyVersion`
- `getNamingRules`
- `generateInternalTitle`
- `reserveCampaignCode`
- `reserveActivityCode`
- `generateTrackingParameters`
- `validateCampaign`
- `getFiscalAssignment`
- `getSupersessionStatus`

Requests and responses preserve governance record ID, taxonomy version, generated-code timestamp, validation result, superseded references, and authoritative source.

## Campaign Governance Foundation adapter

The active adapter connects to `https://campaign-governance-foundation.replit.app/`. It reads health, campaigns, foundation metadata, and taxonomy, and uses the authenticated campaign, submission, and activity write endpoints.

Set `GOVERNANCE_SERVICE_TOKEN` as a secret for bearer authentication. Set `GOVERNANCE_BASE_URL` and `GOVERNANCE_WEBINAR_CONFIGURATION_ID` as environment variables when they differ by environment.

Planner mutation routes require a verified OIDC session before the server can
use its Foundation service credential. Writer authorization is fail-closed: the
authenticated subject must match `REPL_OWNER_ID` or an ID in the comma-separated
`PLANNER_WRITER_IDS` environment variable. Audit events use that verified
identity; client-supplied actor values are ignored.

Browser CORS is restricted to the current Replit development domains and exact
origins listed in `PLANNER_ALLOWED_ORIGINS`. Unknown browser origins do not
receive CORS permission.

Campaign creation requires and forwards the caller's `Idempotency-Key`, stores it uniquely, and returns the existing Planner record when that key is retried. Activity keys are deterministic for the campaign, subject, and event date. The Planner persists the exact provider response alongside official identifiers and any taxonomy version, fiscal assignment, validation, tracking parameters, and supersession references explicitly returned by the Foundation. Missing authoritative fields remain null rather than being inferred.

The Foundation remains authoritative. The Planner never invents final campaign or activity identifiers; a failed authoritative write returns an error and does not create a pending local record.