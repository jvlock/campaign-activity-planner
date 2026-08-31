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

## Development adapter

The current adapter is deliberately non-authoritative. It returns no final codes, no taxonomy version, no fiscal assignment, and a failed authoritative validation with a clear reason. Its visible label is:

> Governance status: Pending authoritative assignment

## Proposed external API

The production provider should authenticate server-to-server, support idempotency keys for reservations, return immutable reservation IDs, expose taxonomy versions, and distinguish temporary unavailability from validation failures. The Planner must preserve the exact provider response used at creation time.