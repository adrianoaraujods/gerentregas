import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

type StopNavigationActionsProps = {
  googleUrl: string;
  wazeUrl: string;
  disabled: boolean;
  stopLabel: string;
};

function DisabledActions({ stopLabel }: { stopLabel: string }) {
  return (
    <div className="flex shrink-0 flex-col gap-2 sm:flex-row mt-2 sm:mt-0">
      {["Google Maps", "Waze"].map((label) => (
        <Button
          key={label}
          variant="outline"
          size="sm"
          type="button"
          disabled
          aria-label={`Navegação indisponível para ${stopLabel} no ${label} (parada concluída)`}
        >
          <MapPin aria-hidden="true" />
          {label}
        </Button>
      ))}
    </div>
  );
}

export function StopNavigationActions({
  googleUrl,
  wazeUrl,
  disabled,
  stopLabel,
}: StopNavigationActionsProps) {
  if (disabled) {
    return <DisabledActions stopLabel={stopLabel} />;
  }
  const actions = [
    { label: "Google Maps", url: googleUrl },
    { label: "Waze", url: wazeUrl },
  ];
  return (
    <div className="flex shrink-0 flex-col gap-2 sm:flex-row mt-2 sm:mt-0">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          render={
            <a
              href={action.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Navegar até ${stopLabel} no ${action.label}`}
            />
          }
        >
          <MapPin />
          {action.label}
        </Button>
      ))}
    </div>
  );
}

export function RemainingRouteActions({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  const [first, ...followUps] = urls;
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        size="sm"
        render={
          <a
            href={first}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir rota restante no Google Maps"
          />
        }
      >
        <ExternalLink />
        Abrir rota restante no Google Maps
      </Button>
      {followUps.map((url, index) => (
        <Button
          key={url}
          variant="ghost"
          size="sm"
          render={
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir trecho ${index + 2} da rota restante no Google Maps`}
            />
          }
        >
          <ExternalLink />
          Trecho {index + 2} da rota restante
        </Button>
      ))}
    </div>
  );
}
