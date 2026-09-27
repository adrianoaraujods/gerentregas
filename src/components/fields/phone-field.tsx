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
import { formatPhone } from "@/lib/formatter";
import { normalizePhone } from "@/lib/validators";

export function PhoneField({
  label,
  description,
  props,
  ...fieldProps
}: FieldProps<typeof Input>) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const [inputValue, setInputValue] = React.useState(
    formatPhone(normalizePhone(field.state.value)),
  );

  React.useEffect(() => {
    const normalized = normalizePhone(field.state.value);

    if (normalized !== field.state.value) {
      field.handleChange(normalized);
      return;
    }

    if (normalized.length <= 11) {
      setInputValue(formatPhone(normalized));
    }
  }, [field.state.value, field.handleChange]);

  function handleBlur(e: React.FocusEvent<HTMLInputElement, Element>) {
    if (props?.onBlur) props.onBlur(e);
    field.handleBlur();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (props?.onChange) props.onChange(e);
    field.handleChange(normalizePhone(e.target.value));
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
        aria-invalid={isInvalid}
        type="text"
        inputMode="numeric"
        maxLength={15}
        {...props}
      />

      {description && <FieldDescription>{description}</FieldDescription>}

      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
