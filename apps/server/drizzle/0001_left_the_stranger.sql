ALTER TABLE "instances" ALTER COLUMN "mods" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "instances" ALTER COLUMN "mods" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "instances" ALTER COLUMN "resource_packs" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "instances" ALTER COLUMN "resource_packs" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "encrypted_dek" text;