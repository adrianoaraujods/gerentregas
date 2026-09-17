import React from "react";

import type { FieldProps } from "@/components/fields";
import { useFieldContext } from "@/components/hooks/use-app-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatCNPJ, formatCPF } from "@/lib/formatter";

export function DocumentField({
  label,
  description,
  props,
  ...fieldProps
}: FieldProps<typeof Input>) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const [inputValue, setInputValue] = React.useState(
    field.state.value.length <= 11
      ? formatCPF(field.state.value)
      : formatCNPJ(field.state.value),
  );

  React.useEffect(() => {
    if (field.state.value.length <= 14) {
      if (field.state.value.length <= 11) {
        setInputValue(formatCPF(field.state.value));
      } else {
        setInputValue(formatCNPJ(field.state.value));
      }
    }
  }, [field.state.value]);

  function handleBlur(e: React.FocusEvent<HTMLInputElement, Element>) {
    if (props?.onBlur) props.onBlur(e);
    field.handleBlur();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (props?.onChange) props.onChange(e);
    field.handleChange(e.target.value.replace(/\D/g, ""));
  }

  return (
    <Field
      data-invalid={isInvalid || fieldProps?.["aria-invalid"]}
      {...fieldProps}
    >
      {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}

      <Input
        id={field.name}
        name={field.name}
        value={inputValue}
        onBlur={handleBlur}
        onChange={handleChange}
        aria-invalid={isInvalid || props?.["aria-invalid"]}
        type="text"
        {...props}
      />

      {description && <FieldDescription>{description}</FieldDescription>}

      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
