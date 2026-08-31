# Data model

The source of truth is `lib/db/src/schema/planning.ts`.

## Generic core

- Identity/access: users, roles
- Planning: campaign_plans, campaign_activities
- Templates: activity_templates, activity_template_versions
- Communication: communications, communication_variants, content_versions
- Audience/journey: audience_definitions, audience_branches
- Scheduling: schedule_rules, scheduled_instances
- Destinations/tracking: destinations, tracking_links
- Personalization: dynamic_tokens, token_mappings, company_display_names
- Workflow: approvals, comments
- Integrations/audit: integration_references, change_events, exports

## Webinar extension

webinar_events, webinar_sessions, webinar_speakers, webinar_platform_references, registration_rules, and attendance_results extend a generic Campaign Activity. No Webinar fields are stored on Campaign Plan.

## Identity and audit

Material entities use UUID primary keys, human-readable internal titles, governance identifiers/status, lifecycle state, version, creator/updater, and timestamps. Calendar dates use PostgreSQL `date`; instants use timezone-aware timestamps.

## Migration policy

Drizzle schema files are authoritative. Development uses `drizzle-kit push`; generated SQL migrations are retained for review and reproducibility. Production schema changes are applied by Replit's publish flow.