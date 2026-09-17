import type React from "react";
import type { FieldProps } from "@/components/fields";
import { useFieldContext } from "@/components/hooks/use-app-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

export function TextareaField({
  label,
  description,
  props,
  ...fieldProps
}: FieldProps<typeof Textarea>) {
  const field = useFieldContext<string | null>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  function handleBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    if (props?.onBlur) props.onBlur(e);
    field.handleBlur();
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (props?.onChange) props.onChange(e);
    field.handleChange(e.target.value);
  }

  return (
    <Field
      data-invalid={isInvalid || fieldProps?.["aria-invalid"]}
      {...fieldProps}
    >
      {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}

      <Textarea
        id={field.name}
        name={field.name}
        value={field.state.value ?? ""}
        onBlur={handleBlur}
        onChange={handleChange}
        aria-invalid={isInvalid || props?.["aria-invalid"]}
        {...props}
      />

      {description && <FieldDescription>{description}</FieldDescription>}

      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
