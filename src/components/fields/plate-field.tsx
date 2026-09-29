import * as React from "react";

import type { FieldProps } from "@/components/fields";
import { useFieldContext } from "@/components/hooks/use-app-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatPlate } from "@/lib/formatter";
import { cn } from "@/lib/utils";
import { normalizePlate } from "@/lib/validators";

export function PlateField({
  label,
  description,
  props,
  ...fieldProps
}: FieldProps<typeof Input>) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const [inputValue, setInputValue] = React.useState(
    formatPlate(normalizePlate(field.state.value ?? "")),
  );

  React.useEffect(() => {
    const value = field.state.value ?? "";
    const normalized = normalizePlate(value).slice(0, 7);

    if (normalized !== value) {
      field.handleChange(normalized);
      return;
    }

    setInputValue(formatPlate(normalized));
  }, [field.state.value, field.handleChange]);

  function handleBlur(e: React.FocusEvent<HTMLInputElement, Element>) {
    if (props?.onBlur) props.onBlur(e);
    field.handleBlur();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (props?.onChange) props.onChange(e);
    field.handleChange(normalizePlate(e.target.value).slice(0, 7));
  }

  const { className: inputClassName, ...inputProps } = props ?? {};

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
        aria-invalid={isInvalid}
        type="text"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={8}
        {...inputProps}
        className={cn("font-mono uppercase", inputClassName)}
      />

      {description && <FieldDescription>{description}</FieldDescription>}

      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
