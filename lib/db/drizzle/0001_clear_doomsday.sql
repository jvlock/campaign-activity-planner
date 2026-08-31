CREATE TABLE "registration_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_event_id" uuid NOT NULL,
	"person_reference" text NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recruitment_suppressed" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_plans" ADD COLUMN "product" text DEFAULT 'Unspecified' NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_plans" ADD COLUMN "geography" text DEFAULT 'Global' NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_plans" ADD COLUMN "business_unit" text DEFAULT 'Unspecified' NOT NULL;--> statement-breakpoint
ALTER TABLE "registration_results" ADD CONSTRAINT "registration_results_webinar_event_id_webinar_events_id_fk" FOREIGN KEY ("webinar_event_id") REFERENCES "public"."webinar_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "registration_result_person_unique" ON "registration_results" USING btree ("webinar_event_id","person_reference");