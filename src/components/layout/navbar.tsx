"use client";

import { useRender } from "@base-ui/react";
import { Cancel01Icon, Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { VariantProps } from "class-variance-authority";
import Link from "next/link";
import React from "react";
import { useIsMobile } from "@/components/hooks/use-mobile";
import { sectionVariants } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Navlink } from "@/lib/config";
import { cn } from "@/lib/utils";

type NavbarContextProps = {
  expanded: boolean;
  setExpanded: (open: boolean) => void;
  toggleNavbar: () => void;
};

const NavbarContext = React.createContext<NavbarContextProps | null>(null);

function useNavbar() {
  const context = React.useContext(NavbarContext);
  if (!context) {
    throw new Error("useNavbar must be used within a NavbarProvider.");
  }

  return context;
}

function NavbarProvider({
  children,
  expanded: expandedProp,
  setExpanded: setExpandedProp,
}: {
  children: React.ReactNode;
  expanded?: boolean;
  setExpanded?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();

  // This is the internal state of the navbar.
  // Use expandedProp and setExpandedProp for control from outside the component.
  const [_expanded, _setExpanded] = React.useState(false);
  const expanded = expandedProp ?? _expanded;

  const setExpanded = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const expandedState =
        typeof value === "function" ? value(expanded) : value;

      if (setExpandedProp) {
        setExpandedProp(expandedState);
      } else {
        _setExpanded(expandedState);
      }
    },
    [expanded, setExpandedProp],
  );

  // Helper to toggle the navbar.
  const toggleNavbar = React.useCallback(() => {
    if (isMobile) {
      return setExpanded((expanded) => !expanded);
    }
  }, [isMobile, setExpanded]);

  // closes the menu if not in mobile
  React.useEffect(() => {
    if (!isMobile) {
      setExpanded(false);
    }
  }, [isMobile, setExpanded]);

  const contextValue = React.useMemo<NavbarContextProps>(
    () => ({ expanded, setExpanded, toggleNavbar }),
    [expanded, setExpanded, toggleNavbar],
  );

  return (
    <NavbarContext.Provider value={contextValue}>
      {children}
    </NavbarContext.Provider>
  );
}

function Navbar({
  className,
  variant,
  maxWidth = "lg",
  render,
  ...props
}: useRender.ComponentProps<"header"> & VariantProps<typeof sectionVariants>) {
  return useRender({
    defaultTagName: "header",
    props: {
      className: cn(
        sectionVariants({ variant, maxWidth }),
        "sticky top-0 p-0 z-30 flex h-(--navbar-height) gap-4 border-b bg-sidebar px-4 text-sidebar-foreground",
        className,
      ),
      "data-slot": "navbar",
      ...props,
    },
    render,
  });
}

function NavbarContent({
  className,
  render,
  ...props
}: useRender.ComponentProps<"nav">) {
  return useRender({
    defaultTagName: "nav",
    props: {
      className: cn(
        "flex w-full items-center justify-between gap-4",
        className,
      ),
      "data-slot": "section",
      ...props,
    },
    render,
  });
}

function NavbarLinks({
  links,
  className,
  ...props
}: Omit<React.ComponentProps<"ul">, "children"> & {
  links: Navlink[];
}) {
  return (
    <ul className={cn("flex", className)} {...props}>
      {links.map(({ href, label }) => (
        <li key={href}>
          <Button
            variant="ghost"
            render={<Link href={href}>{label}</Link>}
            nativeButton={false}
          />
        </li>
      ))}
    </ul>
  );
}

function NavbarMenu({
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof Sheet>,
  "open" | "onOpenChange" | "defaultOpen"
>) {
  const { expanded, setExpanded } = useNavbar();

  return (
    <Sheet open={expanded} onOpenChange={setExpanded} {...props}>
      {children}
    </Sheet>
  );
}

function NavbarMenuTrigger({
  size = "icon",
  children,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { expanded, toggleNavbar } = useNavbar();

  return (
    <SheetTrigger
      render={
        <Button
          size={size}
          onClick={(event) => {
            onClick?.(event);
            toggleNavbar();
          }}
          {...props}
        >
          <span className="sr-only">Alternar menu de navegação</span>

          {children ||
            (expanded ? (
              <HugeiconsIcon icon={Cancel01Icon} className="size-8" />
            ) : (
              <HugeiconsIcon icon={Menu01Icon} className="size-8" />
            ))}
        </Button>
      }
    />
  );
}

function NavbarMenuContent({
  className,
  children,
  showCloseButton = false,
  side = "top",
  ...props
}: React.ComponentProps<typeof SheetContent>) {
  return (
    <SheetContent
      className={cn(
        "top-(--navbar-height) z-20 h-fit w-fit rounded-br-3xl border-0 bg-primary p-2 font-bold text-primary-foreground",
        className,
      )}
      showCloseButton={showCloseButton}
      side={side}
      {...props}
    >
      <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>

      <div
        className="absolute -top-px right-px size-6 translate-x-full bg-primary"
        style={{
          maskImage:
            "radial-gradient(circle at bottom right, transparent 23px, var(--primary) 24px)",
        }}
      />

      {children}
    </SheetContent>
  );
}

export {
  Navbar,
  NavbarContent,
  NavbarLinks,
  NavbarMenu,
  NavbarMenuContent,
  NavbarMenuTrigger,
  NavbarProvider,
  useNavbar,
};
