"use client";

import type { MenuPositionerProps } from "@base-ui/react";
import {
  Logout01Icon,
  Moon02Icon,
  PaintBoardIcon,
  Refresh03Icon,
  ShieldUserIcon,
  SunIcon,
  UserAccountIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/client";
import type { Theme } from "@/lib/config";
import { formatAvatarFallback } from "@/lib/formatter";
import type { User } from "@/server/modules/auth";

const themes: {
  [key in Theme]: { label: string; icon: IconSvgElement };
} = {
  light: { label: "Claro", icon: SunIcon },
  dark: { label: "Escuro", icon: Moon02Icon },
  system: { label: "Sistema", icon: Refresh03Icon },
};

export function UserDropdownMenu({
  user,
  menu,
  content,
  align,
  alignOffset,
  side,
  sideOffset,
  ...trigger
}: React.ComponentProps<typeof DropdownMenuTrigger> &
  Pick<MenuPositionerProps, "align" | "alignOffset" | "side" | "sideOffset"> & {
    menu?: React.ComponentProps<typeof DropdownMenu>;
    user: User;
  }) {
  const router = useRouter();
  const { theme: currentTheme, setTheme } = useTheme();

  return (
    <DropdownMenu {...menu}>
      <DropdownMenuTrigger {...trigger} />

      <DropdownMenuContent
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="size-8">
                {user.image && <AvatarImage src={user.image} alt={user.name} />}
                <AvatarFallback>
                  {formatAvatarFallback(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {(user.role === "admin" || user.role === "manager") && (
            <DropdownMenuItem render={<Link href="/admin" />}>
              <HugeiconsIcon icon={ShieldUserIcon} />
              Painel
            </DropdownMenuItem>
          )}

          <DropdownMenuItem render={<Link href="/minha-conta" />}>
            <HugeiconsIcon icon={UserAccountIcon} />
            Minha conta
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <HugeiconsIcon icon={PaintBoardIcon} />
              Alterar tema
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {Object.keys(themes).map((theme) => (
                  <DropdownMenuCheckboxItem
                    key={theme}
                    checked={theme === currentTheme}
                    onCheckedChange={() => setTheme(theme)}
                  >
                    <HugeiconsIcon icon={themes[theme as Theme].icon} />
                    {themes[theme as Theme].label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          onClick={async () => {
            await authClient.signOut();
            router.push("/entrar");
          }}
        >
          <HugeiconsIcon icon={Logout01Icon} />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
