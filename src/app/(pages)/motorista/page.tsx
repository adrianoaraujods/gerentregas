import { notFound } from "next/navigation";
import { GridPattern } from "@/components/layout/background-patterns";
import { DriverDayContent } from "@/components/modules/driver/driver-day-content";
import { getSession } from "@/lib/auth/server";
import type { User } from "@/server/modules/auth";

export default async function MotoristaPage() {
  const session = await getSession();
  if (session?.user.role !== "driver") notFound();

  const user = session.user as User;

  return (
    <GridPattern className="flex-1 overflow-y-auto p-5 sm:p-7">
      <div className="mx-auto max-w-4xl">
        <DriverDayContent driverName={user.name} />
      </div>
    </GridPattern>
  );
}
