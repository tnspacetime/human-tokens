ALTER TABLE "background_readings" DROP CONSTRAINT "background_readings_title_not_blank";--> statement-breakpoint
ALTER TABLE "background_readings" DROP CONSTRAINT "background_readings_summary_not_blank";--> statement-breakpoint
ALTER TABLE "interviews" DROP CONSTRAINT "interviews_title_not_blank";--> statement-breakpoint
ALTER TABLE "interviews" DROP CONSTRAINT "interviews_summary_not_blank";--> statement-breakpoint
DROP INDEX "authoring_links_one_active_scope_per_interview_idx";--> statement-breakpoint
ALTER TABLE "authoring_links" ALTER COLUMN "interview_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "background_readings" ALTER COLUMN "title" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "background_readings" ALTER COLUMN "summary" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "interviews" ALTER COLUMN "guest_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "interviews" ALTER COLUMN "title" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "interviews" ALTER COLUMN "summary" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "authoring_links" ADD COLUMN "background_reading_id" uuid;--> statement-breakpoint
ALTER TABLE "authoring_links" ADD CONSTRAINT "authoring_links_background_reading_id_background_readings_id_fk" FOREIGN KEY ("background_reading_id") REFERENCES "public"."background_readings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "authoring_links_background_reading_id_idx" ON "authoring_links" USING btree ("background_reading_id");--> statement-breakpoint
CREATE UNIQUE INDEX "authoring_links_one_active_scope_per_background_idx" ON "authoring_links" USING btree ("background_reading_id","scope") WHERE "authoring_links"."background_reading_id" IS NOT NULL AND "authoring_links"."revoked_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "authoring_links_one_active_scope_per_interview_idx" ON "authoring_links" USING btree ("interview_id","scope") WHERE "authoring_links"."interview_id" IS NOT NULL AND "authoring_links"."revoked_at" IS NULL;--> statement-breakpoint
ALTER TABLE "authoring_links" ADD CONSTRAINT "authoring_links_exactly_one_target" CHECK (("authoring_links"."interview_id" IS NOT NULL AND "authoring_links"."background_reading_id" IS NULL) OR ("authoring_links"."interview_id" IS NULL AND "authoring_links"."background_reading_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "authoring_links" ADD CONSTRAINT "authoring_links_guest_targets_interview" CHECK ("authoring_links"."scope" <> 'guest' OR "authoring_links"."interview_id" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "background_readings" ADD CONSTRAINT "background_readings_published_title_required" CHECK ("background_readings"."status" <> 'published' OR char_length(btrim("background_readings"."title")) > 0);--> statement-breakpoint
ALTER TABLE "background_readings" ADD CONSTRAINT "background_readings_published_summary_required" CHECK ("background_readings"."status" <> 'published' OR char_length(btrim("background_readings"."summary")) > 0);--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_title_required_after_draft" CHECK ("interviews"."status" = 'draft' OR char_length(btrim("interviews"."title")) > 0);--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_summary_required_after_draft" CHECK ("interviews"."status" = 'draft' OR char_length(btrim("interviews"."summary")) > 0);--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_guest_required_after_draft" CHECK ("interviews"."status" = 'draft' OR "interviews"."guest_id" IS NOT NULL);