CREATE TABLE "activity_template_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"definition" jsonb NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL,
	CONSTRAINT "activity_templates_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_type" text NOT NULL,
	"record_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"approver" text NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"decision_at" timestamp with time zone,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_event_id" uuid NOT NULL,
	"person_reference" text NOT NULL,
	"attendance_status" text NOT NULL,
	"attended_minutes" integer,
	"explicit_handraiser" boolean DEFAULT false NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audience_branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audience_definition_id" uuid NOT NULL,
	"parent_branch_id" uuid,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"entry_condition" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"suppression_rule" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audience_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"internal_title" text NOT NULL,
	"segment" text NOT NULL,
	"subsegment" text,
	"size_tier" text,
	"persona" text,
	"geography" text NOT NULL,
	"language" text NOT NULL,
	"customer_status" text,
	"exclusions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"template_version_id" uuid,
	"activity_type" text NOT NULL,
	"internal_title" text NOT NULL,
	"governance_record_id" text,
	"governance_status" text DEFAULT 'Pending authoritative assignment' NOT NULL,
	"taxonomy_version" text,
	"authoritative_source" text DEFAULT 'Development Governance Adapter' NOT NULL,
	"short_title" text NOT NULL,
	"activity_code" text,
	"owner" text NOT NULL,
	"anchor_date" date,
	"anchor_time" text,
	"timezone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"internal_title" text NOT NULL,
	"governance_record_id" text,
	"governance_status" text DEFAULT 'Pending authoritative assignment' NOT NULL,
	"taxonomy_version" text,
	"authoritative_source" text DEFAULT 'Development Governance Adapter' NOT NULL,
	"short_title" text NOT NULL,
	"objective" text NOT NULL,
	"owner" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"campaign_code" text,
	"fiscal_assignment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_type" text NOT NULL,
	"record_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"summary" text NOT NULL,
	"before_value" jsonb,
	"after_value" jsonb,
	"actor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_type" text NOT NULL,
	"record_id" uuid NOT NULL,
	"body" text NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"communication_id" uuid NOT NULL,
	"name" text NOT NULL,
	"language" text NOT NULL,
	"is_control" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"audience_branch" text NOT NULL,
	"communication_type" text NOT NULL,
	"channel" text DEFAULT 'Email' NOT NULL,
	"internal_title" text NOT NULL,
	"governance_record_id" text,
	"governance_status" text DEFAULT 'Pending authoritative assignment' NOT NULL,
	"taxonomy_version" text,
	"authoritative_source" text DEFAULT 'Development Governance Adapter' NOT NULL,
	"short_title" text NOT NULL,
	"activity_code" text,
	"owner" text NOT NULL,
	"approval_status" text DEFAULT 'Draft' NOT NULL,
	"warning_count" integer DEFAULT 0 NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_display_names" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salesforce_account_id" text NOT NULL,
	"legal_name" text NOT NULL,
	"normalized_matching_name" text NOT NULL,
	"approved_display_name" text,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"website_domain" text,
	"parent_account" text,
	"subsidiary_name" text,
	"language" text DEFAULT 'en' NOT NULL,
	"approval_status" text DEFAULT 'Pending' NOT NULL,
	"effective_from" date,
	"effective_to" date,
	"data_steward" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL,
	CONSTRAINT "company_display_names_salesforce_account_id_unique" UNIQUE("salesforce_account_id")
);
--> statement-breakpoint
CREATE TABLE "content_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"communication_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"subject" text,
	"preheader" text,
	"headline" text,
	"body" text,
	"primary_cta" text,
	"sender_name" text,
	"from_address" text,
	"reply_to_address" text,
	"footer" text,
	"plain_text" text,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"internal_title" text NOT NULL,
	"governance_record_id" text,
	"governance_status" text DEFAULT 'Pending authoritative assignment' NOT NULL,
	"taxonomy_version" text,
	"authoritative_source" text DEFAULT 'Development Governance Adapter' NOT NULL,
	"destination_type" text NOT NULL,
	"base_url" text,
	"validation_status" text DEFAULT 'Pending' NOT NULL,
	"destination_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dynamic_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"source_system" text NOT NULL,
	"source_object" text NOT NULL,
	"source_field" text NOT NULL,
	"data_type" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"fallback_behavior" text,
	"example_value" text,
	"approval_status" text DEFAULT 'Approved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL,
	CONSTRAINT "dynamic_tokens_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"format" text NOT NULL,
	"storage_path" text,
	"status" text DEFAULT 'Pending' NOT NULL,
	"requested_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_type" text NOT NULL,
	"record_id" uuid NOT NULL,
	"system" text NOT NULL,
	"external_id" text,
	"last_synchronized_at" timestamp with time zone,
	"sync_status" text DEFAULT 'Not configured' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_event_id" uuid NOT NULL,
	"opens_at" timestamp with time zone,
	"suppress_recruitment_on_registration" boolean DEFAULT true NOT NULL,
	"rule_definition" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "schedule_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"communication_id" uuid NOT NULL,
	"relative_rule" text NOT NULL,
	"offset_days" integer DEFAULT 0 NOT NULL,
	"offset_minutes" integer DEFAULT 0 NOT NULL,
	"direction" text NOT NULL,
	"business_day_strategy" text NOT NULL,
	"audience_local_time" boolean DEFAULT false NOT NULL,
	"send_time" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"communication_id" uuid NOT NULL,
	"schedule_rule_id" uuid NOT NULL,
	"original_calculated_date" date NOT NULL,
	"adjusted_date" date NOT NULL,
	"adjustment_reason" text,
	"send_time" text NOT NULL,
	"timezone" text NOT NULL,
	"external_job_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"communication_id" uuid NOT NULL,
	"token_id" uuid NOT NULL,
	"resolved_value" text,
	"resolution_status" text DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracking_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"communication_id" uuid NOT NULL,
	"destination_id" uuid,
	"base_url" text NOT NULL,
	"final_tracked_url" text,
	"parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"validation_result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"code_generation_timestamp" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text,
	"display_name" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL,
	CONSTRAINT "users_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "webinar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"external_title" text NOT NULL,
	"subject" text NOT NULL,
	"product" text NOT NULL,
	"topic" text NOT NULL,
	"objective" text NOT NULL,
	"success_measure" text,
	"duration_minutes" integer NOT NULL,
	"platform" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL,
	CONSTRAINT "webinar_events_activity_id_unique" UNIQUE("activity_id")
);
--> statement-breakpoint
CREATE TABLE "webinar_platform_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_event_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"external_event_id" text,
	"join_url" text,
	"sync_status" text DEFAULT 'Not configured' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webinar_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_event_id" uuid NOT NULL,
	"session_date" date NOT NULL,
	"start_time" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"timezone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webinar_speakers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_event_id" uuid NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"organization" text,
	"bio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_template_versions" ADD CONSTRAINT "activity_template_versions_template_id_activity_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."activity_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_results" ADD CONSTRAINT "attendance_results_webinar_event_id_webinar_events_id_fk" FOREIGN KEY ("webinar_event_id") REFERENCES "public"."webinar_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_branches" ADD CONSTRAINT "audience_branches_audience_definition_id_audience_definitions_id_fk" FOREIGN KEY ("audience_definition_id") REFERENCES "public"."audience_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_definitions" ADD CONSTRAINT "audience_definitions_activity_id_campaign_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."campaign_activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_activities" ADD CONSTRAINT "campaign_activities_campaign_id_campaign_plans_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_activities" ADD CONSTRAINT "campaign_activities_template_version_id_activity_template_versions_id_fk" FOREIGN KEY ("template_version_id") REFERENCES "public"."activity_template_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_variants" ADD CONSTRAINT "communication_variants_communication_id_communications_id_fk" FOREIGN KEY ("communication_id") REFERENCES "public"."communications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_activity_id_campaign_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."campaign_activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_communication_id_communications_id_fk" FOREIGN KEY ("communication_id") REFERENCES "public"."communications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_activity_id_campaign_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."campaign_activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_campaign_id_campaign_plans_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_rules" ADD CONSTRAINT "registration_rules_webinar_event_id_webinar_events_id_fk" FOREIGN KEY ("webinar_event_id") REFERENCES "public"."webinar_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_rules" ADD CONSTRAINT "schedule_rules_communication_id_communications_id_fk" FOREIGN KEY ("communication_id") REFERENCES "public"."communications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_instances" ADD CONSTRAINT "scheduled_instances_communication_id_communications_id_fk" FOREIGN KEY ("communication_id") REFERENCES "public"."communications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_instances" ADD CONSTRAINT "scheduled_instances_schedule_rule_id_schedule_rules_id_fk" FOREIGN KEY ("schedule_rule_id") REFERENCES "public"."schedule_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_mappings" ADD CONSTRAINT "token_mappings_communication_id_communications_id_fk" FOREIGN KEY ("communication_id") REFERENCES "public"."communications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_mappings" ADD CONSTRAINT "token_mappings_token_id_dynamic_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."dynamic_tokens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_communication_id_communications_id_fk" FOREIGN KEY ("communication_id") REFERENCES "public"."communications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_events" ADD CONSTRAINT "webinar_events_activity_id_campaign_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."campaign_activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_platform_references" ADD CONSTRAINT "webinar_platform_references_webinar_event_id_webinar_events_id_fk" FOREIGN KEY ("webinar_event_id") REFERENCES "public"."webinar_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_sessions" ADD CONSTRAINT "webinar_sessions_webinar_event_id_webinar_events_id_fk" FOREIGN KEY ("webinar_event_id") REFERENCES "public"."webinar_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_speakers" ADD CONSTRAINT "webinar_speakers_webinar_event_id_webinar_events_id_fk" FOREIGN KEY ("webinar_event_id") REFERENCES "public"."webinar_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "activity_template_version_unique" ON "activity_template_versions" USING btree ("template_id","version_number");