CREATE TYPE "public"."background_reading_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."interview_status" AS ENUM('draft', 'invited', 'submitted', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "background_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"content_markdown" text DEFAULT '' NOT NULL,
	"status" "background_reading_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "background_readings_interview_id_unique" UNIQUE("interview_id"),
	CONSTRAINT "background_readings_published_content_required" CHECK ("background_readings"."status" <> 'published' OR char_length(btrim("background_readings"."content_markdown")) > 0),
	CONSTRAINT "background_readings_updated_after_created" CHECK ("background_readings"."updated_at" >= "background_readings"."created_at")
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"image_id" text,
	CONSTRAINT "guests_name_not_blank" CHECK (char_length(btrim("guests"."name")) > 0),
	CONSTRAINT "guests_description_not_blank" CHECK (char_length(btrim("guests"."description")) > 0)
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"public_id" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"content_markdown" text DEFAULT '' NOT NULL,
	"status" "interview_status" DEFAULT 'draft' NOT NULL,
	"publication_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interviews_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "interviews_publication_date_unique" UNIQUE("publication_date"),
	CONSTRAINT "interviews_public_id_format" CHECK (char_length("interviews"."public_id") >= 22 AND "interviews"."public_id" ~ '^[A-Za-z0-9_-]+$'),
	CONSTRAINT "interviews_title_not_blank" CHECK (char_length(btrim("interviews"."title")) > 0),
	CONSTRAINT "interviews_summary_not_blank" CHECK (char_length(btrim("interviews"."summary")) > 0),
	CONSTRAINT "interviews_published_date_required" CHECK ("interviews"."status" <> 'published' OR "interviews"."publication_date" IS NOT NULL),
	CONSTRAINT "interviews_published_content_required" CHECK ("interviews"."status" <> 'published' OR char_length(btrim("interviews"."content_markdown")) > 0),
	CONSTRAINT "interviews_updated_after_created" CHECK ("interviews"."updated_at" >= "interviews"."created_at")
);
--> statement-breakpoint
CREATE TABLE "submission_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_links_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "submission_links_sha256_length" CHECK (octet_length("submission_links"."token_hash") = 32),
	CONSTRAINT "submission_links_expiry_after_creation" CHECK ("submission_links"."expires_at" > "submission_links"."created_at"),
	CONSTRAINT "submission_links_revocation_after_creation" CHECK ("submission_links"."revoked_at" IS NULL OR "submission_links"."revoked_at" >= "submission_links"."created_at")
);
--> statement-breakpoint
ALTER TABLE "background_readings" ADD CONSTRAINT "background_readings_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_links" ADD CONSTRAINT "submission_links_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "guests_name_idx" ON "guests" USING btree ("name");--> statement-breakpoint
CREATE INDEX "interviews_guest_id_idx" ON "interviews" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "interviews_published_publication_date_idx" ON "interviews" USING btree ("publication_date" DESC NULLS LAST) WHERE "interviews"."status" = 'published';--> statement-breakpoint
CREATE INDEX "submission_links_interview_id_idx" ON "submission_links" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "submission_links_expires_at_idx" ON "submission_links" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_links_one_active_per_interview_idx" ON "submission_links" USING btree ("interview_id") WHERE "submission_links"."revoked_at" IS NULL;