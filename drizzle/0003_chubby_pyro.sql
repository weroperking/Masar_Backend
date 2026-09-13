ALTER TABLE "students" ADD COLUMN "public_lookup_token" text;--> statement-breakpoint
CREATE INDEX "students_public_lookup_token_idx" ON "students" USING btree ("public_lookup_token");