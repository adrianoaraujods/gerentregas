import { useFormContext } from "@/components/hooks/use-app-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Spinner } from "../ui/spinner";

type SubmitButtonProps = Omit<React.ComponentProps<typeof Button>, "type">;

export function SubmitButton({
  className,
  variant = "default",
  size = "lg",
  disabled,
  children,
  ...props
}: SubmitButtonProps) {
  const form = useFormContext();

  return (
    <form.Subscribe
      selector={({ canSubmit, isSubmitting }) => ({ canSubmit, isSubmitting })}
    >
      {({ canSubmit, isSubmitting }) => (
        <Button
          className={cn("w-full", className)}
          variant={variant}
          size={size}
          disabled={disabled || !canSubmit || isSubmitting}
          type="submit"
          {...props}
        >
          {isSubmitting ? <Spinner /> : children}
        </Button>
      )}
    </form.Subscribe>
  );
}
