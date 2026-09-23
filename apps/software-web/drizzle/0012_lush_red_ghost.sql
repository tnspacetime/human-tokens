CREATE TYPE "public"."share_snapshot_kind" AS ENUM('interview', 'background_reading');--> statement-breakpoint
CREATE TABLE "share_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"share_id" text NOT NULL,
	"kind" "share_snapshot_kind" NOT NULL,
	"source_record_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"content_markdown" text NOT NULL,
	"guest_name" text,
	"guest_description" text,
	"portrait_image_id" text,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "share_snapshots_share_id_unique" UNIQUE("share_id"),
	CONSTRAINT "share_snapshots_share_id_format" CHECK (char_length("share_snapshots"."share_id") >= 22 AND "share_snapshots"."share_id" ~ '^[A-Za-z0-9_-]+$'),
	CONSTRAINT "share_snapshots_title_not_blank" CHECK (char_length(btrim("share_snapshots"."title")) > 0),
	CONSTRAINT "share_snapshots_summary_not_blank" CHECK (char_length(btrim("share_snapshots"."summary")) > 0),
	CONSTRAINT "share_snapshots_content_not_blank" CHECK (char_length(btrim("share_snapshots"."content_markdown")) > 0),
	CONSTRAINT "share_snapshots_background_has_no_interview_metadata" CHECK ("share_snapshots"."kind" <> 'background_reading' OR ("share_snapshots"."guest_name" IS NULL AND "share_snapshots"."guest_description" IS NULL AND "share_snapshots"."portrait_image_id" IS NULL)),
	CONSTRAINT "share_snapshots_revocation_after_creation" CHECK ("share_snapshots"."revoked_at" IS NULL OR "share_snapshots"."revoked_at" >= "share_snapshots"."created_at")
);
--> statement-breakpoint
CREATE INDEX "share_snapshots_source_idx" ON "share_snapshots" USING btree ("kind","source_record_id");