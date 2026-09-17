import { useCallback, useState } from "react";

import type { FieldProps } from "@/components/fields";
import { useFieldContext } from "@/components/hooks/use-app-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatBRL, parseBRL } from "@/lib/formatter";
import { cn } from "@/lib/utils";

function toRawInput(value: number | null): string {
  if (value === null || value === undefined) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function MoneyField({
  label,
  description,
  props,
  ...fieldProps
}: FieldProps<typeof Input>) {
  const field = useFieldContext<number | null>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const [focused, setFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState("");

  const {
    className: inputClassName,
    onBlur: inputOnBlur,
    ...inputProps
  } = props ?? {};

  const formatted = formatBRL(field.state.value ?? 0);

  const handleFocus = useCallback(() => {
    setDisplayValue(toRawInput(field.state.value));
    setFocused(true);
  }, [field.state.value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value);
  }, []);

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      if (inputOnBlur) inputOnBlur(e);
      field.handleBlur();

      const parsed = parseBRL(displayValue);
      if (!Number.isNaN(parsed)) {
        field.handleChange(parsed);
      }
      setFocused(false);
    },
    [displayValue, field, inputOnBlur],
  );

  return (
    <Field
      data-invalid={isInvalid || fieldProps?.["aria-invalid"]}
      {...fieldProps}
    >
      {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}

      <Input
        id={field.name}
        name={field.name}
        type="text"
        inputMode="decimal"
        value={focused ? displayValue : formatted}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={isInvalid || inputProps?.["aria-invalid"]}
        className={cn("tabular-nums", inputClassName)}
        placeholder="0,00"
        {...inputProps}
      />

      {description && <FieldDescription>{description}</FieldDescription>}

      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
