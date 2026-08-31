import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: text("created_by").notNull().default("Development User"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by").notNull().default("Development User"),
  version: integer("version").notNull().default(1),
  lifecycleStatus: text("lifecycle_status").notNull().default("Draft"),
};

const governedColumns = {
  internalTitle: text("internal_title").notNull(),
  governanceRecordId: text("governance_record_id"),
  governanceStatus: text("governance_status").notNull().default("Pending authoritative assignment"),
  taxonomyVersion: text("taxonomy_version"),
  authoritativeSource: text("authoritative_source").notNull().default("Development Governance Adapter"),
  governanceProviderResponse: jsonb("governance_provider_response"),
};

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: text("external_id").unique(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  ...auditColumns,
});

export const rolesTable = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  ...auditColumns,
});

export const authSessionsTable = pgTable("auth_sessions", {
  sid: varchar("sid").primaryKey(),
  user: jsonb("user").$type<{
    id: string;
    email: string | null;
    displayName: string;
  }>().notNull(),
  expire: timestamp("expire", { withTimezone: true }).notNull(),
});
export const campaignPlansTable = pgTable("campaign_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...governedColumns,
  shortTitle: text("short_title").notNull(),
  objective: text("objective").notNull(),
  owner: text("owner").notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  campaignCode: text("campaign_code"),
  fiscalAssignment: text("fiscal_assignment"),
  product: text("product").notNull().default("Unspecified"),
  geography: text("geography").notNull().default("Global"),
  businessUnit: text("business_unit").notNull().default("Unspecified"),
  campaignType: text("campaign_type").notNull().default("Unspecified"),
  audienceSegment: text("audience_segment").notNull().default("Unspecified"),
  fiscalPeriod: text("fiscal_period").notNull().default("Unspecified"),
  description: text("description").notNull().default(""),
  governanceIdempotencyKey: text("governance_idempotency_key").unique(),
  governanceValidation: jsonb("governance_validation"),
  trackingParameters: jsonb("tracking_parameters"),
  supersededByGovernanceRecordId: text("superseded_by_governance_record_id"),
  ...auditColumns,
});

export const activityTemplatesTable = pgTable("activity_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  ...auditColumns,
});

export const activityTemplateVersionsTable = pgTable("activity_template_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id").notNull().references(() => activityTemplatesTable.id),
  versionNumber: integer("version_number").notNull(),
  definition: jsonb("definition").notNull(),
  effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
  effectiveTo: date("effective_to", { mode: "string" }),
  ...auditColumns,
}, (table) => [uniqueIndex("activity_template_version_unique").on(table.templateId, table.versionNumber)]);

export const campaignActivitiesTable = pgTable("campaign_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull().references(() => campaignPlansTable.id),
  templateVersionId: uuid("template_version_id").references(() => activityTemplateVersionsTable.id),
  activityType: text("activity_type").notNull(),
  ...governedColumns,
  shortTitle: text("short_title").notNull(),
  activityCode: text("activity_code"),
  owner: text("owner").notNull(),
  anchorDate: date("anchor_date", { mode: "string" }),
  anchorTime: text("anchor_time"),
  timezone: text("timezone"),
  ...auditColumns,
}, (table) => [uniqueIndex("campaign_activity_governance_record_unique").on(table.governanceRecordId)]);

export const audienceDefinitionsTable = pgTable("audience_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  activityId: uuid("activity_id").notNull().references(() => campaignActivitiesTable.id),
  internalTitle: text("internal_title").notNull(),
  segment: text("segment").notNull(),
  subsegment: text("subsegment"),
  sizeTier: text("size_tier"),
  persona: text("persona"),
  geography: text("geography").notNull(),
  language: text("language").notNull(),
  customerStatus: text("customer_status"),
  exclusions: jsonb("exclusions").$type<string[]>().notNull().default([]),
  ...auditColumns,
});

export const audienceBranchesTable = pgTable("audience_branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  audienceDefinitionId: uuid("audience_definition_id").notNull().references(() => audienceDefinitionsTable.id),
  parentBranchId: uuid("parent_branch_id"),
  key: text("key").notNull(),
  name: text("name").notNull(),
  entryCondition: jsonb("entry_condition").notNull().default({}),
  suppressionRule: jsonb("suppression_rule").notNull().default({}),
  ...auditColumns,
});

export const communicationsTable = pgTable("communications", {
  id: uuid("id").primaryKey().defaultRandom(),
  activityId: uuid("activity_id").notNull().references(() => campaignActivitiesTable.id),
  audienceBranch: text("audience_branch").notNull(),
  communicationType: text("communication_type").notNull(),
  channel: text("channel").notNull().default("Email"),
  ...governedColumns,
  shortTitle: text("short_title").notNull(),
  activityCode: text("activity_code"),
  owner: text("owner").notNull(),
  approvalStatus: text("approval_status").notNull().default("Draft"),
  warningCount: integer("warning_count").notNull().default(0),
  pinned: boolean("pinned").notNull().default(false),
  sent: boolean("sent").notNull().default(false),
  communicationCode: text("communication_code"),
  dynamicTokens: jsonb("dynamic_tokens").$type<string[]>().notNull().default([]),
  dependencies: jsonb("dependencies").$type<string[]>().notNull().default([]),
  qaChecklist: jsonb("qa_checklist").$type<Record<string, boolean>>().notNull().default({}),
  ...auditColumns,
});

export const communicationVariantsTable = pgTable("communication_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  communicationId: uuid("communication_id").notNull().references(() => communicationsTable.id),
  name: text("name").notNull(),
  language: text("language").notNull(),
  isControl: boolean("is_control").notNull().default(true),
  ...auditColumns,
});

export const scheduleRulesTable = pgTable("schedule_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  communicationId: uuid("communication_id").notNull().references(() => communicationsTable.id),
  relativeRule: text("relative_rule").notNull(),
  offsetDays: integer("offset_days").notNull().default(0),
  offsetMinutes: integer("offset_minutes").notNull().default(0),
  direction: text("direction").notNull(),
  businessDayStrategy: text("business_day_strategy").notNull(),
  audienceLocalTime: boolean("audience_local_time").notNull().default(false),
  sendTime: text("send_time").notNull(),
  ...auditColumns,
});

export const scheduledInstancesTable = pgTable("scheduled_instances", {
  id: uuid("id").primaryKey().defaultRandom(),
  communicationId: uuid("communication_id").notNull().references(() => communicationsTable.id),
  scheduleRuleId: uuid("schedule_rule_id").notNull().references(() => scheduleRulesTable.id),
  originalCalculatedDate: date("original_calculated_date", { mode: "string" }).notNull(),
  adjustedDate: date("adjusted_date", { mode: "string" }).notNull(),
  adjustmentReason: text("adjustment_reason"),
  sendTime: text("send_time").notNull(),
  timezone: text("timezone").notNull(),
  externalJobId: text("external_job_id"),
  ...auditColumns,
});

export const destinationsTable = pgTable("destinations", {
  id: uuid("id").primaryKey().defaultRandom(),
  activityId: uuid("activity_id").notNull().references(() => campaignActivitiesTable.id),
  ...governedColumns,
  destinationType: text("destination_type").notNull(),
  baseUrl: text("base_url"),
  validationStatus: text("validation_status").notNull().default("Pending"),
  destinationCode: text("destination_code"),
  ...auditColumns,
});

export const trackingLinksTable = pgTable("tracking_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  communicationId: uuid("communication_id").notNull().references(() => communicationsTable.id),
  destinationId: uuid("destination_id").references(() => destinationsTable.id),
  baseUrl: text("base_url").notNull(),
  finalTrackedUrl: text("final_tracked_url"),
  parameters: jsonb("parameters").notNull().default({}),
  validationResult: jsonb("validation_result").notNull().default({}),
  codeGenerationTimestamp: timestamp("code_generation_timestamp", { withTimezone: true }),
  ...auditColumns,
});

export const contentVersionsTable = pgTable("content_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  communicationId: uuid("communication_id").notNull().references(() => communicationsTable.id),
  versionNumber: integer("version_number").notNull(),
  subject: text("subject"),
  preheader: text("preheader"),
  headline: text("headline"),
  header: text("header"),
  body: text("body"),
  primaryCta: text("primary_cta"),
  secondaryCta: text("secondary_cta"),
  secondaryCtaUrl: text("secondary_cta_url"),
  senderName: text("sender_name"),
  fromAddress: text("from_address"),
  replyToAddress: text("reply_to_address"),
  tokenFallbacks: jsonb("token_fallbacks").$type<Record<string, string>>().notNull().default({}),
  footer: text("footer"),
  plainText: text("plain_text"),
  isCurrent: boolean("is_current").notNull().default(true),
  ...auditColumns,
});

export const dynamicTokensTable = pgTable("dynamic_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  sourceSystem: text("source_system").notNull(),
  sourceObject: text("source_object").notNull(),
  sourceField: text("source_field").notNull(),
  dataType: text("data_type").notNull(),
  required: boolean("required").notNull().default(false),
  fallbackBehavior: text("fallback_behavior"),
  exampleValue: text("example_value"),
  approvalStatus: text("approval_status").notNull().default("Approved"),
  ...auditColumns,
});

export const tokenMappingsTable = pgTable("token_mappings", {
  id: uuid("id").primaryKey().defaultRandom(),
  communicationId: uuid("communication_id").notNull().references(() => communicationsTable.id),
  tokenId: uuid("token_id").notNull().references(() => dynamicTokensTable.id),
  resolvedValue: text("resolved_value"),
  resolutionStatus: text("resolution_status").notNull().default("Pending"),
  ...auditColumns,
});

export const approvalsTable = pgTable("approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  recordType: text("record_type").notNull(),
  recordId: uuid("record_id").notNull(),
  scope: text("scope").notNull(),
  approver: text("approver").notNull(),
  status: text("status").notNull().default("Pending"),
  decisionAt: timestamp("decision_at", { withTimezone: true }),
  comment: text("comment"),
  ...auditColumns,
});

export const commentsTable = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  recordType: text("record_type").notNull(),
  recordId: uuid("record_id").notNull(),
  body: text("body").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  ...auditColumns,
});

export const integrationReferencesTable = pgTable("integration_references", {
  id: uuid("id").primaryKey().defaultRandom(),
  recordType: text("record_type").notNull(),
  recordId: uuid("record_id").notNull(),
  system: text("system").notNull(),
  externalId: text("external_id"),
  lastSynchronizedAt: timestamp("last_synchronized_at", { withTimezone: true }),
  syncStatus: text("sync_status").notNull().default("Not configured"),
  ...auditColumns,
});

export const changeEventsTable = pgTable("change_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  recordType: text("record_type").notNull(),
  recordId: uuid("record_id").notNull(),
  eventType: text("event_type").notNull(),
  summary: text("summary").notNull(),
  beforeValue: jsonb("before_value"),
  afterValue: jsonb("after_value"),
  actor: text("actor").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exportsTable = pgTable("exports", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull().references(() => campaignPlansTable.id),
  format: text("format").notNull(),
  storagePath: text("storage_path"),
  status: text("status").notNull().default("Pending"),
  requestedBy: text("requested_by").notNull(),
  ...auditColumns,
});

export const companyDisplayNamesTable = pgTable("company_display_names", {
  id: uuid("id").primaryKey().defaultRandom(),
  salesforceAccountId: text("salesforce_account_id").notNull().unique(),
  legalName: text("legal_name").notNull(),
  normalizedMatchingName: text("normalized_matching_name").notNull(),
  approvedDisplayName: text("approved_display_name"),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  websiteDomain: text("website_domain"),
  parentAccount: text("parent_account"),
  subsidiaryName: text("subsidiary_name"),
  language: text("language").notNull().default("en"),
  approvalStatus: text("approval_status").notNull().default("Pending"),
  effectiveFrom: date("effective_from", { mode: "string" }),
  effectiveTo: date("effective_to", { mode: "string" }),
  dataSteward: text("data_steward"),
  ...auditColumns,
});

export const webinarEventsTable = pgTable("webinar_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  activityId: uuid("activity_id").notNull().unique().references(() => campaignActivitiesTable.id),
  externalTitle: text("external_title").notNull(),
  subject: text("subject").notNull(),
  product: text("product").notNull(),
  topic: text("topic").notNull(),
  objective: text("objective").notNull(),
  successMeasure: text("success_measure"),
  registrationPending: boolean("registration_pending").notNull().default(true),
  webinarOwner: text("webinar_owner").notNull().default("Development User"),
  emailMarketingOwner: text("email_marketing_owner").notNull().default("Development User"),
  durationMinutes: integer("duration_minutes").notNull(),
  platform: text("platform").notNull(),
  ...auditColumns,
});

export const webinarSessionsTable = pgTable("webinar_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  webinarEventId: uuid("webinar_event_id").notNull().references(() => webinarEventsTable.id),
  sessionDate: date("session_date", { mode: "string" }).notNull(),
  startTime: text("start_time").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  timezone: text("timezone").notNull(),
  ...auditColumns,
});

export const webinarSpeakersTable = pgTable("webinar_speakers", {
  id: uuid("id").primaryKey().defaultRandom(),
  webinarEventId: uuid("webinar_event_id").notNull().references(() => webinarEventsTable.id),
  name: text("name").notNull(),
  title: text("title"),
  organization: text("organization"),
  bio: text("bio"),
  ...auditColumns,
});

export const webinarPlatformReferencesTable = pgTable("webinar_platform_references", {
  id: uuid("id").primaryKey().defaultRandom(),
  webinarEventId: uuid("webinar_event_id").notNull().references(() => webinarEventsTable.id),
  platform: text("platform").notNull(),
  externalEventId: text("external_event_id"),
  joinUrl: text("join_url"),
  syncStatus: text("sync_status").notNull().default("Not configured"),
  ...auditColumns,
});

export const registrationRulesTable = pgTable("registration_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  webinarEventId: uuid("webinar_event_id").notNull().references(() => webinarEventsTable.id),
  opensAt: timestamp("opens_at", { withTimezone: true }),
  suppressRecruitmentOnRegistration: boolean("suppress_recruitment_on_registration").notNull().default(true),
  ruleDefinition: jsonb("rule_definition").notNull().default({}),
  ...auditColumns,
});

export const attendanceResultsTable = pgTable("attendance_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  webinarEventId: uuid("webinar_event_id").notNull().references(() => webinarEventsTable.id),
  personReference: text("person_reference").notNull(),
  attendanceStatus: text("attendance_status").notNull(),
  attendedMinutes: integer("attended_minutes"),
  explicitHandraiser: boolean("explicit_handraiser").notNull().default(false),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  ...auditColumns,
});

export const registrationResultsTable = pgTable("registration_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  webinarEventId: uuid("webinar_event_id").notNull().references(() => webinarEventsTable.id),
  personReference: text("person_reference").notNull(),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
  recruitmentSuppressed: boolean("recruitment_suppressed").notNull().default(true),
  ...auditColumns,
}, (table) => [uniqueIndex("registration_result_person_unique").on(table.webinarEventId, table.personReference)]);

/** Per-person eligibility is retained separately from global communication lifecycle. */
export const personCommunicationStatesTable = pgTable("person_communication_states", {
  id: uuid("id").primaryKey().defaultRandom(),
  communicationId: uuid("communication_id").notNull().references(() => communicationsTable.id),
  personReference: text("person_reference").notNull(),
  eligibilityStatus: text("eligibility_status").notNull().default("Eligible"),
  reason: text("reason").notNull(),
  ...auditColumns,
}, (table) => [uniqueIndex("person_communication_state_unique").on(table.communicationId, table.personReference)]);
