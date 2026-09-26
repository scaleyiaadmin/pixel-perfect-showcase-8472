import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, Bus, Users } from "lucide-react";
import {
  DataTable,
  FilterBar,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  type Column,
} from "@/components/common";
import { companies, dashboardStats, num } from "@/data/mock";
import type { Company } from "@/types";

export const Route = createFileRoute("/_admin/empresas/")({
  head: () => ({
    meta: [
      { title: "Empresas de Transporte — SisRodov Manhuaçu" },
      {
        name: "description",
        content: "Empresas de transporte que operam no Terminal Rodoviário de Manhuaçu e seus indicadores.",
      },
      { property: "og:title", content: "Empresas de Transporte — SisRodov Manhuaçu" },
      { property: "og:description", content: "Empresas operadoras, linhas, viagens e embarques." },
    ],
  }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const rows = useMemo(
    () => companies.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase())),
    [search],
  );

  const columns: Column<Company>[] = [
    { key: "name", header: "Empresa", render: (c) => <span className="font-semibold">{c.name}</span> },
    { key: "cnpj", header: "CNPJ", render: (c) => <span className="tabular text-muted-foreground">{c.cnpj}</span> },
    { key: "lines", header: "Linhas", align: "right", render: (c) => <span className="tabular">{c.linesCount}</span> },
    { key: "trips", header: "Viagens hoje", align: "right", render: (c) => <span className="tabular">{c.tripsToday}</span> },
    { key: "boardings", header: "Embarques", align: "right", render: (c) => <span className="tabular">{num(c.boardingsToday)}</span> },
    {
      key: "status",
      header: "Status",
      render: (c) => <StatusBadge tone={c.active ? "success" : "neutral"}>{c.active ? "Ativa" : "Inativa"}</StatusBadge>,
    },
  ];

  return (
    <>
      <PageHeader title="Empresas de Transporte" subtitle="Empresas que operam no Terminal Rodoviário de Manhuaçu" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Empresas ativas" value={dashboardStats.activeCompanies} icon={Building2} />
        <StatCard label="Viagens hoje" value={dashboardStats.tripsToday} icon={Bus} tone="info" />
        <StatCard label="Embarques" value={num(dashboardStats.boardingsToday)} icon={Users} tone="success" />
      </div>

      <div className="mt-6">
        <FilterBar search={search} onSearch={setSearch} placeholder="Pesquisar empresa..." />
        <SectionCard bodyClassName="p-0">
          <DataTable
            columns={columns}
            rows={rows}
            onRowClick={(c) => navigate({ to: "/empresas/$companyId", params: { companyId: c.id } })}
          />
        </SectionCard>
      </div>
    </>
  );
}
