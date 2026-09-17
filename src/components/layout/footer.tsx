import { GerentregasLogo } from "@/components/icons/gerentregas-logo";
import { Section } from "@/components/layout/section";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function Footer({ className }: { className?: string }) {
  return (
    <Section
      maxWidth="lg"
      className={cn(
        "flex flex-col border-t px-4 justify-center bg-muted",
        className,
      )}
      render={
        <footer>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <GerentregasLogo />
            <p className="max-w-sm text-sm text-muted-foreground">
              Acompanhamento de tempo parado em roteiros de entrega.
            </p>
          </div>
          <Separator className="mt-8" />
          <div className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Gerentregas. Todos os direitos
              reservados.
            </p>
          </div>
        </footer>
      }
    />
  );
}
