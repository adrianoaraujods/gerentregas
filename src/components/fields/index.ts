import type {
  ComponentProps,
  JSX,
  JSXElementConstructor,
  ReactNode,
} from "react";
import type { Field } from "@/components/ui/field";

export type FieldProps<
  // biome-ignore lint/suspicious/noExplicitAny: ComponentProps Generic
  Props extends keyof JSX.IntrinsicElements | JSXElementConstructor<any>,
> = ComponentProps<typeof Field> & {
  description?: ReactNode;
  label?: ReactNode;
  props?: Omit<ComponentProps<Props>, "id" | "name" | "value">;
};
