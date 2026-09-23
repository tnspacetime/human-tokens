DROP INDEX "background_readings_published_publication_date_idx";--> statement-breakpoint
DROP INDEX "interviews_published_publication_date_idx";--> statement-breakpoint
ALTER TABLE "background_readings" DROP CONSTRAINT "background_readings_published_title_required";--> statement-breakpoint
ALTER TABLE "background_readings" DROP CONSTRAINT "background_readings_published_summary_required";--> statement-breakpoint
ALTER TABLE "background_readings" DROP CONSTRAINT "background_readings_published_date_required";--> statement-breakpoint
ALTER TABLE "background_readings" DROP CONSTRAINT "background_readings_published_content_required";--> statement-breakpoint
ALTER TABLE "interviews" DROP CONSTRAINT "interviews_title_required_after_draft";--> statement-breakpoint
ALTER TABLE "interviews" DROP CONSTRAINT "interviews_summary_required_after_draft";--> statement-breakpoint
ALTER TABLE "interviews" DROP CONSTRAINT "interviews_published_date_required";--> statement-breakpoint
ALTER TABLE "interviews" DROP CONSTRAINT "interviews_published_content_required";--> statement-breakpoint
ALTER TABLE "interviews" DROP CONSTRAINT "interviews_guest_required_after_draft";--> statement-breakpoint
ALTER TABLE "background_readings" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "interviews" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "background_readings" ALTER COLUMN "status" TYPE text USING "status"::text;--> statement-breakpoint
ALTER TABLE "interviews" ALTER COLUMN "status" TYPE text USING "status"::text;--> statement-breakpoint
DROP TYPE "public"."background_reading_status";--> statement-breakpoint
DROP TYPE "public"."interview_status";--> statement-breakpoint
CREATE TYPE "public"."background_reading_status" AS ENUM('draft', 'ready', 'published');--> statement-breakpoint
CREATE TYPE "public"."interview_status" AS ENUM('draft', 'ready', 'invited', 'submitted', 'published', 'archived');--> statement-breakpoint
ALTER TABLE "background_readings" ALTER COLUMN "status" TYPE "public"."background_reading_status" USING "status"::"public"."background_reading_status";--> statement-breakpoint
ALTER TABLE "interviews" ALTER COLUMN "status" TYPE "public"."interview_status" USING "status"::"public"."interview_status";--> statement-breakpoint
ALTER TABLE "background_readings" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "interviews" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
CREATE INDEX "background_readings_published_publication_date_idx" ON "background_readings" USING btree ("publication_date" DESC NULLS LAST) WHERE "background_readings"."status" = 'published';--> statement-breakpoint
CREATE INDEX "interviews_published_publication_date_idx" ON "interviews" USING btree ("publication_date" DESC NULLS LAST) WHERE "interviews"."status" = 'published';--> statement-breakpoint
ALTER TABLE "background_readings" ADD CONSTRAINT "background_readings_ready_title_required" CHECK ("background_readings"."status" NOT IN ('ready', 'published') OR char_length(btrim("background_readings"."title")) > 0);--> statement-breakpoint
ALTER TABLE "background_readings" ADD CONSTRAINT "background_readings_ready_summary_required" CHECK ("background_readings"."status" NOT IN ('ready', 'published') OR char_length(btrim("background_readings"."summary")) > 0);--> statement-breakpoint
ALTER TABLE "background_readings" ADD CONSTRAINT "background_readings_published_date_required" CHECK ("background_readings"."status" <> 'published' OR "background_readings"."publication_date" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "background_readings" ADD CONSTRAINT "background_readings_ready_content_required" CHECK ("background_readings"."status" NOT IN ('ready', 'published') OR char_length(btrim("background_readings"."content_markdown")) > 0);--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_title_required_after_draft" CHECK ("interviews"."status" = 'draft' OR char_length(btrim("interviews"."title")) > 0);--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_summary_required_after_draft" CHECK ("interviews"."status" = 'draft' OR char_length(btrim("interviews"."summary")) > 0);--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_published_date_required" CHECK ("interviews"."status" <> 'published' OR "interviews"."publication_date" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_ready_content_required" CHECK ("interviews"."status" NOT IN ('ready', 'published') OR char_length(btrim("interviews"."content_markdown")) > 0);--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_guest_required_after_draft" CHECK ("interviews"."status" = 'draft' OR "interviews"."guest_id" IS NOT NULL);
