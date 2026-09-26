import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { GerentregasLogo } from "@/components/icons/gerentregas-logo";
import { Footer } from "@/components/layout/footer";
import {
  Navbar,
  NavbarContent,
  NavbarProvider,
} from "@/components/layout/navbar";
import { SettingsMenu } from "@/components/layout/settings-menu";
import { UserDropdownMenu } from "@/components/modules/auth/user-dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/server";
import { formatAvatarFallback } from "@/lib/formatter";
import type { User } from "@/server/modules/auth";

export default function PagesLayout({ children }: { children: ReactNode }) {
  return (
    <NavbarProvider>
      <Navbar>
        <NavbarContent>
          <Link href="/">
            <GerentregasLogo className="duration-200" />
          </Link>

          <Suspense>
            <NavbarItems />
          </Suspense>
        </NavbarContent>
      </Navbar>

      {children}

      <Footer className="mt-auto" />
    </NavbarProvider>
  );
}

async function NavbarItems() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="flex gap-2">
        <SettingsMenu />

        <Button
          render={<Link href="/entrar">Entrar</Link>}
          nativeButton={false}
        />
      </div>
    );
  }

  const user = session.user as User;

  return (
    <UserDropdownMenu
      user={user}
      render={
        <Button
          size="icon"
          variant="secondary"
          className="bg-sidebar rounded-full size-10 p-0"
          render={<Avatar />}
          nativeButton={false}
        />
      }
      nativeButton={false}
      align="end"
    >
      {user.image && <AvatarImage src={user.image} alt={user.name} />}
      <AvatarFallback>{formatAvatarFallback(user.name)}</AvatarFallback>
    </UserDropdownMenu>
  );
}
