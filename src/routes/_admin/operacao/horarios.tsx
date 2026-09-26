import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, StatusBadge } from "@/components/common";
import { companyName, schedules } from "@/data/mock";

export const Route = createFileRoute("/_admin/operacao/horarios")({
  head: () => ({
    meta: [
      { title: "Horários — SisRodov Manhuaçu" },
      {
        name: "description",
        content: "Grade de horários do Terminal Rodoviário de Manhuaçu por empresa, destino e plataforma.",
      },
      { property: "og:title", content: "Horários — SisRodov Manhuaçu" },
      { property: "og:description", content: "Grade de horários do terminal por empresa, destino e plataforma." },
    ],
  }),
  component: SchedulesPage,
});

const situation = {
  ativo: { tone: "success", label: "Ativo" },
  suspenso: { tone: "danger", label: "Suspenso" },
  sazonal: { tone: "warning", label: "Sazonal" },
} as const;

function SchedulesPage() {
  return (
    <>
      <PageHeader title="Horários" subtitle="Grade operacional de partidas do terminal" />

      <SectionCard bodyClassName="p-0" title="Grade de partidas">
        <div className="grid grid-cols-[6rem_1fr_1fr_7rem_10rem_8rem] gap-3 border-b border-border bg-muted/60 px-5 py-3 text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">
          <span>Horário</span>
          <span>Empresa</span>
          <span>Destino</span>
          <span className="text-center">Plataforma</span>
          <span>Frequência</span>
          <span>Situação</span>
        </div>
        <div className="divide-y divide-border/60">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="grid grid-cols-[6rem_1fr_1fr_7rem_10rem_8rem] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50"
            >
              <span className="tabular font-display text-xl font-bold">{s.time}</span>
              <span className="truncate text-sm">{companyName(s.companyId)}</span>
              <span className="truncate text-sm font-semibold">{s.destination}</span>
              <span className="tabular text-center text-sm font-semibold">{s.platform}</span>
              <span className="text-sm text-muted-foreground">{s.frequency}</span>
              <StatusBadge tone={situation[s.situation].tone}>{situation[s.situation].label}</StatusBadge>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
