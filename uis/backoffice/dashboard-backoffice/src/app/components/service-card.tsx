import type { BackofficeService } from "../catalog/services";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { IconTile } from "./ui/icon-tile";

export function ServiceCard({ service }: { service: BackofficeService }) {
  return (
    <Card className="group relative flex h-full flex-col gap-4 overflow-hidden p-5 transition hover:border-brasa-600/50 hover:bg-stone-900">
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-brasa-500/50 to-transparent opacity-0 transition group-hover:opacity-100" />

      <div className="flex items-start gap-3">
        <IconTile emoji={service.icon} />
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-stone-100">
            {service.name}
          </h3>
          <p className="truncate text-xs text-stone-500">{service.area}</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-stone-400">
        {service.description}
      </p>

      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        <div className="min-w-0">
          <Badge>Responsable: {service.owner}</Badge>
          <p className="mt-2 truncate font-mono text-xs text-stone-600">
            {service.path}
          </p>
        </div>
        <a
          href={service.url}
          className="shrink-0 rounded-lg bg-brasa-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-brasa-500"
        >
          Abrir
        </a>
      </div>
    </Card>
  );
}
