ALTER TABLE "background_readings" DROP CONSTRAINT "background_readings_ready_title_required";--> statement-breakpoint
ALTER TABLE "background_readings" DROP CONSTRAINT "background_readings_ready_summary_required";--> statement-breakpoint
ALTER TABLE "background_readings" DROP CONSTRAINT "background_readings_ready_content_required";--> statement-breakpoint
ALTER TABLE "interviews" DROP CONSTRAINT "interviews_title_required_after_draft";--> statement-breakpoint
ALTER TABLE "interviews" DROP CONSTRAINT "interviews_summary_required_after_draft";--> statement-breakpoint
ALTER TABLE "interviews" DROP CONSTRAINT "interviews_ready_content_required";--> statement-breakpoint
ALTER TABLE "interviews" DROP CONSTRAINT "interviews_guest_required_after_draft";--> statement-breakpoint
ALTER TABLE "background_readings" ADD CONSTRAINT "background_readings_published_title_required" CHECK ("background_readings"."status" <> 'published' OR char_length(btrim("background_readings"."title")) > 0);--> statement-breakpoint
ALTER TABLE "background_readings" ADD CONSTRAINT "background_readings_published_summary_required" CHECK ("background_readings"."status" <> 'published' OR char_length(btrim("background_readings"."summary")) > 0);--> statement-breakpoint
ALTER TABLE "background_readings" ADD CONSTRAINT "background_readings_published_content_required" CHECK ("background_readings"."status" <> 'published' OR char_length(btrim("background_readings"."content_markdown")) > 0);--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_published_title_required" CHECK ("interviews"."status" <> 'published' OR char_length(btrim("interviews"."title")) > 0);--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_published_summary_required" CHECK ("interviews"."status" <> 'published' OR char_length(btrim("interviews"."summary")) > 0);--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_published_content_required" CHECK ("interviews"."status" <> 'published' OR char_length(btrim("interviews"."content_markdown")) > 0);--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_published_guest_required" CHECK ("interviews"."status" <> 'published' OR "interviews"."guest_id" IS NOT NULL);