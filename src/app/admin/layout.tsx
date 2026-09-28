import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import AdminSidebar from "@/components/layout/admin-sidebar";
import { GridPattern } from "@/components/layout/background-patterns";
import { RestrictedAccess } from "@/components/modules/auth/restricted-access";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getSession } from "@/lib/auth/server";
import type { User } from "@/server/modules/auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/entrar?callbackUrl=%2Fadmin");
  }

  if (session.user.role !== "manager" && session.user.role !== "admin") {
    return <RestrictedAccess role={session.user.role} />;
  }

  return (
    <SidebarProvider className="min-h-svh" defaultOpen>
      <AdminSidebar user={session.user as User} />

      <SidebarInset>
        <header className="flex h-(--navbar-height) items-center border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>

        <GridPattern className="flex-1 overflow-y-auto p-5 sm:p-7">
          {children}
        </GridPattern>
      </SidebarInset>
    </SidebarProvider>
  );
}
