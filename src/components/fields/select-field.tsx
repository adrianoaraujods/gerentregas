import type { SelectRootChangeEventDetails } from "@base-ui/react";
import type { FieldProps } from "@/components/fields";
import { useFieldContext } from "@/components/hooks/use-app-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SelectField({
  label,
  description,
  props,
  ...fieldProps
}: FieldProps<typeof Select>) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  function handleChange(value: unknown, e: SelectRootChangeEventDetails) {
    if (props?.onValueChange) props.onValueChange(value, e);
    field.handleChange(String(value));
  }

  return (
    <Field
      data-invalid={isInvalid || fieldProps?.["aria-invalid"]}
      {...fieldProps}
    >
      {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}

      <Select value={field.state.value} onValueChange={handleChange} {...props}>
        <SelectTrigger
          id={field.name}
          name={field.name}
          aria-invalid={isInvalid}
        >
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          {props?.items &&
            Array.isArray(props.items) &&
            props.items.map(({ value, label }) => (
              <SelectItem value={value} key={value}>
                {label}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      {description && <FieldDescription>{description}</FieldDescription>}

      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
