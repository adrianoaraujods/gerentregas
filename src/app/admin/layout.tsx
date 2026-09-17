import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import AdminSidebar from "@/components/layout/admin-sidebar";
import { GridPattern } from "@/components/layout/background-patterns";
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
  if (
    !session ||
    (session.user.role !== "manager" && session.user.role !== "admin")
  )
    notFound();

  return (
    <SidebarProvider className="min-h-svh" defaultOpen>
      <AdminSidebar user={session.user as User} />

      <SidebarInset>
        <header className="flex h-(--navbar-height) items-center border-b-2 px-4">
          <SidebarTrigger className="-ml-1" />
        </header>

        <GridPattern className="flex-1 overflow-y-auto p-5 sm:p-7">
          {children}
        </GridPattern>
      </SidebarInset>
    </SidebarProvider>
  );
}
