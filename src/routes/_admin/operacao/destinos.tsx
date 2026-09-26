import { createFileRoute } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/common";
import { destinations, num } from "@/data/mock";

export const Route = createFileRoute("/_admin/operacao/destinos")({
  head: () => ({
    meta: [
      { title: "Destinos — SisRodov Manhuaçu" },
      {
        name: "description",
        content: "Destinos mais utilizados a partir do Terminal Rodoviário de Manhuaçu, com viagens e embarques.",
      },
      { property: "og:title", content: "Destinos — SisRodov Manhuaçu" },
      { property: "og:description", content: "Destinos mais utilizados, viagens e embarques por cidade." },
    ],
  }),
  component: DestinationsPage,
});

function DestinationsPage() {
  const max = Math.max(...destinations.map((d) => d.boardings));

  return (
    <>
      <PageHeader title="Destinos" subtitle="Cidades atendidas a partir do Terminal Rodoviário de Manhuaçu" />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <SectionCard title="Destinos mais utilizados" description="Embarques registrados no dia">
          <ul className="space-y-4">
            {destinations.map((d) => (
              <li key={d.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{d.name}</span>
                  <span className="tabular text-muted-foreground">
                    {num(d.boardings)} embarques · {d.trips} viagens
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(d.boardings / max) * 100}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{d.companies.join(" · ")}</p>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Mapa esquemático" description="Representação visual simplificada das ligações">
          <div className="relative rounded-xl border border-border bg-muted/40 p-6">
            <div className="mx-auto mb-6 w-fit rounded-lg gradient-institutional px-5 py-3 text-center text-primary-foreground">
              <MapPin className="mx-auto h-5 w-5" />
              <p className="mt-1 font-display text-sm font-bold tracking-wide uppercase">Manhuaçu</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {destinations.slice(0, 8).map((d) => (
                <div key={d.name} className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
                  <p className="text-sm font-semibold">{d.name}</p>
                  <p className="tabular text-xs text-muted-foreground">{d.trips} viagens/dia</p>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground italic">
            Representação esquemática, sem utilização de mapas reais.
          </p>
        </SectionCard>
      </div>
    </>
  );
}
