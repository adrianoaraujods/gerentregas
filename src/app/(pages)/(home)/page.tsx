import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const role = session.user.role;

  if (role === "driver") {
    redirect("/motorista");
  }

  if (role === "manager" || role === "admin") {
    redirect("/admin");
  }

  return null;
}
