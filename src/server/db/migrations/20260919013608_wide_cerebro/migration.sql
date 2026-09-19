CREATE TYPE "stop_version_type" AS ENUM('structural', 'correction');--> statement-breakpoint
ALTER TABLE "route" DROP CONSTRAINT "route_vehicle_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "route_version" DROP CONSTRAINT "route_version_vehicle_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "route" ADD COLUMN "distance_km_hundredths" integer;--> statement-breakpoint
ALTER TABLE "route_version" ADD COLUMN "distance_km_hundredths" integer;--> statement-breakpoint
ALTER TABLE "stop_version" ADD COLUMN "version_type" "stop_version_type" DEFAULT 'structural'::"stop_version_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "stop_version" ADD COLUMN "actor_id" text;--> statement-breakpoint
ALTER TABLE "route" ADD CONSTRAINT "route_vehicle_id_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id");--> statement-breakpoint
ALTER TABLE "route_version" ADD CONSTRAINT "route_version_vehicle_id_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id");--> statement-breakpoint
ALTER TABLE "stop_version" ADD CONSTRAINT "stop_version_actor_id_user_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "user"("id");