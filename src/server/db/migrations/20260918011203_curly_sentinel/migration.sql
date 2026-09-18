CREATE TYPE "geocode_status" AS ENUM('success', 'failed', 'manual');--> statement-breakpoint
CREATE TABLE "point" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"latitude" real,
	"longitude" real,
	"geocode_status" "geocode_status" DEFAULT 'failed'::"geocode_status" NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "point_deleted_at_idx" ON "point" ("deleted_at");