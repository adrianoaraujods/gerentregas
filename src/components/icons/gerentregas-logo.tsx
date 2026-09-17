import { cn } from "@/lib/utils";

export function GerentregasLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-heading font-bold text-lg tracking-tight text-foreground",
        className,
      )}
    >
      Gerentregas
    </span>
  );
}
