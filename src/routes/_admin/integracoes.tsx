import { createFileRoute } from "@tanstack/react-router";
import { Building2, Bus, Landmark, ScanLine, type LucideIcon } from "lucide-react";
import { PageHeader, SectionCard, StatusBadge } from "@/components/common";
import { integrations } from "@/data/mock";

export const Route = createFileRoute("/_admin/integracoes")({
  head: () => ({
    meta: [
      { title: "Integrações — SisRodov Manhuaçu" },
      {
        name: "description",
        content: "Interfaces preparadas para integração com ANTT, empresas, sistema municipal e catracas.",
      },
      { property: "og:title", content: "Integrações — SisRodov Manhuaçu" },
      { property: "og:description", content: "Interfaces preparadas para futuras integrações do terminal." },
    ],
  }),
  component: IntegrationsPage,
});

const icons: Record<string, LucideIcon> = {
  ANTT: Bus,
  Empresas: Building2,
  "Sistema Municipal": Landmark,
  Catracas: ScanLine,
};

function IntegrationsPage() {
  return (
    <>
      <PageHeader
        title="Integrações"
        subtitle="Arquitetura preparada para receber dados externos em versões futuras"
      />

      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((i) => {
          const Icon = icons[i.name] ?? Bus;
          return (
            <SectionCard key={i.id}>
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-6 w-6" />
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-bold">{i.name}</h3>
                    <StatusBadge tone="neutral" dot={false}>
                      {i.badge}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{i.description}</p>
                  <p className="mt-3 text-sm font-semibold text-primary">{i.status}</p>
                </div>
              </div>
            </SectionCard>
          );
        })}
      </div>

      <p className="mt-5 text-xs text-muted-foreground italic">
        Nesta versão nenhuma conexão externa é realizada — as telas demonstram como as integrações serão
        apresentadas.
      </p>
    </>
  );
}
