import { createFileRoute } from "@tanstack/react-router";
import { Bus, Wrench, CircleCheck } from "lucide-react";
import { PageHeader, SectionCard, StatusBadge, DemoBanner } from "@/components/common";
import { platforms } from "@/data/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_admin/operacao/plataformas")({
  head: () => ({
    meta: [
      { title: "Plataformas — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Situação das plataformas de embarque da Nova Rodoviária de Manhuaçu em tempo real.",
      },
      { property: "og:title", content: "Plataformas — SisRodov Manhuaçu" },
      {
        property: "og:description",
        content: "Ocupação e disponibilidade das plataformas do terminal.",
      },
    ],
  }),
  component: PlatformsPage,
});

const config = {
  disponivel: {
    tone: "success",
    label: "Disponível",
    icon: CircleCheck,
    ring: "border-success/35 bg-success-soft",
  },
  ocupada: { tone: "info", label: "Ocupada", icon: Bus, ring: "border-info/35 bg-info-soft" },
  manutencao: {
    tone: "warning",
    label: "Manutenção",
    icon: Wrench,
    ring: "border-warning/40 bg-warning-soft",
  },
} as const;

function PlatformsPage() {
  return (
    <>
      <PageHeader
        title="Plataformas"
        subtitle="Ocupação das plataformas da Nova Rodoviária de Manhuaçu"
      />
      <DemoBanner reason="aguardando lançamento pela equipe do terminal" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {platforms.map((p) => {
          const c = config[p.status];
          const Icon = c.icon;
          return (
            <div
              key={p.id}
              className={cn(
                "rounded-xl border p-5 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5",
                c.ring,
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                    Plataforma
                  </p>
                  <p className="tabular font-display text-4xl font-extrabold">{p.number}</p>
                </div>
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-4">
                <StatusBadge tone={c.tone}>{c.label}</StatusBadge>
              </div>
              <p className="mt-3 min-h-[1.25rem] text-sm font-medium">
                {p.label ?? "Sem viagem alocada"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <SectionCard
          title="Visão do saguão"
          description="Representação visual das plataformas do terminal"
        >
          <div className="rounded-xl border border-border bg-muted/40 p-6">
            <div className="flex flex-wrap gap-3">
              {platforms.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "flex h-24 w-32 flex-col items-center justify-center rounded-lg border-2 text-center",
                    p.status === "ocupada"
                      ? "border-info bg-info-soft"
                      : p.status === "manutencao"
                        ? "border-warning bg-warning-soft"
                        : "border-dashed border-border bg-card",
                  )}
                >
                  <p className="tabular font-display text-2xl font-bold">{p.number}</p>
                  <p className="px-2 text-[11px] leading-tight text-muted-foreground">
                    {p.label ?? "Livre"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
