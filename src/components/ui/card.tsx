import { useRender } from "@base-ui/react";

import { cn } from "@/lib/utils";

function Card({
  className,
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return useRender({
    defaultTagName: "div",
    props: {
      className: cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded border-2 bg-card py-(--card-spacing) text-card-foreground text-sm shadow-md [--card-spacing:--spacing(4)] has-[>img:first-child]:pt-0 has-data-[slot=card-footer]:pb-0 data-[size=sm]:has-data-[slot=card-footer]:pb-0 data-[size=sm]:[--card-spacing:--spacing(3)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        className,
      ),
      "data-slot": "card",
      "data-size": size,
      ...props,
    },
    render,
  });
}

function CardHeader({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: {
      className: cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className,
      ),
      "data-slot": "card-header",
      ...props,
    },
    render,
  });
}

function CardTitle({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: {
      className: cn(
        "font-heading font-medium text-base leading-snug group-data-[size=sm]/card:text-sm",
        className,
      ),
      "data-slot": "card-title",
      ...props,
    },
    render,
  });
}

function CardDescription({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: {
      className: cn("text-muted-foreground font-base text-sm", className),
      "data-slot": "card-description",
      ...props,
    },
    render,
  });
}

function CardAction({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: {
      className: cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      ),
      "data-slot": "card-action",
      ...props,
    },
    render,
  });
}

function CardContent({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: {
      className: cn("px-(--card-spacing)", className),
      "data-slot": "card-content",
      ...props,
    },
    render,
  });
}

function CardFooter({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: {
      className: cn(
        "flex items-center rounded-b-xl border-t-2 bg-muted/50 p-(--card-spacing)",
        className,
      ),
      "data-slot": "card-footer",
      ...props,
    },
    render,
  });
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
