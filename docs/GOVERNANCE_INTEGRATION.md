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

The active adapter connects to `https://campaign-governance-foundation.replit.app/`. It currently reads health, campaigns, foundation metadata, and taxonomy through the system's public API.

The Foundation remains authoritative. The Planner does not invent final campaign/activity codes or claim successful validation when the Foundation has not exposed a documented endpoint for that operation. Newly created Planner records therefore remain pending authoritative assignment.

## Remaining API requirements

The production provider should add authenticated server-to-server access, idempotent code reservations, campaign validation, tracking-parameter generation, fiscal assignment, and explicit supersession lookup. The Planner must preserve the exact provider response used at creation time.