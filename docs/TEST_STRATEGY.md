# Test strategy

## Automated now

Pure schedule-domain tests cover weekend rollback, holiday rollback, post-event forward movement, and preservation of date-only calculations across daylight-saving boundaries. Typechecking validates generated API consumers and server contracts.

## Required before production

- Regional holiday calendar fixtures
- timezone-local execution tests across DST transitions
- minimum-spacing, collision, and portfolio-frequency policies
- reschedule persistence for pinned and sent records
- registration suppression and attendance/no-show branch transitions
- handraiser explicit-consent rule
- destination, token, company-display-name, approval, and QA readiness blocks
- UTM generation and PII rejection
- duplicate campaign detection and provider unavailability
- export workbook completeness
- authenticated role/permission enforcement

## Levels

- Unit: schedule, governance mapping, UTM/PII, readiness policy
- Integration: PostgreSQL repositories and API routes
- Contract: OpenAPI-generated client/server schemas
- End-to-end: campaign creation through Webinar planning, reschedule, approval, and export