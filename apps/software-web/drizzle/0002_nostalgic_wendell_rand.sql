ALTER TABLE "background_readings" DROP CONSTRAINT "background_readings_interview_id_unique";--> statement-breakpoint
ALTER TABLE "interviews" DROP CONSTRAINT "interviews_publication_date_unique";--> statement-breakpoint
ALTER TABLE "background_readings" DROP CONSTRAINT "background_readings_interview_id_interviews_id_fk";
--> statement-breakpoint
ALTER TABLE "background_readings" ADD COLUMN "publication_date" date;--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "background_reading_id" uuid;--> statement-breakpoint
UPDATE "background_readings" AS "background_reading"
SET "publication_date" = "interview"."publication_date"
FROM "interviews" AS "interview"
WHERE "background_reading"."interview_id" = "interview"."id";--> statement-breakpoint
UPDATE "interviews" AS "interview"
SET "background_reading_id" = "background_reading"."id"
FROM "background_readings" AS "background_reading"
WHERE "background_reading"."interview_id" = "interview"."id";--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_background_reading_id_background_readings_id_fk" FOREIGN KEY ("background_reading_id") REFERENCES "public"."background_readings"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "background_readings_published_publication_date_idx" ON "background_readings" USING btree ("publication_date" DESC NULLS LAST) WHERE "background_readings"."status" = 'published';--> statement-breakpoint
CREATE INDEX "interviews_background_reading_id_idx" ON "interviews" USING btree ("background_reading_id");--> statement-breakpoint
ALTER TABLE "background_readings" DROP COLUMN "interview_id";--> statement-breakpoint
ALTER TABLE "background_readings" ADD CONSTRAINT "background_readings_published_date_required" CHECK ("background_readings"."status" <> 'published' OR "background_readings"."publication_date" IS NOT NULL);
