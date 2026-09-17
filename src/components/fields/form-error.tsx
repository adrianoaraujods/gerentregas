import { useFormContext } from "@/components/hooks/use-app-form";
import { FieldError } from "@/components/ui/field";

export function FormError(
  props: Omit<React.ComponentProps<typeof FieldError>, "errors">,
) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={({ errorMap }) => errorMap.onSubmit}>
      {(errros) => <FieldError errors={errros} {...props} />}
    </form.Subscribe>
  );
}
