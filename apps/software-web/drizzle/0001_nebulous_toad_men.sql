CREATE TYPE "public"."authoring_link_scope" AS ENUM('draft', 'guest');--> statement-breakpoint
ALTER TABLE "submission_links" RENAME TO "authoring_links";--> statement-breakpoint
ALTER TABLE "authoring_links" DROP CONSTRAINT "submission_links_token_hash_unique";--> statement-breakpoint
ALTER TABLE "authoring_links" DROP CONSTRAINT "submission_links_sha256_length";--> statement-breakpoint
ALTER TABLE "authoring_links" DROP CONSTRAINT "submission_links_expiry_after_creation";--> statement-breakpoint
ALTER TABLE "authoring_links" DROP CONSTRAINT "submission_links_revocation_after_creation";--> statement-breakpoint
ALTER TABLE "authoring_links" DROP CONSTRAINT "submission_links_interview_id_interviews_id_fk";
--> statement-breakpoint
DROP INDEX "submission_links_interview_id_idx";--> statement-breakpoint
DROP INDEX "submission_links_expires_at_idx";--> statement-breakpoint
DROP INDEX "submission_links_one_active_per_interview_idx";--> statement-breakpoint
ALTER TABLE "authoring_links" ADD COLUMN "scope" "authoring_link_scope" NOT NULL;--> statement-breakpoint
ALTER TABLE "authoring_links" ADD CONSTRAINT "authoring_links_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "authoring_links_interview_id_idx" ON "authoring_links" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "authoring_links_expires_at_idx" ON "authoring_links" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "authoring_links_one_active_scope_per_interview_idx" ON "authoring_links" USING btree ("interview_id","scope") WHERE "authoring_links"."revoked_at" IS NULL;--> statement-breakpoint
ALTER TABLE "authoring_links" ADD CONSTRAINT "authoring_links_token_hash_unique" UNIQUE("token_hash");--> statement-breakpoint
ALTER TABLE "authoring_links" ADD CONSTRAINT "authoring_links_sha256_length" CHECK (octet_length("authoring_links"."token_hash") = 32);--> statement-breakpoint
ALTER TABLE "authoring_links" ADD CONSTRAINT "authoring_links_expiry_after_creation" CHECK ("authoring_links"."expires_at" > "authoring_links"."created_at");--> statement-breakpoint
ALTER TABLE "authoring_links" ADD CONSTRAINT "authoring_links_revocation_after_creation" CHECK ("authoring_links"."revoked_at" IS NULL OR "authoring_links"."revoked_at" >= "authoring_links"."created_at");