import Link from "next/link";
import type { ReactNode } from "react";
import { GerentregasLogo } from "@/components/icons/gerentregas-logo";
import { GridPattern } from "@/components/layout/background-patterns";
import { Footer } from "@/components/layout/footer";
import {
  Navbar,
  NavbarContent,
  NavbarProvider,
} from "@/components/layout/navbar";

export default function AuthPagesLayout({ children }: { children: ReactNode }) {
  return (
    <NavbarProvider>
      <Navbar>
        <NavbarContent>
          <Link href="/">
            <GerentregasLogo className="duration-200 hover:text-primary-hover" />
          </Link>
        </NavbarContent>
      </Navbar>

      <div className="min-h-[calc(100svh-var(--navbar-height))] grid grid-rows-[1fr_auto]">
        <GridPattern>{children}</GridPattern>

        <Footer className="mt-auto" />
      </div>
    </NavbarProvider>
  );
}
