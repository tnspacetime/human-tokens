ALTER TABLE "background_readings" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "background_readings" ADD COLUMN "summary" text NOT NULL;--> statement-breakpoint
ALTER TABLE "background_readings" ADD CONSTRAINT "background_readings_title_not_blank" CHECK (char_length(btrim("background_readings"."title")) > 0);--> statement-breakpoint
ALTER TABLE "background_readings" ADD CONSTRAINT "background_readings_summary_not_blank" CHECK (char_length(btrim("background_readings"."summary")) > 0);
