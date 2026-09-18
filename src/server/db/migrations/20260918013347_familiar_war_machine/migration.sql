CREATE TYPE "route_status" AS ENUM('draft', 'in_flight', 'concluded', 'cancelled');--> statement-breakpoint
CREATE TABLE "route" (
	"id" text PRIMARY KEY,
	"manager_id" text NOT NULL,
	"driver_id" text NOT NULL,
	"vehicle_id" text,
	"date" timestamp NOT NULL,
	"status" "route_status" DEFAULT 'draft'::"route_status" NOT NULL,
	"current_version" text DEFAULT '1' NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "route_version" (
	"id" text PRIMARY KEY,
	"route_id" text NOT NULL,
	"version" text NOT NULL,
	"manager_id" text NOT NULL,
	"driver_id" text NOT NULL,
	"vehicle_id" text,
	"date" timestamp NOT NULL,
	"status" "route_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stop" (
	"id" text PRIMARY KEY,
	"route_id" text NOT NULL,
	"point_id" text NOT NULL,
	"order" text NOT NULL,
	"address_snapshot" text NOT NULL,
	"latitude_snapshot" real,
	"longitude_snapshot" real,
	"concluded_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stop_version" (
	"id" text PRIMARY KEY,
	"stop_id" text NOT NULL,
	"route_version_id" text NOT NULL,
	"order" text NOT NULL,
	"point_id" text NOT NULL,
	"address_snapshot" text NOT NULL,
	"latitude_snapshot" real,
	"longitude_snapshot" real,
	"concluded_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_driver_date_idx" ON "route" ("driver_id","date");--> statement-breakpoint
CREATE INDEX "route_manager_id_idx" ON "route" ("manager_id");--> statement-breakpoint
CREATE INDEX "route_driver_id_idx" ON "route" ("driver_id");--> statement-breakpoint
CREATE INDEX "route_date_idx" ON "route" ("date");--> statement-breakpoint
CREATE INDEX "route_deleted_at_idx" ON "route" ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_route_version_idx" ON "route_version" ("route_id","version");--> statement-breakpoint
CREATE INDEX "route_version_route_id_idx" ON "route_version" ("route_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_route_order_idx" ON "stop" ("route_id","order");--> statement-breakpoint
CREATE INDEX "stop_route_id_idx" ON "stop" ("route_id");--> statement-breakpoint
CREATE INDEX "stop_point_id_idx" ON "stop" ("point_id");--> statement-breakpoint
CREATE INDEX "stop_deleted_at_idx" ON "stop" ("deleted_at");--> statement-breakpoint
CREATE INDEX "stop_version_stop_id_idx" ON "stop_version" ("stop_id");--> statement-breakpoint
CREATE INDEX "stop_version_route_version_idx" ON "stop_version" ("route_version_id");--> statement-breakpoint
ALTER TABLE "route" ADD CONSTRAINT "route_manager_id_user_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "route" ADD CONSTRAINT "route_driver_id_user_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "route" ADD CONSTRAINT "route_vehicle_id_user_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "route_version" ADD CONSTRAINT "route_version_route_id_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "route"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "route_version" ADD CONSTRAINT "route_version_manager_id_user_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "route_version" ADD CONSTRAINT "route_version_driver_id_user_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "route_version" ADD CONSTRAINT "route_version_vehicle_id_user_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "stop" ADD CONSTRAINT "stop_route_id_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "route"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "stop" ADD CONSTRAINT "stop_point_id_point_id_fkey" FOREIGN KEY ("point_id") REFERENCES "point"("id");--> statement-breakpoint
ALTER TABLE "stop_version" ADD CONSTRAINT "stop_version_stop_id_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "stop"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "stop_version" ADD CONSTRAINT "stop_version_route_version_id_route_version_id_fkey" FOREIGN KEY ("route_version_id") REFERENCES "route_version"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "stop_version" ADD CONSTRAINT "stop_version_point_id_point_id_fkey" FOREIGN KEY ("point_id") REFERENCES "point"("id");