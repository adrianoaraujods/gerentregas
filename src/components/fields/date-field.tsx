"use client";

import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React from "react";

import type { FieldProps } from "@/components/fields";
import { useFieldContext } from "@/components/hooks/use-app-form";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { parseISODate, toISODateValue } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function DateField({
  label,
  description,
  props,
  ...fieldProps
}: FieldProps<typeof InputGroupInput>) {
  const field = useFieldContext<Date>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(field.state.value);
  const [inputValue, setInputValue] = React.useState(() =>
    toISODateValue(field.state.value),
  );

  React.useEffect(() => {
    setInputValue(toISODateValue(field.state.value));
  }, [field.state.value]);

  function handleBlur(e: React.FocusEvent<HTMLInputElement, Element>) {
    if (props?.onBlur) props.onBlur(e);
    const date = parseISODate(inputValue);
    if (date) field.handleChange(date);
    field.handleBlur();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (props?.onKeyDown) props.onKeyDown(e);
    if (e.key === "Space" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement, HTMLInputElement>,
  ) {
    if (props?.onChange) props.onChange(e);
    setInputValue(e.target.value);
  }

  function handleSelect(date: Date | undefined) {
    if (date) {
      field.handleChange(date);
    }
    setOpen(false);
  }

  return (
    <Field
      data-invalid={isInvalid || fieldProps?.["aria-invalid"]}
      {...fieldProps}
    >
      {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}

      <InputGroup>
        <InputGroupInput
          id={field.name}
          name={field.name}
          value={inputValue}
          onBlur={handleBlur}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={cn(
            "appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:appearance-none",
            props?.className,
          )}
          aria-invalid={isInvalid || props?.["aria-invalid"]}
          type="date"
          {...props}
        />

        <InputGroupAddon align="inline-end">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              className="cursor-pointer"
              render={<HugeiconsIcon icon={Calendar01Icon} />}
            />

            <PopoverContent
              className="w-auto"
              align="end"
              alignOffset={-8}
              sideOffset={12}
            >
              <Calendar
                mode="single"
                month={month}
                selected={field.state.value}
                onMonthChange={setMonth}
                captionLayout="dropdown"
                onSelect={handleSelect}
              />
            </PopoverContent>
          </Popover>
        </InputGroupAddon>
      </InputGroup>

      {description && <FieldDescription>{description}</FieldDescription>}

      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
