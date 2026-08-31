ALTER TABLE "campaign_plans" ADD COLUMN "campaign_type" text DEFAULT 'Unspecified' NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_plans" ADD COLUMN "audience_segment" text DEFAULT 'Unspecified' NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_plans" ADD COLUMN "fiscal_period" text DEFAULT 'Unspecified' NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_plans" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "communications" ADD COLUMN "communication_code" text;--> statement-breakpoint
ALTER TABLE "communications" ADD COLUMN "dynamic_tokens" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "communications" ADD COLUMN "dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "communications" ADD COLUMN "qa_checklist" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "content_versions" ADD COLUMN "header" text;--> statement-breakpoint
ALTER TABLE "content_versions" ADD COLUMN "secondary_cta" text;--> statement-breakpoint
ALTER TABLE "content_versions" ADD COLUMN "secondary_cta_url" text;--> statement-breakpoint
ALTER TABLE "content_versions" ADD COLUMN "token_fallbacks" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "webinar_events" ADD COLUMN "registration_pending" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "webinar_events" ADD COLUMN "webinar_owner" text DEFAULT 'Development User' NOT NULL;--> statement-breakpoint
ALTER TABLE "webinar_events" ADD COLUMN "email_marketing_owner" text DEFAULT 'Development User' NOT NULL;