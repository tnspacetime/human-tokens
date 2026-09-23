ALTER TABLE "interviews" ADD COLUMN "content_updated_at" timestamp with time zone;--> statement-breakpoint
UPDATE "interviews" SET "content_updated_at" = "updated_at";--> statement-breakpoint
ALTER TABLE "interviews" ALTER COLUMN "content_updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "interviews" ALTER COLUMN "content_updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_content_updated_after_created" CHECK ("interviews"."content_updated_at" >= "interviews"."created_at");
