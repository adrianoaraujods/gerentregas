import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const buttonGroupVariants = cva(
  cn(
    // The GROUP itself is the cohesive NeoBrutalist unit: a single bold border +
    // one hard offset shadow wrapping every segment, so it reads as ONE unit.
    // The frame animates so the whole group can press like a single Button.
    "relative inline-flex w-fit items-stretch border-2 border-foreground bg-background shadow-md transition-all duration-200",
    // Segments become flush fills — the frame owns the border, shadow and corners.
    "[&>*]:rounded-none",
    "[&>:is(button,a)]:border-0 [&>:is(button,a)]:shadow-none!",
    // Segments never translate on their own — only the whole frame moves.
    "[&>:is(button,a)]:hover:translate-y-0! [&>:is(button,a)]:active:translate-x-0! [&>:is(button,a)]:active:translate-y-0!",
    // The WHOLE group presses into its shadow like a single Button: hover sinks it
    // toward the shadow, press sits it flush (shadow gone).
    "has-[:is(button,a):hover]:translate-y-1 has-[:is(button,a):hover]:shadow",
    "has-[:is(button,a):active]:translate-y-2 has-[:is(button,a):active]:translate-x-1 has-[:is(button,a):active]:shadow-none",
    // When a group CONTAINS nested groups it becomes a plain gapped container
    // (no frame / shadow / press) so each nested sub-group is its own pressable
    // unit instead of pressing the whole outer frame.
    "has-[>[data-slot=button-group]]:gap-2 has-[>[data-slot=button-group]]:border-0 has-[>[data-slot=button-group]]:bg-transparent has-[>[data-slot=button-group]]:shadow-none! has-[>[data-slot=button-group]]:translate-x-0! has-[>[data-slot=button-group]]:translate-y-0!",
    // The hovered/pressed segment darkens in place via a full-bleed inset tint, so
    // you can still tell which segment you're acting on while the frame presses.
    "[&>:is(button,a):hover]:shadow-[inset_0_0_0_999px_#00000012]! [&>:is(button,a):active]:shadow-[inset_0_0_0_999px_#0000001f]!",

    "dark:[&>:is(button,a):hover]:shadow-[inset_0_0_0_999px_#ffffff1f]! dark:[&>:is(button,a):active]:shadow-[inset_0_0_0_999px_#ffffff33]!",
    // Solid dark segments (secondary) always lighten on hover — a dark tint would
    // be invisible on a black button in light mode.
    "[&>:is(button,a)[data-variant=secondary]:hover]:shadow-[inset_0_0_0_999px_#ffffff2b]! [&>:is(button,a)[data-variant=secondary]:active]:shadow-[inset_0_0_0_999px_#ffffff45]!",
    "[&>:is(button,a):focus-visible]:relative [&>:is(button,a):focus-visible]:z-10",
  ),
  {
    variants: {
      orientation: {
        // A single crisp seam between segments (logical side, so RTL-correct).
        horizontal:
          "flex-row [&>*:not(:first-child)]:border-s-2! [&>*:not(:first-child)]:border-foreground",
        vertical:
          "flex-col [&>*:not(:first-child)]:border-t-2! [&>*:not(:first-child)]:border-foreground",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  },
);

function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: group role unites related buttons; fieldset would alter layout semantics
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation ?? "horizontal"}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  );
}

function ButtonGroupText({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "inline-flex items-center gap-2 bg-muted px-3 font-head text-sm font-medium text-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "button-group-text",
    },
  });
}

function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
        "relative z-10 self-stretch bg-border data-horizontal:h-0.5 data-vertical:h-auto data-horizontal:w-auto data-vertical:w-0.5",
        className,
      )}
      {...props}
    />
  );
}

export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
};
