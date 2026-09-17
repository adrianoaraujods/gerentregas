import { UploadIcon } from "lucide-react";
import React from "react";

import type { FieldProps } from "@/components/fields";
import { FilePreviewField } from "@/components/fields/file-preview-field";
import { useFieldContext } from "@/components/hooks/use-app-form";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import type { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function FileDropzoneField({
  label,
  description,
  props,
  ...fieldProps
}: FieldProps<typeof Input>) {
  const field = useFieldContext<File | undefined>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (props?.onChange) props.onChange(e);
    field.handleChange(e.target.files?.[0]);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setDragging(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      field.handleChange(e.dataTransfer.files?.[0]);
    }
  }

  function handleClear() {
    field.handleChange(undefined);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (field.state.value) {
    return <FilePreviewField file={field.state.value} onClear={handleClear} />;
  }

  return (
    <Field
      data-invalid={isInvalid || fieldProps?.["aria-invalid"]}
      {...fieldProps}
    >
      {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}

      <input
        ref={inputRef}
        onChange={handleChange}
        type="file"
        {...props}
        hidden
      />

      {!props?.disabled && (
        <Empty
          className={cn(
            "cursor-pointer border",
            dragging && "border-primary bg-muted/50",
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UploadIcon className="size-4" />
            </EmptyMedia>
            <EmptyTitle>Clique ou arraste o arquivo</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <EmptyDescription>
              {props?.accept
                ? `Formatos aceitos: ${props?.accept.split(",").join(", ")}`
                : "Selecione um arquivo do seu computador"}
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      )}

      {description && <FieldDescription>{description}</FieldDescription>}

      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
