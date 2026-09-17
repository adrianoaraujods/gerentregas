import { useRender } from "@base-ui/react";
import { cn } from "@/lib/utils";

export function GridPattern({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: {
      className: cn(
        "h-full w-full bg-[linear-gradient(to_right,color-mix(in_srgb,var(--border)_10%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--border)_10%,transparent)_1px,transparent_1px)] bg-background bg-size-[64px_64px]",
        className,
      ),
      ...props,
    },
    render,
  });
}
