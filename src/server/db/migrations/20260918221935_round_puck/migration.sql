CREATE TABLE "vehicle" (
	"id" text PRIMARY KEY,
	"plate" text NOT NULL UNIQUE,
	"model" text NOT NULL,
	"km_per_liter_hundredths" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stop" ADD COLUMN "arrival_at" timestamp;--> statement-breakpoint
ALTER TABLE "stop" ADD COLUMN "departure_at" timestamp;--> statement-breakpoint
ALTER TABLE "stop_version" ADD COLUMN "arrival_at" timestamp;--> statement-breakpoint
ALTER TABLE "stop_version" ADD COLUMN "departure_at" timestamp;