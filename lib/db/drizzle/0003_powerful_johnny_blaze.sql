CREATE TABLE "person_communication_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"communication_id" uuid NOT NULL,
	"person_reference" text NOT NULL,
	"eligibility_status" text DEFAULT 'Eligible' NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Development User' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'Development User' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "person_communication_states" ADD CONSTRAINT "person_communication_states_communication_id_communications_id_fk" FOREIGN KEY ("communication_id") REFERENCES "public"."communications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "person_communication_state_unique" ON "person_communication_states" USING btree ("communication_id","person_reference");