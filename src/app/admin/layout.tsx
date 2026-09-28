import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import AdminSidebar from "@/components/layout/admin-sidebar";
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
    <SidebarProvider className="min-h-svh bg-zinc-950" defaultOpen>
      <AdminSidebar user={session.user as User} />

      <SidebarInset className="bg-transparent overflow-hidden">
        <header className="flex h-(--navbar-height) items-center shrink-0 gap-2 m-4 rounded-xl border border-white/10 bg-background/60 backdrop-blur-xl px-4 shadow-sm relative z-50">
          <SidebarTrigger className="-ml-1" />
        </header>

        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
