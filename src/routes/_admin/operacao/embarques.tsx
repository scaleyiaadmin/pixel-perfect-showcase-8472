import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, CalendarRange, Users } from "lucide-react";
import {
  DataTable,
  FilterBar,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  reconciliationTone,
  type Column,
} from "@/components/common";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { allTrips, boardingStats, companies, companyName, num } from "@/data/mock";
import type { Trip } from "@/types";

export const Route = createFileRoute("/_admin/operacao/embarques")({
  head: () => ({
    meta: [
      { title: "Embarques — SisRodov Manhuaçu" },
      {
        name: "description",
        content: "Acompanhamento dos embarques registrados por viagem, empresa e destino no terminal de Manhuaçu.",
      },
      { property: "og:title", content: "Embarques — SisRodov Manhuaçu" },
      { property: "og:description", content: "Embarques registrados por viagem, empresa e destino." },
    ],
  }),
  component: BoardingsPage,
});

function BoardingsPage() {
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("todas");

  const rows = useMemo(
    () =>
      allTrips.filter((t) => {
        const q = search.trim().toLowerCase();
        return (
          (!q || `${t.number} ${t.destination} ${companyName(t.companyId)}`.toLowerCase().includes(q)) &&
          (company === "todas" || t.companyId === company)
        );
      }),
    [search, company],
  );

  const columns: Column<Trip>[] = [
    { key: "time", header: "Horário", render: (t) => <span className="tabular font-semibold">{t.scheduled}</span> },
    { key: "company", header: "Empresa", render: (t) => companyName(t.companyId) },
    { key: "dest", header: "Destino", render: (t) => t.destination },
    { key: "trip", header: "Viagem", render: (t) => <span className="tabular text-muted-foreground">{t.number}</span> },
    { key: "boardings", header: "Embarques", align: "right", render: (t) => <span className="tabular font-semibold">{t.boardings}</span> },
    { key: "source", header: "Fonte", render: () => <span className="text-muted-foreground">Sistema da empresa</span> },
    {
      key: "status",
      header: "Situação",
      render: (t) => (
        <StatusBadge tone={reconciliationTone[t.reconciliation].tone}>
          {reconciliationTone[t.reconciliation].label}
        </StatusBadge>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Embarques" subtitle="Consolidação dos embarques informados e registrados no terminal" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Embarques hoje" value={num(boardingStats.today)} icon={Users} />
        <StatCard label="Embarques semana" value={num(boardingStats.week)} icon={CalendarDays} tone="info" />
        <StatCard label="Embarques mês" value={num(boardingStats.month)} icon={CalendarRange} tone="neutral" />
      </div>

      <div className="mt-6">
        <FilterBar search={search} onSearch={setSearch} placeholder="Pesquisar viagem, empresa ou destino...">
          <Select value={company} onValueChange={setCompany}>
            <SelectTrigger className="h-9 w-[13rem]">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as empresas</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>

        <SectionCard bodyClassName="p-0">
          <DataTable columns={columns} rows={rows} />
        </SectionCard>
      </div>
    </>
  );
}
