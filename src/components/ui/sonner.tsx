"use client";

import {
  Alert01Icon,
  CircleCheckIcon,
  InformationCircleIcon,
  Loading03Icon,
  OctagonXIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <HugeiconsIcon icon={CircleCheckIcon} className="size-4" />,
        info: <HugeiconsIcon icon={InformationCircleIcon} className="size-4" />,
        warning: <HugeiconsIcon icon={Alert01Icon} className="size-4" />,
        error: <HugeiconsIcon icon={OctagonXIcon} className="size-4" />,
        loading: (
          <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
        ),
      }}
      toastOptions={{
        // Fully unstyled so the neobrutalist recipe below owns every surface:
        // hard offset shadow, 2px border, square corners, press-down buttons.
        unstyled: true,
        classNames: {
          toast:
            "group/toast relative flex w-(--width) items-center gap-3 rounded border-2 border-border bg-popover p-4 font-sans text-popover-foreground shadow-md",
          content: "flex min-w-0 flex-col gap-0.5",
          title: "font-head text-sm font-medium",
          description: "text-sm text-muted-foreground",
          icon: "shrink-0",
          actionButton:
            "ms-auto h-fit min-w-fit shrink-0 rounded border-2 border-border bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none",
          cancelButton:
            "ms-auto h-fit min-w-fit shrink-0 rounded border-2 border-border bg-muted px-2 py-1 text-xs font-medium text-foreground shadow-sm transition-all duration-200 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none",
          closeButton:
            "absolute -top-2 -start-2 rounded-full border-2 border-border bg-background p-0.5 transition-colors hover:bg-muted",
          success: "[&_[data-icon]]:text-chart-2",
          warning: "[&_[data-icon]]:text-chart-1",
          error: "[&_[data-icon]]:text-destructive",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
