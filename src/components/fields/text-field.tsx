import type { FieldProps } from "@/components/fields";
import { useFieldContext } from "@/components/hooks/use-app-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function TextField({
  label,
  description,
  props,
  suffix,
  ...fieldProps
}: FieldProps<typeof Input> & { suffix?: React.ReactNode }) {
  const field = useFieldContext<string | number | undefined>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const { className: inputClassName, ...inputProps } = props ?? {};

  function handleBlur(e: React.FocusEvent<HTMLInputElement, Element>) {
    if (inputProps.onBlur) inputProps.onBlur(e);
    field.handleBlur();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (inputProps.onChange) inputProps.onChange(e);
    field.handleChange(e.target.value);
  }

  return (
    <Field
      data-invalid={isInvalid || fieldProps?.["aria-invalid"]}
      {...fieldProps}
    >
      {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}

      <div className="relative">
        <Input
          id={field.name}
          name={field.name}
          value={field.state.value || ""}
          onBlur={handleBlur}
          {...inputProps}
          onChange={handleChange}
          aria-invalid={isInvalid || inputProps["aria-invalid"]}
          className={cn(suffix && "pr-9", inputClassName)}
        />

        {suffix && (
          <div className="absolute top-1/2 right-1 -translate-y-1/2">
            {suffix}
          </div>
        )}
      </div>

      {description && <FieldDescription>{description}</FieldDescription>}

      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
