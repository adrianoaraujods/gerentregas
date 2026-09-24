import { DriversManagement } from "@/components/modules/drivers/drivers-management";
import { getSession } from "@/lib/auth/server";

export default async function MotoristasPage() {
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";

  return <DriversManagement isAdmin={isAdmin} />;
}
