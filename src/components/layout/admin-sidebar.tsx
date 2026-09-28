"use client";

import {
  Car01Icon,
  ChevronsLeftRightIcon,
  DashboardSquare01Icon,
  HistoryIcon,
  MapIcon,
  MapPinIcon,
  Settings01Icon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GerentregasLogo } from "@/components/icons/gerentregas-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { Navlink } from "@/lib/config";
import { formatAvatarFallback } from "@/lib/formatter";
import type { User } from "@/server/modules/auth";
import { UserDropdownMenu } from "../modules/auth/user-dropdown-menu";

const mainNav: Navlink[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: DashboardSquare01Icon,
  },
  { label: "Roteiros", href: "/admin/roteiros", icon: MapIcon },
  { label: "Motoristas", href: "/admin/motoristas", icon: UserMultipleIcon },
  { label: "Frota", href: "/admin/frota", icon: Car01Icon },
  { label: "Pontos", href: "/admin/pontos", icon: MapPinIcon },
  { label: "Histórico", href: "/admin/historico", icon: HistoryIcon },
];

const configNav: Navlink[] = [
  {
    label: "Configurações",
    href: "/admin/configuracoes",
    icon: Settings01Icon,
  },
];

export default function AdminSidebar({ user }: { user: User }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-10 items-center gap-2.5 px-2">
          <Link href="/admin">
            <span className="group-data-[collapsible=icon]:hidden">
              <GerentregasLogo />
            </span>
            <span className="hidden shrink-0 group-data-[collapsible=icon]:block">
              G
            </span>
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Geral</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    isActive={
                      item.href === "/admin"
                        ? pathname === "/admin"
                        : pathname.startsWith(item.href)
                    }
                    tooltip={item.label}
                    render={<Link href={item.href} />}
                  >
                    {item.icon && (
                      <HugeiconsIcon icon={item.icon} aria-hidden="true" />
                    )}

                    {item.label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configNav.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    isActive={item.href === pathname}
                    tooltip={item.label}
                    render={<Link href={item.href} />}
                  >
                    {item.icon && (
                      <HugeiconsIcon icon={item.icon} aria-hidden="true" />
                    )}

                    {item.label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserDropdownMenu
          className="flex gap-4 items-center px-2"
          render={<Button variant="ghost" />}
          user={user}
        >
          <Avatar className="size-8">
            {user.image && <AvatarImage src={user.image} alt={user.name} />}
            <AvatarFallback>{formatAvatarFallback(user.name)}</AvatarFallback>
          </Avatar>

          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs">{user.email}</span>
          </div>

          <HugeiconsIcon
            className="ml-auto size-5 group-data-[collapsible=icon]:hidden rotate-90"
            icon={ChevronsLeftRightIcon}
          />
        </UserDropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
