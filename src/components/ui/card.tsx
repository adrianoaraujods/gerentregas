import { useRender } from "@base-ui/react";
import { cn } from "cn";

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
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-2xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        className,
      ),
      ...props,
    },
    render,
    state: {
      slot: "card",
      size,
    },
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
        "group/card-header @container/card-header grid auto-rows-min items-start gap-2 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className,
      ),
      ...props,
    },
    render,
    state: {
      slot: "card-header",
    },
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
      className: cn("font-heading text-base font-medium", className),
      ...props,
    },
    render,
    state: {
      slot: "card-title",
    },
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
      className: cn("text-sm text-muted-foreground", className),
      ...props,
    },
    render,
    state: {
      slot: "card-description",
    },
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
      ...props,
    },
    render,
    state: {
      slot: "card-action",
    },
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
      ...props,
    },
    render,
    state: {
      slot: "card-content",
    },
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
        "flex items-center rounded-b-xl px-(--card-spacing) [.border-t]:pt-(--card-spacing)",
        className,
      ),
      ...props,
    },
    render,
    state: {
      slot: "card-footer",
    },
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
