import { createFileRoute } from "@tanstack/react-router";
import { Clock, DoorOpen, ScanLine, TriangleAlert } from "lucide-react";
import {
  DataTable,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  type Column,
  type Tone,
  DemoBanner,
} from "@/components/common";
import { boardingEvents, gateStats, gates, num } from "@/data/mock";
import type { BoardingEvent } from "@/types";

export const Route = createFileRoute("/_admin/controle-embarque")({
  head: () => ({
    meta: [
      { title: "Controle de Embarque — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Acessos registrados nas catracas do Terminal Rodoviário de Manhuaçu e eventos de embarque.",
      },
      { property: "og:title", content: "Controle de Embarque — SisRodov Manhuaçu" },
      {
        property: "og:description",
        content: "Catracas, acessos e eventos de embarque do terminal.",
      },
    ],
  }),
  component: GateControlPage,
});

const eventTone: Record<string, Tone> = {
  Confirmado: "success",
  Pendente: "warning",
  Rejeitado: "danger",
};

function GateControlPage() {
  const columns: Column<BoardingEvent>[] = [
    {
      key: "time",
      header: "Horário",
      render: (e) => <span className="tabular font-semibold">{e.time}</span>,
    },
    { key: "device", header: "Equipamento", render: (e) => e.device },
    {
      key: "trip",
      header: "Viagem",
      render: (e) => <span className="tabular text-muted-foreground">{e.tripCode}</span>,
    },
    {
      key: "ticket",
      header: "Passagem",
      render: (e) => <span className="tabular text-muted-foreground">{e.ticketCode}</span>,
    },
    { key: "event", header: "Evento", render: (e) => e.event },
    {
      key: "status",
      header: "Status",
      render: (e) => <StatusBadge tone={eventTone[e.status]}>{e.status}</StatusBadge>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Controle de Embarque"
        subtitle="Acompanhamento dos acessos registrados nas catracas do terminal"
      />
      <DemoBanner />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Acessos hoje" value={num(gateStats.accessesToday)} icon={DoorOpen} />
        <StatCard
          label="Catracas online"
          value={gateStats.onlineGates}
          icon={ScanLine}
          tone="success"
        />
        <StatCard label="Último acesso" value={gateStats.lastAccess} icon={Clock} tone="info" />
        <StatCard
          label="Eventos pendentes"
          value={gateStats.pendingEvents}
          icon={TriangleAlert}
          tone="warning"
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {gates.map((g) => (
          <div
            key={g.id}
            className="rounded-xl border border-success/30 bg-success-soft p-5 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-bold">{g.name}</p>
              <ScanLine className="h-5 w-5 text-success" />
            </div>
            <div className="mt-3">
              <StatusBadge tone="success">Online</StatusBadge>
            </div>
            <p className="tabular mt-3 text-sm text-muted-foreground">{g.accesses} acessos hoje</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <SectionCard
          title="Eventos de embarque"
          description="Últimos registros recebidos (dados demonstrativos)"
          bodyClassName="p-0"
        >
          <DataTable columns={columns} rows={boardingEvents} />
        </SectionCard>
        <p className="mt-3 text-xs text-muted-foreground italic">
          Nesta versão os equipamentos são representados visualmente, sem integração com hardware.
        </p>
      </div>
    </>
  );
}
