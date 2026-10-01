import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Ticket, TicketX, TicketCheck, TicketSlash } from "lucide-react";
import {
  DataTable,
  FilterBar,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  type Column,
  type Tone,
  DemoBanner,
} from "@/components/common";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { allTrips, companyName, num, ticketStats, tickets } from "@/data/mock";
import type { Ticket as TicketType } from "@/types";

export const Route = createFileRoute("/_admin/passagens")({
  head: () => ({
    meta: [
      { title: "Passagens — SisRodov Manhuaçu" },
      {
        name: "description",
        content:
          "Passagens emitidas, utilizadas e canceladas nas viagens do Terminal Rodoviário de Manhuaçu.",
      },
      { property: "og:title", content: "Passagens — SisRodov Manhuaçu" },
      {
        property: "og:description",
        content: "Controle de passagens emitidas, utilizadas e canceladas.",
      },
    ],
  }),
  component: TicketsPage,
});

const statusMap: Record<string, { tone: Tone; label: string }> = {
  emitida: { tone: "info", label: "Emitida" },
  utilizada: { tone: "success", label: "Utilizada" },
  cancelada: { tone: "danger", label: "Cancelada" },
  "nao-utilizada": { tone: "warning", label: "Não utilizada" },
};

function TicketsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");

  const rows = useMemo(
    () =>
      tickets.filter((t) => {
        const q = search.trim().toLowerCase();
        return (
          (!q ||
            `${t.code} ${t.destination} ${companyName(t.companyId)}`.toLowerCase().includes(q)) &&
          (status === "todos" || t.status === status)
        );
      }),
    [search, status],
  );

  const tripNumber = (tripId: string) => allTrips.find((t) => t.id === tripId)?.number ?? "—";

  const columns: Column<TicketType>[] = [
    {
      key: "code",
      header: "Passagem",
      render: (t) => <span className="tabular font-semibold">{t.code}</span>,
    },
    {
      key: "trip",
      header: "Viagem",
      render: (t) => <span className="tabular text-muted-foreground">{tripNumber(t.tripId)}</span>,
    },
    { key: "company", header: "Empresa", render: (t) => companyName(t.companyId) },
    { key: "origin", header: "Origem", render: (t) => t.origin },
    { key: "dest", header: "Destino", render: (t) => t.destination },
    {
      key: "issued",
      header: "Emissão",
      render: (t) => <span className="tabular text-muted-foreground">{t.issuedAt}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (t) => (
        <StatusBadge tone={statusMap[t.status].tone}>{statusMap[t.status].label}</StatusBadge>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Passagens" subtitle="Passagens informadas pelas empresas de transporte" />
      <DemoBanner />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Emitidas hoje" value={num(ticketStats.issued)} icon={Ticket} />
        <StatCard label="Canceladas" value={ticketStats.cancelled} icon={TicketX} tone="danger" />
        <StatCard
          label="Utilizadas"
          value={num(ticketStats.used)}
          icon={TicketCheck}
          tone="success"
        />
        <StatCard
          label="Não utilizadas"
          value={ticketStats.unused}
          icon={TicketSlash}
          tone="warning"
        />
      </div>

      <div className="mt-6">
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Pesquisar passagem, empresa ou destino..."
        >
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[12rem]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="emitida">Emitida</SelectItem>
              <SelectItem value="utilizada">Utilizada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
              <SelectItem value="nao-utilizada">Não utilizada</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>

        <SectionCard bodyClassName="p-0">
          <DataTable columns={columns} rows={rows} />
        </SectionCard>
        <p className="mt-3 text-xs text-muted-foreground">
          Dados fictícios — nenhuma informação pessoal de passageiros é utilizada.
        </p>
      </div>
    </>
  );
}
