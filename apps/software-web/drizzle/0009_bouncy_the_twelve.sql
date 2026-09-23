ALTER TABLE "interviews" ADD COLUMN "portrait_image_id" text;--> statement-breakpoint
UPDATE "interviews"
SET "portrait_image_id" = "authoring_links"."profile_image_id"
FROM "authoring_links"
WHERE "authoring_links"."interview_id" = "interviews"."id"
	AND "authoring_links"."scope" = 'guest'
	AND "authoring_links"."revoked_at" IS NULL
	AND "authoring_links"."profile_image_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "authoring_links" DROP COLUMN "profile_image_id";--> statement-breakpoint
ALTER TABLE "guests" DROP COLUMN "image_id";
