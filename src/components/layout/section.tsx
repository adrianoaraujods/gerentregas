import { useRender } from "@base-ui/react";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

export const sectionVariants = cva("mx-auto w-full p-4 py-8", {
  variants: {
    variant: {
      default: "",
      background: "bg-background text-foreground",
      secondary: "bg-secondary font-bold text-secondary-foreground",
      primary: "bg-primary font-bold text-primary-foreground",
      muted: "bg-muted text-muted-foreground",
    },
    maxWidth: {
      sm: "min-[calc(768px+2rem)]:px-[calc((100vw-768px)/2)]",
      md: "min-[calc(1024px+2rem)]:px-[calc((100vw-1024px)/2)]",
      lg: "min-[calc(1280px+2rem)]:px-[calc((100vw-1280px)/2)]",
      xl: "min-[calc(1536px+2rem)]:px-[calc((100vw-1536px)/2)]",
      "2xl": "min-[calc(1920px+2rem)]:px-[calc((100vw-1920px)/2)]",
    },
  },
  defaultVariants: {
    variant: "default",
    maxWidth: "md",
  },
});

export function Section({
  className,
  variant,
  maxWidth,
  render,
  ...props
}: useRender.ComponentProps<"section"> & VariantProps<typeof sectionVariants>) {
  return useRender({
    defaultTagName: "section",
    props: {
      className: cn(sectionVariants({ variant, maxWidth, className })),
      "data-slot": "section",
      ...props,
    },
    render,
  });
}
